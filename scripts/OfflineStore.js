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
 * @param layersAddResult the layers-add-result. Example: map.on("layers-add-result", someFunction);
 * @type {*|{}}
 */
var OfflineStore = function(/* Map */ map) {

    this.backgroundTimerWorker = null;
    this.isTimer = null;
    this.layers = [];  //An array of all feature layers
    this.map = map;

    /**
     * Public ENUMs (Constants)
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
            VALIDATION_URL : "http://localhost/test/test.html", /* Change this to a remote server for testing! */
            TIMER_URL : "./scripts/Timer.js",                   /* For use within a child process only */
            STORAGE_KEY : "___EsriOfflineStore___",             /* Unique key for setting/retrieving values from localStorage */
            VALIDATION_TIMEOUT : 10 * 1000,                     /* HTTP timeout when trying to validate internet on/off */
            LOCAL_STORAGE_MAX_LIMIT : 4.75 /* MB */,            /* Most browsers offer default storage of ~5MB */
            TOKEN : "|||",                                      /* A unique token for tokenizing stringified localStorage values */
            REQUIRED_LIBS : [
                "./scripts/Hydrate.js",
                "./scripts/Poller.js"
            ]
        }

        return values;
    });

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
     */
    this.applyEdits = function(/* Graphic */ graphic,/* FeatureLayer */ layer, /* String */ enumValue){

        var internet = this._checkInternet();

        //TODO Need to add code to determine size of incoming graphic
        var mb = this.getlocalStorageUsed();
        console.log("getlocalStorageUsed = " + mb + " MBs");

        if(mb > this._localEnum().LOCAL_STORAGE_MAX_LIMIT /* MB */){
            alert("You are almost over the local storage limit. No more data can be added.")
            return;
        }

        if(internet === false){
            this._addToLocalStore(graphic,layer,enumValue);
            if(this.isTimer == null){
                this._startTimer(function(err){
                    alert("unable to start background timer. Offline edits won't work. " + err.stack);
                });
            }
        }
        else if(internet === null || typeof internet === "undefined"){
            console.log("applyEdits: possible error.");
        }
        else{
            this._layerEditManager(graphic,layer,enumValue,this.enum(),null,true,null);
        }
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
     * Delete all items stored by this library using it's unique key.
     * Does NOT delete anything else from localStorage.
     */
    this.deleteStore = function(){
        console.log("deleting localStore");
        localStorage.removeItem(this._localEnum().STORAGE_KEY);
    }

    /**
     * Determines total storage used for this domain.
     * @returns Number MB's
     */
    this.getlocalStorageUsed = function(){
        var mb = 0;

        //IE hack
        if(window.localStorage.hasOwnProperty("remainingspace")){
            //http://msdn.microsoft.com/en-us/library/ie/cc197016(v=vs.85).aspx
            mb = window.localStorage.remainingSpace/1024/1024;
        }
        else{
            for(var x in localStorage){
                //Uncomment out console.log to see *all* items in local storage
                //console.log(x+"="+((localStorage[x].length * 2)/1024/1024).toFixed(2)+" MB");
                mb += localStorage[x].length
            }
        }

        return Math.round(((mb * 2)/1024/1024) * 100)/100;
    }

    //////////////////////////
    ///
    /// PRIVATE methods
    ///
    //////////////////////////

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
                    if(mCallback != null && count != null) mCallback(count,deleteResult[0].success);
                },function(error){
                    console.log("_layer: " + error.stack); mCallback(count,false)}
                );
                break;
            case localEnum.ADD:
                layer.applyEdits([graphic],null,null,function(addResult,updateResult,deleteResult){
                    console.log("addResult ObjectId: " + addResult[0].objectId + ", Success: " + addResult[0].success);
                    if(mCallback != null && count != null) mCallback(count,addResult[0].success);
                },function(error){
                    console.log("_layer: " + error.stack); mCallback(count,false)}
                );
                break;
            case localEnum.UPDATE:
                layer.applyEdits(null,[graphic],null,function(addResult,updateResult,deleteResult){
                    console.log("updateResult ObjectId: " + updateResult[0].objectId + ", Success: " + updateResult[0].success);
                    if(mCallback != null && count != null) mCallback(count,updateResult[0].success);
                },function(error){
                    console.log("_layer: " + error.stack); mCallback(count,false)}
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

//        if(geom.hasOwnProperty("geometry")){
//            geom = geom.geometry;
//        }

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

        if(dupeFlag == false) this._setItemInLocalStore(localStore + geom);
    }

    this._addToLocalStore = function(/* Graphic */ graphic, /* FeatureLayer */ layer, /* String */ enumValue){
        var arr = this._getLocalStorage();
        var geom = this._serializeGraphic(graphic,layer,enumValue);

        //If localStorage does NOT exist
        if(arr === null){

            this._setItemInLocalStore(geom);
        }
        else{
            this._updateExistingLocalStore(geom);
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
                            var arr = this._getLocalStorage();
                            if(onlineFLAG == false){
                                onlineFLAG = true;
                            }
                            if(arr != null){
                                this._handleRestablishedInternet(function(){
                                    this._stopTimer();
                                    this.deleteStore();
                                }.bind(this));
                            }
                        }
                    }

                }.bind(this), false);
                this.backgroundTimerWorker.postMessage({start:true,interval:10000});
            }
            catch(err){
                callback(err);
            }
        }
    }


    this._stopTimer = function(){

        if(this.backgroundTimerWorker != null){
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

    this._handleRestablishedInternet = function(callback){
        var graphicsArr = this.getStore();

        if(graphicsArr != null && this.layers != null){

            var check = [];
            var errCnt = 0;
            for(var i in graphicsArr){
                var obj1 = graphicsArr[i];
                var layer = this._getGraphicsLayerById(obj1.layer);
                this._layerEditManager(obj1.graphic,layer,obj1.enumValue,this.enum(),i,function(/* Number */ num, /* boolean */ success){
                    check.push(num);

                    if(success == true && check.length == graphicsArr.length){
                        if(errCnt == 0){
                            callback();
                        }
                        else{
                            console.log("_handleRestablishedInternet: there were errors. LocalStore still available.");
                            this._stopTimer();
                        }
                    }
                    else if(success == false && check.length == graphicsArr.length){
                        console.log("_handleRestablishedInternet: error sending edit on " + graphicsArr[i].graphic.attributes);
                        this._stopTimer();
                    }
                    else{
                        errCnt++;
                        console.log("_handleRestablishedInternet: error sending edit on " + graphicsArr[i].graphic.attributes);
                    }
                }.bind(this));
            }
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

    this._getLocalStorage = function(){
        return localStorage.getItem(this._localEnum().STORAGE_KEY);
    }

    /**
     * Sets the localStorage
     * @param item
     * @returns {boolean} returns true if success, else false. Writes
     * error stack to console.
     */
    this._setItemInLocalStore = function(item){
        var success = false;

        try{
            localStorage.setItem(this._localEnum().STORAGE_KEY,item);
            success = true;
        }
        catch(err){
            console.log("_setItemInLocalStore(): " + err.stack);
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
     * @param Graphic
     * @returns {string}
     * @private
     */
    this._serializeGraphic = function(/* Graphic */ object, layer, enumValue){
        var json  = new this._jsonObject();
        json.layer = layer.layerId;
        json.enumValue = enumValue;
        json.geometry = JSON.stringify(object.geometry)

        if(object.hasOwnProperty("attributes")){
            if(object.attributes != null){
                var hydrate = new Hydrate();
                var q = hydrate.stringify(object.attributes);
                json.attributes = q;
            }
        }

        return JSON.stringify(json) + this._localEnum().TOKEN;
    }

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
     * Load scripts
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
                    this.layers.push(layer);
                }
            }
        }
        catch(err){
            console.log("_parseFeatureLayer: " + err.stack);
        }
    }

    /**
     * Initializes the OfflineStore library. Loads required scripts. Kicks off timer if
     * localStore is not empty.
     * @see Required script sare set in _localEnum.
     * @type {*}
     * @private
     */
    this._init = function(){
        this._loadScripts(this._localEnum().REQUIRED_LIBS,function(){
            console.log("OfflineStore is ready.")

            this._parseFeatureLayers(this.map);

            if(typeof Poller == "object"){
                var internet = this._checkInternet();
                var arr = this._getLocalStorage();

                if(this.isTimer != true && internet == false && arr != null){
                    this._startTimer(function(err){
                        alert("unable to start background timer. Offline edits won't work. " + err.stack);
                    });
                }
                else if(internet === null || typeof internet === "undefined"){
                    console.log("applyEdits: possible error.");
                }
//                else{
//                    var arr = this._getLocalStorage();
//                    if(arr != null){
//                        this._handleRestablishedInternet(function(){
//                            this._stopTimer();
//                            this.deleteStore();
//                        }.bind(this));
//                    }
//                }
            }

        }.bind(this));
    }.bind(this)()

};