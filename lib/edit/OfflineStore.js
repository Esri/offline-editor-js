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

var getScriptURL = (function() {
    var scripts = document.getElementsByTagName('script');
    var index = scripts.length - 1;
    var myScript = scripts[index];
    return function() { return myScript.src; };
})();

var OfflineStore = function(/* Map */ map) {

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
            /* Unique key for setting/retrieving values from localStorage */
            STORAGE_KEY : "___EsriOfflineStore___",
            /* Index for tracking each action (add, delete, update) in local store */
            INDEX_KEY : "___EsriOfflineIndex___",
            /* Most browsers offer default storage of ~5MB */
            LOCAL_STORAGE_MAX_LIMIT : 4.75 /* MB */,
            /* A unique token for tokenizing stringified localStorage values */
            TOKEN : "|||",
            WINDOW_ERROR_EVENT: "windowErrorEvent",
            EDIT_EVENT: "editEvent",
            EDIT_EVENT_SUCCESS: true,
            EDIT_EVENT_FAILED: false,
            EDIT_EVENT_DUPLICATE: "duplicateEditEvent",
            OFFLINE_EDIT_ATTEMPT: "OfflineEditAttempt", //exactly what is says!
            ONLINE_STATUS_EVENT: "OnlineStatusEvent",
            REQUIRED_LIBS : [
                "Hydrate.js",
                "OfflineUtils.js",
                "../../vendor/offline/offline.min.js"
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

    this._hydrate = null;
    this._reestablishedInternetListener = null;

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
        var internet = this.getInternet();
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

                if(typeof item !== "undefined" && item.length > 0 && item !== null && item != ""){
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

    /**
     * Call this to find out if app is online or offline
     * @returns {boolean}
     */
    this.getInternet = function(){
        if(Offline.state === 'up') {
            return true
        }
        else{
            return false;
        }
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
            this._sendEvent(true,this._localEnum().OFFLINE_EDIT_ATTEMPT);
            this._addToLocalStore(graphic,layer,enumValue,callback);
            this._startOfflineListener();
        }
        else{
            //No need for a callback because this is an online request and it's immediately
            //pushed to Feature Service. The only thing updated in the library is the Index.
            this._layerEditManager(graphic,layer,enumValue,this.enum(),0,callback);
        }
    }

    /**
     * Directly implements the applyEdits() method for ADDS, UPDATES and DELETES
     * @param graphic
     * @param layer
     * @param value
     * @param localEnum
     * @param count
     * @param mCallback
     * @private
     */
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
                    if(mCallback != null && count != null) {  console.log("id " + deleteResult[0].objectId)
                        mCallback(count,deleteResult[0].success,deleteResult[0].objectId,null);
                    }
                }.bind(this),
                    function(error){
                        console.log("_layer: " + error.stack); mCallback(count,false,null,error);
                        mCallback(count,deleteResult[0].success,deleteResult[0].objectId,false);
                    }.bind(this)
                );
                break;
            case localEnum.ADD:
                layer.applyEdits([graphic],null,null,function(addResult,updateResult,deleteResult){
                    console.log("addResult ObjectId: " + addResult[0].objectId + ", Success: " + addResult[0].success);
                    if(mCallback != null && count != null) {
                        mCallback(count,addResult[0].success,addResult[0].objectId,null);
                    }
                }.bind(this),
                    function(error){
                        console.log("_layer: " + error.stack); mCallback(count,false,null,error);
                        mCallback(count,deleteResult[0].success,deleteResult[0].objectId,false);
                    }.bind(this)
                );
                break;
            case localEnum.UPDATE:
                layer.applyEdits(null,[graphic],null,function(addResult,updateResult,deleteResult){
                    console.log("updateResult ObjectId: " + updateResult[0].objectId + ", Success: " + updateResult[0].success);
                    if(mCallback != null && count != null) {
                        mCallback(count,deleteResult[0].success,updateResult[0].objectId,null);
                    }
                }.bind(this),
                    function(error){
                        console.log("_layer: " + error.stack); mCallback(count,false,null,error)
                        mCallback(count,deleteResult[0].success,deleteResult[0].objectId,false);
                    }.bind(this)
                );
                break;
        }
    }

    /**
     * Takes a serialized geometry and adds it to localStorage
     * @param serializedGraphic
     * @private
     */
    this._updateExistingLocalStore = function(/* String */ serializedGraphic){

        var localStore = this._getLocalStorage();
        var split = localStore.split(this._localEnum().TOKEN);
console.log(localStore.toString());
        var dupeFlag = false;
        for(var property in split){
            var item = split[property];
            if(typeof item !== "undefined" && item.length > 0 && item !== null){
                var sub = serializedGraphic.substring(0,serializedGraphic.length - 3);

                //This is not the sturdiest way to verify if two geometries are equal
                if(sub === item){
                    console.log("updateExistingLocalStore: duplicate item skipped.");
                    this._sendEvent(true,"duplicateEditEvent");
                    dupeFlag = true;
                    break;
                }
            }
        }

        if(dupeFlag == false) {
            this._setItemInLocalStore(localStore + serializedGraphic);
            return true;
        }
        else{
            return false;
        }
    }

    this._addToLocalStore = function(/* Graphic */ graphic, /* FeatureLayer */ layer, /* String */ enumValue,callback){
        var arr = this._getLocalStorage();
        var serializedGraphic = this._serializeGraphic(graphic,layer,enumValue);

        var setItem = null;

        //If localStorage does NOT exist
        if(arr === null){
            setItem = this._setItemInLocalStore(serializedGraphic);
            callback(0,setItem,0);
        }
        else{
            setItem = this._updateExistingLocalStore(serializedGraphic);
            callback(0,setItem,0);
        }

        layer.add(graphic);
    }

    this._startOfflineListener = function(){    //NOT currently IE compatible
        if(this._reestablishedInternetListener == null){
            function onlineStatusHandler(evt){
                if(evt.detail.message == true){
                    console.log("_startOfflineListener - internet reestablished");
                    var arr = null;
                    try{var arr = this._getLocalStorage()}catch(err){console.log("onlineStatusHandler: " + err.toString())};
                    if(arr != null){
                        this._reestablishedInternetCallbackHandler();
                    }
                }
            }

            document.addEventListener("OnlineStatusEvent",onlineStatusHandler.bind(this),false);

            this._reestablishedInternetListener = 1;

            console.log("starting offline listener.");
        }
    }

    /**
     * Custom Event
     * @param msg
     * @param event
     * @private
     */
    this._sendEvent = function(msg,event){
        //this.preventDefault();

        if (typeof msg != "defined" && window.CustomEvent) {
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

    /**
     * Makes calls to _reestablishedInternet() and handles the callback properties
     * @private
     */
    this._reestablishedInternetCallbackHandler = function(){
        //callback (boolean,boolean,enum,graphicsLayerId,objectId)
        this._reestablishedInternet(function(/* boolean */ success, /* boolean */ done,enumString,graphicsLayerId,objectId,error){
            var obj = null;
            if(success == true){

                obj = new this._editResultObject(success,enumString,graphicsLayerId,objectId,error);

                this._deleteStore();
                this._sendEvent(obj,this._localEnum().EDIT_EVENT);
            }
            else{
                this._sendEvent(obj,this._localEnum().EDIT_EVENT);
            }
        }.bind(this));
    }

    /**
     * Creates a graphics array from localstorage and pushes all applicable edits
     * @param callback (boolean,enum,graphicsLayerId,objectId) or (false,null,null,null)
     * if this.getStore() returns null
     * @private
     */
    this._reestablishedInternet = function(callback){
        var graphicsArr = this.getStore();

        if(graphicsArr != null && this.layers != null){

            var check = [];
            var errCnt = 0;
            var length = graphicsArr.length;
            for(var i = 0; i < length; i++){
                var obj1 = graphicsArr[i];
                var layer = this._getGraphicsLayerById(obj1.layer);
                this._layerEditManager(obj1.graphic,layer,obj1.enumValue,this.enum(),i,function(/* Number */ num, /* boolean */ success, /* String */ id,error){
                    check.push(num);

                    if(success == true && check.length == graphicsArr.length){
                        if(errCnt == 0){
                            this._setItemLocalStoreIndex(obj1.layer,id,obj1.enumValue,true);
                            callback(true,true,obj1.enumValue,obj1.layer,id);
                        }
                        else{ //this could cause a bug since it doesn't set item in local store. Not verified!
                            console.log("_reestablishedInternet: there were errors. LocalStore still available.");
                            callback(false,true,obj1.enumValue,obj1.layer,id);
                        }
                    }
                    //Don't return anything yet
                    else if(success == true && check.length < graphicsArr.length){
                        this._setItemLocalStoreIndex(obj1.layer,id,obj1.enumValue,true);
                    }
                    else if(success == false && check.length == graphicsArr.length){
                        this._setItemLocalStoreIndex(obj1.layer,id,obj1.enumValue,false);
                        console.log("_reestablishedInternet: error sending edit on " + id);
                        callback(false,true,obj1.enumValue,obj1.layer,id,error);
                    }
                    //Don't return anything yet
                    else if(success == false && check.length < graphicsArr.length){
                        this._setItemLocalStoreIndex(obj1.layer,id,obj1.enumValue,false,error);
                        errCnt++;
                        console.log("_reestablishedInternet: error sending edit on " + id);
                    }
                }.bind(this));
            }
        }
        else{
            callback(false,true,null,null,null);
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
    this._isItemLocalStoreIndex = function(/* String */ objectId){
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
     * Retrieves an item from index
     * @param objectId
     * @returns {Object}
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
                        return item;
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
                try{
                    var q = this._hydrate.stringify(graphic.attributes);
                }
                catch(err){
                    console.log("_serializeGraphic: " + err.toString());
                }
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

    /**
     * Model for storing results when attempting to apply edits
     * after internet has been reestablished
     * @private
     */
    this._editResultObject = function(/* boolean */ success, /* String */ enumString,
        /* int */ graphicsLayerId, /* int */ objectId,error){
        this.success = success;
        this.enumString = enumString;
        this.graphicsLayerId = graphicsLayerId;
        this.objectId = objectId;
        this.error = error;
    }

    //////////////////////////
    ///
    /// INITIALISE
    ///
    //////////////////////////

    /**
     * Auto-detects online/offline conditions.
     * Listen for ONLINE_STATUS_EVENT = true/false.
     * Dependant on Offline.js
     * @private
     */
    this._offlineMonitor = function(){
        Offline.options = { checkOnLoad: true, reconnect: true, requests: false };
        Offline.check();
        Offline.on('up down', function(){
            if(Offline.state === 'up'){
                console.log("internet is up.");
                this._sendEvent(true,this._localEnum().ONLINE_STATUS_EVENT);
            }
            else{
                console.log("internet is down.");
                this._sendEvent(false,this._localEnum().ONLINE_STATUS_EVENT);
            }
        }.bind(this));
    }

    /**
     * Load src
     * TO-DO: Needs to be made AMD compliant!
     * @param urlArray
     * @param callback
     * @private
     */
    this._loadScripts = function(/* Array */ urlArray, callback)
    {
        var thisScriptUrl = getScriptURL();
        var parse_url = /^(?:([A-Za-z]+):)?(\/{0,3})([0-9.\-A-Za-z]+)(?::(\d+))?(?:\/([^?#]*))?(?:\?([^#]*))?(?:#(.*))?$/;
        var parts = parse_url.exec( thisScriptUrl );
        var baseUrl = '/' + parts[5].substring(0,parts[5].lastIndexOf("/"));

        count = 0;
        for(var i in urlArray){
            try{
                var head = document.getElementsByTagName('head')[0];
                var script = document.createElement('script');
                script.type = 'text/javascript';
                script.src = baseUrl + '/' + urlArray[i];
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
     * Initializes the OfflineStore library. Loads required src.
     * @see Required script sare set in _localEnum.
     * @type {*}
     * @private
     */
    this._init = function(){
        this._loadScripts(this._localEnum().REQUIRED_LIBS,function(){

            this.utils = new OfflineUtils();
            this._parseFeatureLayers(this.map);
            this._hydrate = new Hydrate();

            if(typeof Offline == "object"){
                this._offlineMonitor();
                console.log("OfflineStore is ready.")

                var arr = this._getLocalStorage();
                if(arr != null && Offline.state === 'up'){
                    this._reestablishedInternetCallbackHandler();
                }
                else if(arr != null && Offline.state !== 'up'){
                    this._startOfflineListener();
                }
            }

        }.bind(this));
    }.bind(this)()

    /**
     * Allow application builders to detect potential fatal events that
     * could affect data integrity.
     * TO-DO some errors like those in callbacks may not be trapped by this!
     * @param msg
     * @param url
     * @param line
     * @returns {boolean}
     */
    window.onerror = function (msg,url,line){
        console.log(msg + ", " + url + ":" + line);
        this._sendEvent(msg,this._localEnum().WINDOW_ERROR_EVENT);
        return true;
    }
};