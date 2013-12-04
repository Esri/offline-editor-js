/**
 * Offline library for storing graphics related to an Edit Task.
 * Currently works with Points, Polylines and Polygons. Also provides online/offline validation.
 *
 * Automatically attempts to reconnect. As soon as a connection is made updates are submitted
 * and the localStorage is deleted upon successful update.
 *
 * NOTE: Hooks for listeners that updates were successful/unsuccessful should be added in
 * _handleRestablishedInternet()
 *
 * <b>Dependencies:</b> ArcGIS JavaScript API and Hydrate.js: https://github.com/nanodeath/HydrateJS
 * <b>Limitations:</b> does not currently store infoTemplate and symbol properties
 * <b>More info:</b> http://www.w3.org/TR/webstorage/
 * @version 0.1
 * @author Andy Gup (@agup)
 * @param map
 * @type {*|{}}
 */
var OfflineStore = function(/* Map */ map) {

    this.backgroundTimerWorker = null;
    this.isTimer = null;
    this.layers = [];  //An array of all feature layers
    this.utils = null;
    this.map = map;
    if(map != null) {
        this.map.offlineStore = this
    }
    else{
        console.log("map is null")
        throw("map is null");
    }

    /**
     * Public ENUMs. Immutable reference values.
     * @type {Object}
     * @returns {String}
     * @private
     */
    this.enum = (function(){
        var values = {
            ADD : "add",
            UPDATE : "update",
            DELETE : "delete"
        }

        return values;
    });

    /**
     * Private Local ENUMs (Constants)
     * Contains required configuration info.
     * @type {Object}
     * @returns {*}
     * @private
     */
    this._localEnum = (function(){
        var values = {
            /* Change this to a remote server for testing! */
            VALIDATION_URL : "http://localhost/offline/test.html",
            /* For use within a child process only */
            TIMER_URL : "./src/Timer.js",
            /* Unique key for setting/retrieving values from localStorage */
            STORAGE_KEY : "___EsriOfflineStore___",
            /* Index for tracking each action (add, delete, update) in local store */
            INDEX_KEY : "___EsriOfflineIndex___",
            /* HTTP timeout when trying to validate internet on/off */
            VALIDATION_TIMEOUT : 10 * 1000,
            /* Most browsers offer default storage of ~5MB */
            LOCAL_STORAGE_MAX_LIMIT : 4.75 /* MB */,
            /* A unique token for tokenizing stringified localStorage values */
            TOKEN : "|||",
            TIMER_TICK_INTERVAL : 10 * 1000 /* ms */,
            WINDOW_ERROR_EVENT: "windowErrorEvent",
            EDIT_EVENT: "editEvent",
            EDIT_EVENT_SUCCESS: true,
            EDIT_EVENT_FAILED: false,
            REQUIRED_LIBS : [
                "./src/Hydrate.js",
                "./src/Poller.js",
                "./src/OfflineUtils.js"
            ]
        }

        return values;
    });

    /**
     * Model for handle vertices editing
     * @param graphic
     * @param layer
     */
    this.verticesObject = function(/* Graphic */ graphic, /* FeatureLayer */ layer){
        this.graphic = graphic;
        this.layer = layer;
    }

    /**
     * Boolean hit test as to whether or not an internet connection exists.
     * Can also be used with unit tests as an override.
     * For unit testing set to true.
     * @type {boolean}
     * @private
     */
    this.___internet = true;
    this._hydrate = null;

    //////////////////////////
    ///
    /// PUBLIC methods
    ///
    //////////////////////////

    /**
     * Conditionally attempts to send an edit request to ArcGIS Server.
     * @param graphic Required
     * @param layer Required
     * @param enumValue Required
     * @param callback Recommended. Returns true if offline condition detected otherwise returns false.
     */
    this.applyEdits = function(/* Graphic */ graphic,/* FeatureLayer */ layer, /* String */ enumValue, callback){
        var internet = this._checkInternet();
        this._applyEdits(internet,graphic,layer,enumValue, callback);
        //this._sendEvent("Halllooo","test");
    }

    /**
     * Public method for retrieving all items in the localStore.
     * @returns {Array} Graphics
     */
    this.getStore = function(){
        var graphicsArr = null;
        var data = localStorage.getItem(this._localEnum().STORAGE_KEY);

        if(data != null){
            graphicsArr = [];
            var split = data.split(this._localEnum().TOKEN);
            for(var property in split){

                var item = split[property];

                if(typeof item !== "undefined" && item.length > 0 && item !== null){
                    var graphic = this._deserializeGraphic(item);
                    graphicsArr.push( graphic );
                }
            }
        }

        return graphicsArr;
    }

    /**
     * Provides a list of all localStorage items that have been either
     * added, deleted or updated.
     * @returns {Array}
     */
    this.getLocalStoreIndex = function(){
        var localStore = localStorage.getItem(this._localEnum().INDEX_KEY);
        return localStore != null ? localStore.split(this._localEnum().TOKEN) : null;
    }

    /**
     * Determines total storage used for this domain.
     * NOTE: The index does take up storage space. Even if the offlineStore
     * is deleted, you will still see some space taken up by the index.
     * @returns Number MB's
     */
    this.getlocalStorageUsed = function(){

        //IE hack
        if(window.localStorage.hasOwnProperty("remainingspace")){
            //http://msdn.microsoft.com/en-us/library/ie/cc197016(v=vs.85).aspx
            return (window.localStorage.remainingSpace/1024/1024).round(4);
        }
        else{
            var mb = 0;
            for(var x in localStorage){
                //Uncomment out console.log to see *all* items in local storage
                //console.log(x+"="+((localStorage[x].length * 2)/1024/1024).toFixed(4)+" MB");
                mb += localStorage[x].length
            }

            //return Math.round(((mb * 2)/1024/1024) * 100)/100;
            return ((mb *2)/1024/1024).round(4);
        }
    }

    /**
     * A Global prototype that provides rounding capabilities.
     * TODO reevaluate if this should be local in scope or global.
     * @param places
     * @returns {number}
     */
    Number.prototype.round = function(places){
        places = Math.pow(10, places);
        return Math.round(this * places)/places;
    }

    //////////////////////////
    ///
    /// PRIVATE methods
    ///
    //////////////////////////

    /**
     * Internal method for routing an edit requests.
     * IMPORTANT: Graphic must have an ObjectId. Using the edittoolbar will automatically create
     * a Graphic with that property. Just be aware if you are manually creating graphics.
     * @param internet
     * @param graphic
     * @param layer
     * @param enumValue
     * @param callback  Returns true if offline condition detected otherwise returns false.
     * Format: {count, success,  id}
     * @private
     */
    this._applyEdits = function(/* Boolean */ internet, /* Graphic */ graphic,/* FeatureLayer */ layer, /* String */ enumValue, callback){

        var grSize = this.utils.apprxGraphicSize(graphic);
        var mb = this.getlocalStorageUsed();
        console.log("getlocalStorageUsed = " + mb + " MBs");

        if(grSize + mb > this._localEnum().LOCAL_STORAGE_MAX_LIMIT /* MB */){
            alert("The graphic you are editing is too big (" + grSize.toFixed(4) +  " MBs) for the remaining storage. Please try again.")
            callback(0,false,0);
            return;
        }
        else if(mb > this._localEnum().LOCAL_STORAGE_MAX_LIMIT /* MB */){
            alert("You are almost over the local storage limit. No more data can be added.")
            callback(0,false,0);
            return;
        }

        if(internet === false){
            this._addToLocalStore(graphic,layer,enumValue,callback);
            if(this.isTimer == null){
                this._startTimer(function(err){
                    throw ("unable to start background timer. Offline edits won't work. " + err.stack);
                });
            }
        }
        else if(internet == null || typeof internet == "undefined"){
            console.log("applyEdits: possible error.");
            callback(0,false,0);
        }
        else{
            //No need for a callback because this is an online request and it's immediately
            //pushed to Feature Service. The only thing updated in the library is the Index.
            this._layerEditManager(graphic,layer,enumValue,this.enum(),0,callback);
        }
    }

    this._layerEditManager = function(
        /* Graphic */ graphic,
        /* FeatureLayer */ layer,
        /* String */ value,
        /* Object */ localEnum,
        /* Number */ count,
        /* Object */ mCallback){

        switch(value){
            case localEnum.DELETE:
                layer.applyEdits(null,null,[graphic],function(addResult,updateResult,deleteResult){
                    console.log("deleteResult ObjectId: " + deleteResult[0].objectId + ", Success: " + deleteResult[0].success);
                    if(mCallback != null && count != null) {
                        mCallback(count,deleteResult[0].success,deleteResult[0].objectId);
                    }
                    else{
                        this._setItemLocalStoreIndex(layer.layerId, deleteResult[0].objectId,value,true);
                    }

                }.bind(this),
                    function(error){
                        console.log("_layer: " + error.stack); mCallback(count,false);
                        this._setItemLocalStoreIndex(layer.layerId, deleteResult[0].objectId,value,false);
                    }.bind(this)
                );
                break;
            case localEnum.ADD:
                layer.applyEdits([graphic],null,null,function(addResult,updateResult,deleteResult){
                    console.log("addResult ObjectId: " + addResult[0].objectId + ", Success: " + addResult[0].success);
                    if(mCallback != null && count != null) {
                        mCallback(count,addResult[0].success,addResult[0].objectId);
                    }
                    else{
                        this._setItemLocalStoreIndex(layer.layerId, addResult[0].objectId,value,true);
                    }
                }.bind(this),
                    function(error){
                        console.log("_layer: " + error.stack); mCallback(count,false);
                        this._setItemLocalStoreIndex(layer.layerId, addResult[0].objectId,value,false);
                    }.bind(this)
                );
                break;
            case localEnum.UPDATE:
                layer.applyEdits(null,[graphic],null,function(addResult,updateResult,deleteResult){
                    console.log("updateResult ObjectId: " + updateResult[0].objectId + ", Success: " + updateResult[0].success);
                    if(mCallback != null && count != null) {
                        mCallback(count,deleteResult[0].success,updateResult[0].objectId);
                    }
                    else{
                        this._setItemLocalStoreIndex(layer.layerId, updateResult[0].objectId,value,true);
                    }
                }.bind(this),
                    function(error){
                        console.log("_layer: " + error.stack); mCallback(count,false)
                        this._setItemLocalStoreIndex(layer.layerId, updateResult[0].objectId,value,false);
                    }.bind(this)
                );
                break;
        }
    }

    /**
     * Takes a serialized geometry and adds it to localStorage
     * @param geom
     * @private
     */
    this._updateExistingLocalStore = function(/* Geometry */ geom){

        var localStore = this._getLocalStorage();
        var split = localStore.split(this._localEnum().TOKEN);
console.log(localStore.toString());
        var dupeFlag = false;
        for(var property in split){
            var item = split[property];
            if(typeof item !== "undefined" && item.length > 0 && item !== null){
                var sub = geom.substring(0,geom.length - 3);

                //This is not the sturdiest way to verify if two geometries are equal
                if(sub === item){
                    console.log("updateExistingLocalStore: duplicate item skipped.");
                    dupeFlag = true;
                    break;
                }
            }
        }

        if(dupeFlag == false) {
            this._setItemInLocalStore(localStore + geom);
            return true;
        }
        else{
            return false;
        }
    }

    this._addToLocalStore = function(/* Graphic */ graphic, /* FeatureLayer */ layer, /* String */ enumValue,callback){
        var arr = this._getLocalStorage();
        var geom = this._serializeGraphic(graphic,layer,enumValue);

        var setItem = null;

        //If localStorage does NOT exist
        if(arr === null){
            setItem = this._setItemInLocalStore(geom);
            callback(0,setItem,0);
        }
        else{
            setItem = this._updateExistingLocalStore(geom);
            callback(0,setItem,0);
        }

        layer.add(graphic);
    }

    this._startTimer = function(callback){

        var onlineFLAG = false;

        if(this.backgroundTimerWorker == null && this.isTimer == null){

            console.log("Starting timer...");

            try{
                this.backgroundTimerWorker = new Worker(this._localEnum().TIMER_URL);
                this.backgroundTimerWorker.addEventListener('message', function(msg) {

                    if(msg.data.hasOwnProperty("msg")){
                        console.log("_startTimer: " + msg.data.msg)
                    }
                    if(msg.data.hasOwnProperty("alive")){
                        console.log("Timer heartbeat.");
                        this.isTimer = msg.data.alive;
                    }
                    if(msg.data.hasOwnProperty("err")){
                        console.log("_startTimer error: " + msg.data.err);
                    }

                    //Handle reestablishing an internet connection
                    if(msg.data.hasOwnProperty("net")){
                        if(msg.data.net == false){
                            console.log("Internet status: " + msg.data.net);
                            if(onlineFLAG != false)onlineFLAG = false;
                        }
                        else if(msg.data.net == true){
                            if(this.___internet == true){
                                var internet = this._checkInternet();
                            }
                            var arr = this._getLocalStorage();
                            if(arr != null && internet == true){

                                if(onlineFLAG == false){
                                    onlineFLAG = true;
                                }

                                this._handleRestablishedInternet(function(evt){
                                    if(evt == true){
                                        this._stopTimer();
                                        this._deleteStore();
                                        this._sendEvent(true,this._localEnum().EDIT_EVENT);
                                    }
                                    else{
                                        this._sendEvent(false,this._localEnum().EDIT_EVENT);
                                    }
                                }.bind(this));
                            }
                        }
                    }

                }.bind(this), false);
                this.backgroundTimerWorker.postMessage({start:true,interval:this._localEnum().TIMER_TICK_INTERVAL});
            }
            catch(err){
                callback(err);
            }
        }
    }


    this._stopTimer = function(){

        if(this.backgroundTimerWorker != null && this.isTimer != null){
            this.backgroundTimerWorker.terminate();
            this.backgroundTimerWorker.postMessage({kill:true});
            this.backgroundTimerWorker = null;
            this.isTimer = null;
            console.log("Timer stopped...")
        }
        else{
            console.log("Timer may already be stopped...");
        }
    }

    this._sendEvent = function(msg,event){
        //this.preventDefault();

        if (msg && window.CustomEvent) {
            var event = new CustomEvent(event, {
                detail: {
                    message: msg,
                    time: new Date()
                },
                bubbles: true,
                cancelable: true
            });

            document.dispatchEvent(event);
        }
    }

    this._handleRestablishedInternet = function(callback){
        var graphicsArr = this.getStore();

        if(graphicsArr != null && this.layers != null){

            var check = [];
            var errCnt = 0;
            for(var i in graphicsArr){
                var obj1 = graphicsArr[i];
                var layer = this._getGraphicsLayerById(obj1.layer);
                this._layerEditManager(obj1.graphic,layer,obj1.enumValue,this.enum(),i,function(/* Number */ num, /* boolean */ success, /* String */ id){
                    check.push(num);

                    var objectId = obj1.graphic.attributes.objectid;

                    if(success == true && check.length == graphicsArr.length){
                        if(errCnt == 0){
                            this._setItemLocalStoreIndex(obj1.layer,objectId,obj1.enumValue,true);
                            callback(true);
                        }
                        else{
                            console.log("_handleRestablishedInternet: there were errors. LocalStore still available.");
                            this._stopTimer();
                            callback(false);
                        }
                    }
                    else if(success == true && check.length < graphicsArr.length){
                        this._setItemLocalStoreIndex(obj1.layer,objectId,obj1.enumValue,true);
                    }
                    else if(success == false && check.length == graphicsArr.length){
                        this._setItemLocalStoreIndex(obj1.layer,objectId,obj1.enumValue,false);
                        console.log("_handleRestablishedInternet: error sending edit on " + objectId);
                        this._stopTimer();
                        callback(false);
                    }
                    else if(success == false && check.length < graphicsArr.length){
                        this._setItemLocalStoreIndex(obj1.layer,objectId,obj1.enumValue,false);
                        errCnt++;
                        console.log("_handleRestablishedInternet: error sending edit on " + objectId);
                    }
                }.bind(this));
            }
        }
        else{
            callback(false);
        }
    }

    this._getGraphicsLayerById = function(/* String */ id){
        for(var layer in this.layers)
        {
            if(id == this.layers[layer].layerId){
                return this.layers[layer];
                break;
            }
        }
    }

    /**
     * Delete all items stored by this library using its unique key.
     * Does NOT delete anything else from localStorage.
     */
    this._deleteStore = function(){
        console.log("deleting localStore");
        try{
            localStorage.removeItem(this._localEnum().STORAGE_KEY);
        }
        catch(err){
            return err.stack;
        }

        return true;
    }

    /**
     * Returns the raw local storage object.
     * @returns {*}
     * @private
     */
    this._getLocalStorage = function(){
        return localStorage.getItem(this._localEnum().STORAGE_KEY);
    }

    /**
     * Sets the localStorage
     * @param geometry
     * @returns {boolean} returns true if success, else false. Writes
     * error stack to console.
     */
    this._setItemInLocalStore = function(/* Geometry */ geometry){
        var success = false;

        try{
            localStorage.setItem(this._localEnum().STORAGE_KEY,geometry);
            success = true;
        }
        catch(err){
            console.log("_setItemInLocalStore(): " + err.stack);
            success = false;
        }

        return success;

    }

    this._deleteLocalStoreIndex = function(){
        console.log("deleting localStoreIndex");
        try{
            localStorage.removeItem(this._localEnum().INDEX_KEY);
        }
        catch(err){
            return err.stack;
        }

        return true;
    }

    /**
     * Validates if an item has been deleted.
     * @param objectId
     * @returns {boolean}
     * @private
     */
    this._getItemLocalStoreIndex = function(/* String */ objectId){
        var localStore = localStorage.getItem(this._localEnum().INDEX_KEY);
        if(localStore != null){
            var split = localStore.split(this._localEnum().TOKEN);
            for(var property in split){
                var item = JSON.parse(split[property]);
                if(typeof item !== "undefined" || item.length > 0 || item != null){
                    if(item.hasOwnProperty("id") && item.id == objectId){
                        return true;
                    }
                }
            }
        }

        return false;
    }

    /**
     * Add item to index to track online transactions that were
     * either successful or unsuccessful.
     * @param objectId
     * @param type enum
     * @param success
     * @returns {boolean}
     * @private
     */
    this._setItemLocalStoreIndex = function(/* String */ layerId, /* String */ objectId, /* String */ type, /* boolean */ success){
        var index = new this._indexObject(layerId,objectId,type,success) ;
        var mIndex = JSON.stringify(index);

        var localStore = this.getLocalStoreIndex();

        try{
            if(localStore == null || typeof localStore == "undefined"){
                localStorage.setItem(this._localEnum().INDEX_KEY,mIndex + this._localEnum().TOKEN);
            }
            else{
                localStorage.setItem(this._localEnum().INDEX_KEY,localStore + mIndex + this._localEnum().TOKEN);
            }

            success = true;
        }
        catch(err){
            console.log("_setItemLocalStoreIndex(): " + err.stack);
            success = false;
        }

        return success;

    }

    this._checkInternet = function(){
        var result = null;

        var poller = Poller.httpGet(
            this._localEnum().VALIDATION_URL,
            this._localEnum().VALIDATION_TIMEOUT,
            function(msg){
                result = msg;
            }
        );

        return result;
    }

    this._deserializeGraphic = function(/* Graphic */ item){

        var jsonItem = JSON.parse(item);
        var geometry = JSON.parse(jsonItem.geometry);
        var attributes = JSON.parse(jsonItem.attributes);
        var enumValue = jsonItem.enumValue;
        var layer = JSON.parse(jsonItem.layer);
        var finalGeom = null;

        switch(geometry.type){
            case "polyline":
                finalGeom = new esri.geometry.Polyline(new esri.SpatialReference(geometry.spatialReference.wkid));
                for(var path in geometry.paths){
                    finalGeom.addPath(geometry.paths[path]);
                }
                break
            case "point":
                finalGeom = new esri.geometry.Point(geometry.x,geometry.y,new esri.SpatialReference(geometry.spatialReference.wkid));
                break;
            case "polygon":
                finalGeom = new esri.geometry.Polygon(new esri.SpatialReference(geometry.spatialReference.wkid));
                for(var ring in geometry.rings){
                    finalGeom.addRing(geometry.rings[ring]);
                }
                break;
        }

        var graphic = new esri.Graphic(finalGeom, null, attributes, null);

        return {"graphic":graphic,"layer":layer,"enumValue":enumValue};
    }

    /**
     * Rebuilds Geometry in a way that can be serialized/deserialized
     * @param graphic
     * @param layer
     * @param enumValue
     * @returns {string}
     * @private
     */
    this._serializeGraphic = function(/* Graphic */ graphic, layer, enumValue){
        var json  = new this._jsonObject();
        json.layer = layer.layerId;
        json.enumValue = enumValue;
        json.geometry = JSON.stringify(graphic.geometry)

        if(graphic.hasOwnProperty("attributes")){
            if(graphic.attributes != null){
                var q = this._hydrate.stringify(graphic.attributes);
                json.attributes = q;
            }
        }

        return JSON.stringify(json) + this._localEnum().TOKEN;
    }

    //////////////////////////
    ///
    /// INTERNAL Models
    ///
    //////////////////////////

    /**
     * Model for storing serialized graphics
     * @private
     */
    this._jsonObject = function(){
        this.layer = null;
        this.enumValue = null;
        this.geometry = null;
        this.attributes = null;
    }

    /**
     * Model for storing serialized index info.
     * @private
     */
    this._indexObject = function(/* String */ layerId, /* String */ id, /* String */ type, /* boolean */ success){
        this.id = id;
        this.layerId = layerId;
        this.type = type;
        this.success = success;
    }

    //////////////////////////
    ///
    /// INITIALISE
    ///
    //////////////////////////

    /**
     * Load src
     * TO-DO: Needs to be made AMD compliant!
     * @param urlArray
     * @param callback
     * @private
     */
    this._loadScripts = function(/* Array */ urlArray, callback)
    {
        count = 0;
        for(var i in urlArray){
            try{
                var head = document.getElementsByTagName('head')[0];
                var script = document.createElement('script');
                script.type = 'text/javascript';
                script.src = urlArray[i];
                script.onreadystatechange = function(){
                    count++;
                    console.log("Script loaded. " + this.src);
                    if(count == urlArray.length) callback();
                };
                script.onload = function(){
                    count++;
                    console.log("Script loaded. " + this.src);
                    if(count == urlArray.length) callback();
                };
                head.appendChild(script);
            }
            catch(err){
                console.log("_loadScripts: " + err.stack);
            }
        }
    }

    this._parseFeatureLayers = function(/* Event */ map){

        var layerIds = map.graphicsLayerIds;

        try{
            for (var i in layerIds){
                var layer = map.getLayer(layerIds[i]);

                if(layer.hasOwnProperty("type") && layer.type.toLowerCase() == "feature layer"){
                    if(layer.isEditable() == true){
                        this.layers.push(layer);
                    }
                }
                else{
                    throw ("Layer not editable: " + layer.url );
                }
            }
        }
        catch(err){
            console.log("_parseFeatureLayer: " + err.stack);
        }
    }

    /**
     * Initializes the OfflineStore library. Loads required src. Kicks off timer if
     * localStore is not empty.
     * @see Required script sare set in _localEnum.
     * @type {*}
     * @private
     */
    this._init = function(){
        this._loadScripts(this._localEnum().REQUIRED_LIBS,function(){
            console.log("OfflineStore is ready.")

            this.utils = new OfflineUtils();
            this._parseFeatureLayers(this.map);
            this._hydrate = new Hydrate();

            if(typeof Poller == "object"){
                var internet = this._checkInternet();
                var arr = this._getLocalStorage();

                if(this.isTimer != true && internet == false && arr != null){
                    this._startTimer(function(err){
                        throw ("unable to start background timer. Offline edits won't work. " + err.stack);
                    });
                }
                else if(internet == null || typeof internet == "undefined"){
                    console.log("applyEdits: possible error.");
                }
                else{
                    var arr = this._getLocalStorage();
                    if(arr != null){
                        this._handleRestablishedInternet(function(evt){
                            if(evt == true){
                                this._stopTimer();
                                this._deleteStore();
                                this._sendEvent(true,this._localEnum().EDIT_EVENT);
                            }
                            else{
                                this._sendEvent(false,this._localEnum().EDIT_EVENT);
                            }
                        }.bind(this));
                    }
                }
            }

        }.bind(this));
    }.bind(this)()

    /**
     * Attempt to stop timer and reduce chances of corrupting or duplicating data.
     * TO-DO some errors like those in callbacks may not be trapped by this!
     * @param msg
     * @param url
     * @param line
     * @returns {boolean}
     */
    window.onerror = function (msg,url,line){
        console.log(msg + ", " + url + ":" + line);
        this.map.offlineStore._stopTimer();
        this._sendEvent(msg,this._localEnum().WINDOW_ERROR_EVENT);
        return true;
    }
};