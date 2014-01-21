"use stict"

/**
 * Offline library for storing graphics related to an Edit Task.
 * Currently works with Points, Polylines and Polygons. Also provides automatic
 * online/offline validation.
 *
 * Automatically attempts to reconnect. As soon as a connection is made updates are submitted
 * and the localStorage is deleted upon successful update.
 *
 * NOTE: Hooks for listeners that updates were successful/unsuccessful should be added in
 * _handleRestablishedInternet()
 *
 * NOTE: Currently designed to work with feature services that have an ObjectId field
 *
 * <b>Dependencies:</b> ArcGIS JavaScript API
 * <b>Limitations:</b> does not currently store infoTemplate and symbol properties
 * <b>More info:</b> http://www.w3.org/TR/webstorage/
 * @version 0.1
 * @author Andy Gup (@agup)
 * @param map
 * @type {*|{}}
 */

define(["vendor/offline/offline.min", "edit/OfflineUtils"], function(offline, OfflineUtils)
{
    return function OfflineStore(/* Map */ map) {
        this.layers = []; //An array of all feature layers
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
                /**
                 * Tracks pending changes that have not been submitted to server and therefore do not have a UID yet
                 */
                STORAGE_KEY : "___EsriOfflineStore___",
                /**
                 * Index for tracking each action (add, delete, update) in local store after it has been completed
                 */
                INDEX_KEY : "___EsriOfflineIndex___",
                /**
                 * Most browsers offer default storage of ~5MB. This gives you the option to set a threshold.
                 */
                LOCAL_STORAGE_MAX_LIMIT : 4.75 /* MB */,
                /* A unique token for tokenizing stringified localStorage values */
                TOKEN : "|||",
                EDIT_EVENT_DUPLICATE: "duplicateEditEvent",
                INTERNET_STATUS_EVENT: "internetStatusChangeEvent",
                DELETE_ITEM_EVENT: "deleteItemFromTempStoreEvent",
                INDEX_UPDATE_EVENT: "indexUpdateEvent",
                EDIT_COMPLETE_EVENT: "editCompleteEvent",
                REQUIRED_LIBS : [
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

        this._reestablishedInternetListener = null;
        this._finalArr = null;

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
         * @param callback Recommended.
         */
        this.applyEdits = function(/* Graphic */ graphic,/* FeatureLayer */ layer, /* String */ enumValue, callback){
            var internet = this.getInternet();
            this._applyEdits(internet,graphic,layer,enumValue, callback);
        }

        /**
         * Public method for retrieving all items in the temporary localStore.
         * This request does not return the index information. For that use getLocalStoreIndex().
         * @returns {Array} Graphics
         */
        this.getStore = function(){
            var graphicsArr = null;
            var data = localStorage.getItem(this._localEnum().STORAGE_KEY);
            if(data != null){
                graphicsArr = [];
                var split = data.split(this._localEnum().TOKEN);
                for(var i=0;i<split.length; i++){
                    var item = split[i];
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
                for(var key in localStorage){
                    //Uncomment out console.log to see *all* items in local storage
                    //console.log(x+"="+((localStorage[x].length * 2)/1024/1024).toFixed(4)+" MB");
                    mb += localStorage.getItem(key).length
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

        this.getGraphicsLayerById = function(/* String */ id){
            for(var i=0; i<this.layers.length; i++)
            {
                if(id == this.layers[i].layerId){
                    return this.layers[i];
                    break;
                }
            }
            console.log("layer",id,"not found");
            return null;
        }

        //////////////////////////
        ///
        /// PRIVATE methods
        ///
        //////////////////////////

        /**
         * Internal method for routing an edit requests. Offline edits are managed by size to maintain
         * as much consistency as possible across all browsers.
         * IMPORTANT: Graphic must have an ObjectId. You will not know the objects unique
         * id until after it has been committed to the feature service.
         * @param internet
         * @param graphic
         * @param layer
         * @param enumValue
         * @param callback Returns true if offline condition detected otherwise returns false.
         * Format: {count, success, id}
         * @private
         */
        this._applyEdits = function(/* Boolean */ internet, /* Graphic */ graphic,/* FeatureLayer */ layer, /* String */ enumValue, callback){
            var grSize = this.utils.apprxGraphicSize(graphic);
            var mb = this.getlocalStorageUsed();
            console.log("getlocalStorageUsed = " + mb + " MBs");
            if(grSize + mb > this._localEnum().LOCAL_STORAGE_MAX_LIMIT /* MB */){
                alert("The graphic you are editing is too big (" + grSize.toFixed(4) + " MBs) for the remaining storage. Please try again.")
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
                this._startOfflineListener();
            }
            else{
                //No need for a callback because this is an online request and it's immediately
                //pushed to Feature Service.
                this._layerEditManager(null,graphic,layer,enumValue,this.enum(),null,function(count,success,id,error){
                    console.log("id: " + id + ", success: " + success);
                });
            }
        }

        /**
         * Directly implements the applyEdits() method for ADDS, UPDATES and DELETES.
         * NOTE: objectid's usually don't exist on new points, lines, polys that have not
         * been committed to the server yet.
         * @param graphic
         * @param layer
         * @param value
         * @param localEnum
         * @param mCallback
         * @private
         */
        this._layerEditManager = function(
            /* Number */ count,
            /* Graphic */ graphic,
            /* FeatureLayer */ layer,
            /* String */ value,
            /* Object */ localEnum,
            /* String */ serializedItem,
            /* Object */ mCallback){
            switch(value){
                case localEnum.DELETE:
                    layer.applyEdits(null,null,[graphic],function(addResult,updateResult,deleteResult){
                        if(mCallback != null && typeof deleteResult != "undefined" && deleteResult.length > 0) {
                            mCallback(count,deleteResult[0].success,deleteResult[0].objectId,null,serializedItem);
                            console.log("deleteResult ObjectId: " + deleteResult[0].objectId + ", Success: " + deleteResult[0].success);
                        }
                    }.bind(this),
                        function(error){
                            console.log("_layer: " + error.lineNumber + " " + error.message);
                            mCallback(count,deleteResult[0].objectId,false,null,error,serializedItem);
                        }.bind(this)
                    );
                    break;
                case localEnum.ADD:
                    layer.applyEdits([graphic],null,null,function(addResult,updateResult,deleteResult){
                        if(mCallback != null && typeof addResult != "undefined" && addResult.length > 0) {
                            mCallback(count,addResult[0].success,addResult[0].objectId,null,serializedItem);
                            console.log("addResult ObjectId: " + addResult[0].objectId + ", Success: " + addResult[0].success);
                        }
                    }.bind(this),
                        function(error){
                            console.log("_layer: " + error.lineNumber + " " + error.message);
                            mCallback(count,addResult[0].objectId,false,null,error,serializedItem);
                        }.bind(this)
                    );
                    break;
                case localEnum.UPDATE:
                    layer.applyEdits(null,[graphic],null,function(addResult,updateResult,deleteResult){
                        if(mCallback != null && typeof updateResult != "undefined" && updateResult.length > 0) {
                            mCallback(count,updateResult[0].success,updateResult[0].objectId,null,serializedItem);
                            console.log("updateResult ObjectId: " + updateResult[0].objectId + ", Success: " + updateResult[0].success);
                        }
                    }.bind(this),
                        function(error){
                            console.log("_layer: " + error.toString);
                            mCallback(count,updateResult[0].objectId,false,null,error,serializedItem)
                        }.bind(this)
                    );
                    break;
            }
        }

        this._processEditCompleteEvents = function(){
    //
    //        this._deleteObject = function(){
    //            this.totalCount = 0;
    //            this.itemNumber = null;
    //            this.value = null;
    //            this.arcgisDeleteError = false;
    //            this.localStoreDeleteError = false;
    //        }

            console.log("complete!!!!")
        }

        /**
         * Initiates adding a graphic to temp local storage.
         * @param graphic
         * @param layer
         * @param enumValue
         * @param callback
         * @private
         */
        this._addToLocalStore = function(/* Graphic */ graphic, /* FeatureLayer */ layer, /* String */ enumValue,callback)
        {
            var serializedGraphic = this._serializeGraphic(graphic,layer,enumValue);        
            setItem = this._updateExistingLocalStore(serializedGraphic);
            callback(0,setItem,0);
            layer.add(graphic);
        }

        this._startOfflineListener = function(){
            if(this._reestablishedInternetListener == null){
                function onlineStatusHandler(evt){
                    if(evt.detail.message == true && evt.detail.type == this._localEnum().INTERNET_STATUS_EVENT){
                        console.log("_startOfflineListener - internet reestablished");
                        var arr = null;
                        try{var arr = this._getTempLocalStore()}catch(err){console.log("onlineStatusHandler: " + err.toString())};
                        if(arr != null){
                            this._reestablishedInternet();
                        }
                    }
                }
                document.addEventListener("offlineEditEvent",onlineStatusHandler.bind(this),false);
                this._reestablishedInternetListener = 1;
                console.log("starting offline listener.");
            }
        }

        /**
         * Custom Event dispatcher. Always listen for offlineEditEvent and break down different
         * events via the event.detail.type string.
         * @param msg
         * @param event
         * @private
         */
        this._dispatchEvent = function(msg,event){
            //this.preventDefault();
            if (typeof msg != "defined" && window.CustomEvent) {
                var event = new CustomEvent("offlineEditEvent", {
                    detail: {
                        type: event,
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
         * Creates a graphics array from localstorage and pushes all applicable edits to a
         * manager that handles the applyEdits() method.
         * @private
         */
        this._reestablishedInternet = function(){
            var data = localStorage.getItem(this._localEnum().STORAGE_KEY);

            if(data != null){
                this._finalArr = []; //reset the global array
                var split = data.split(this._localEnum().TOKEN);
                split = split.filter(function(a){return a});  //remove empty entries
                var length = split.length;
                for(var i = 0; i < length; i++){
                    var item = split[i];

                    var graphic = this._deserializeGraphic(item);
                    var layer = this.getGraphicsLayerById(graphic.layer);
                    var mLength = length;

                    this._layerEditManager(i,graphic.graphic,layer,graphic.enumValue,this.enum(),item,
                        function(/* Number */ num, /* boolean */ success, /* String */ id,error,item){
    console.log("ITEM!!! " + item)

                        var deleteObj = new this._deleteObject();
                        deleteObj.totalCount = mLength;
                        deleteObj.itemNumber = i;
                        deleteObj.value = item;
                        if(error != null)deleteObj.arcgisDeleteError = true;

                        //Record details in the index
                        var date = new Date();
                        var indexObject = new this._indexObject(graphic.layer,id,graphic.enumValue,success,graphic.graphic.geometry.type,date) ;
                        this._setItemLocalStoreIndexObject(indexObject);

    //                    if(error == null){
                            //Delete items from temp local store that have been successfully
                            //saved to the server or cloud.
    //                        this._deleteItemTempLocalStore(item,function(evt){
    //                            if(evt == false){
    //                                deleteObj.localStoreDeleteError = true;
    //                                console.log("_reestablishedInternet: There was a problem deleting an item from temp local store.");
    //                            }
    //                            else{
    //                                console.log("_reestablishedInternet: item deleted from temp local store successfully.");
    //                            }
    //                        }.bind(this));
    //                    }
    //                    else{
    //                        deleteObj.arcgisDeleteError = true;
    //                    }

                        this._finalArr.push(deleteObj);
                        var length = this._finalArr.length;
                        var totalCt = this._finalArr[0].totalCount;
                        if(length == totalCt){
    //                        this._dispatchEvent(null,this._localEnum().EDIT_COMPLETE_EVENT);
                            this._deleteItemArrayTempLocalStore(this._finalArr);
                        }
                    }.bind(this));
                }
            }
            else{
                console.log("_reestablishedInternet: localStorage was empty. No pending edits to commit.");
            }
        }

        /**
         * Delete all items stored by this library using its unique key.
         * Does NOT delete anything else from localStorage.
         */
        this._deleteTempLocalStore = function(){
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
        this._getTempLocalStore = function(){
            return localStorage.getItem(this._localEnum().STORAGE_KEY);
        }

        /**
         * Takes a serialized geometry and adds it to localStorage
         * @param serializedGraphic
         * @return
         * @private
         */
        this._updateExistingLocalStore = function(/* String */ serializedGraphic){
            var localStore = this._getTempLocalStore();
            var split = localStore.split(this._localEnum().TOKEN);
            var alreadyExists = false;
            for(var i=0;i<split.length; i++){
                var item = split[i];
                if(typeof item !== "undefined" && item.length > 0 && item !== null){
                    if(serializedGraphic === item){
                        console.log("updateExistingLocalStore: duplicate item skipped.");
                        this._dispatchEvent(true,"duplicateEditEvent");
                        alreadyExists = true;
                        break;
                    }
                }
            }
            if(alreadyExists) {
                return { success:null, duplicate:true }
            }
            else{
                return {
                    success: this._setTempLocalStore(localStore + this._localEnum().TOKEN + serializedGraphic),
                    duplicate: false
                }
            }
        }

        /**
         * Sets the localStorage. NOTE: This is a temporary location to store pending edits.
         * The graphic may not have a UID if it has not been processed by the feature service.
         * This poses a minor storage issue. So, in this version of the library we simply
         * store the serialized graphic information and append it to any other pending edits.
         * @param serializedGraphic
         * @returns boolean true if success, else false. Writes
         * error stack to console.
         */
        this._setTempLocalStore = function(/* String */ serializedGraphic){
            var success = false;
            try{
                localStorage.setItem(this._localEnum().STORAGE_KEY,serializedGraphic);
                success = true;
            }
            catch(err){
                console.log("_setTempLocalStore(): " + err.toString);
                success = false;
            }
            return success;
        }

        /**
         * Deletes an item in temporary local store.
         * REQUIRES: ObjectId field is present
         * @param objectId
         * @param callback
         * @private
         */
        this._deleteObjectIdTempLocalStore = function(/* String */ objectId,callback){
            var success = false;
            var localStore = localStorage.getItem(this._localEnum().STORAGE_KEY);
            if(localStore != null){
                var splitStore = localStore.split(this._localEnum().TOKEN);
                for(var i=0; i<splitStore.length; i++){
                    var test = splitStore[i];
                    if(typeof test !== "undefined" && test.length > 0 && test != null && Boolean(test) != false){
                        var item = JSON.parse(splitStore[i]);
                        var q = JSON.parse(item.attributes);
                        if(q.hasOwnProperty("objectid") && q.objectid == objectId){
                            splitStore.splice(i,1);
                            var newArr = this._reserializeGraphicsArray(splitStore);
                            localStorage.removeItem(this._localEnum().STORAGE_KEY);
                            success = this._setTempLocalStore(newArr);
                            break;
                        }
                    }
                }
            }
            callback(success);
        }

        /**
         * Deletes an item in temporary local store.
         * @param entry String representing an entire entry contained in the local store
         * @param callback
         * @returns Boolean returns true if no errors in deleting
         * @private
         */
        this._deleteItemTempLocalStore = function(/* String */ entry,callback){
            var newArr = [];
            var success = false;
            var localStore = localStorage.getItem(this._localEnum().STORAGE_KEY);  
            var length = localStore.length;
            if(localStore != null){
                var splitStore = localStore.split(this._localEnum().TOKEN);
                for(var i=0; i<splitStore.length; i++){
                    var test = splitStore[i];
                    if(typeof test !== "undefined" && test.length > 0 && test != null && Boolean(test) != false){
    //                    var graphic = this._deserializeGraphic(test);
                        if(test == entry){
                            splitStore.splice(i,1);
                            var newArr = this._reserializeGraphicsArray(splitStore);
                            localStorage.removeItem(this._localEnum().STORAGE_KEY);
                            success = this._setTempLocalStore(newArr);  
                            break;
                        }
                    }
                }
            }
            // jabadia: caution, this will return false if the element to delete was not present in the store
            this._dispatchEvent(success,this._localEnum().DELETE_ITEM_EVENT);
            callback(success);
            return success;
        }

        /**
         * Use this for deleting multiple items from temp local store
         * @param array An array of serialized graphic strings
         * @private
         */
        this._deleteItemArrayTempLocalStore = function(/* Array */ array){
            //Delete items from temp local store that have been successfully
            //saved to the server or cloud.
            var success = { error:null, update:null };
            var newStr = [];
            var length = array.length;
            for(var i = 0; i < length; i++){
                var obj = array[i];
                if(obj.arcgisDeleteError == true){
                    newStr.push(obj.value)
                    success.error = false;
                }
            }

            localStorage.removeItem(this._localEnum().STORAGE_KEY);
            var setItem = this._setTempLocalStore(newStr.join(this._localEnum().TOKEN));
            success.update = setItem;
            this._dispatchEvent(success,this._localEnum().EDIT_COMPLETE_EVENT);
            return success;
        }

        /**
         * Validates if an item has been deleted.
         * @param objectId
         * @returns {boolean}
         * @private
         */
        this._isItemTempLocalStore = function(/* String */ objectId){
            var localStore = localStorage.getItem(this._localEnum().INDEX_KEY);
            if(localStore != null){
                var split = localStore.split(this._localEnum().TOKEN);
                for(var i=0;i<split.length; i++){
                    var item = JSON.parse(split[i]);
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
         * Takes an array of graphics as input and serializes them for local storage.
         * Use this when removing an item from the array. This allows you to
         * reconstitute the temporary local storage minus the item that was removed.
         * @param array
         * @returns {string}
         * @private
         */
        this._reserializeGraphicsArray = function( /* Array */ array){
            return array.join(this._localEnum().TOKEN);
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
                for(var i=0;i<split.length; i++){
                    var item = JSON.parse(split[i]);
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
         * @returns {Object} returns null if item not found
         * @private
         */
        this._getItemLocalStoreIndex = function(/* String */ objectId){
            var localStore = localStorage.getItem(this._localEnum().INDEX_KEY);
            if(localStore != null){
                var split = localStore.split(this._localEnum().TOKEN);
                for(var i=0;i<split.length; i++){
                    var item = JSON.parse(split[i]);
                    if(typeof item !== "undefined" || item.length > 0 || item != null){
                        if(item.hasOwnProperty("id") && item.id == objectId){
                            return item;
                        }
                    }
                }
            }
            return null;
        }

        /**
         * Pushes data to the Index. Index uses localStorage for cross-platform consistency.
         * @param indexObject uses the model _indexObject
         * @returns {*}
         * @private
         */
        this._setItemLocalStoreIndexObject = function(/* Object */ indexObject){
            var mIndex = JSON.stringify(indexObject);
            var localStore = this.getLocalStoreIndex();
            try{
                if(localStore == null || typeof localStore == "undefined"){
                    localStorage.setItem(this._localEnum().INDEX_KEY,mIndex);
                }
                else{
                    localStorage.setItem(this._localEnum().INDEX_KEY,localStore + this._localEnum().TOKEN + mIndex);
                }
                success = true;
                this._dispatchEvent(indexObject,this._localEnum().INDEX_UPDATE_EVENT);
            }
            catch(err){
                console.log("_setItemLocalStoreIndexObject(): " + err.stack);
                success = false;
            }
            return success;
        }

        /**
         * Returns a graphic that has been reconstituted from localStorage.
         * @param item
         * @returns {{graphic: esri.Graphic, layer: *, enumValue: *}}
         * @private
         */
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
                    for(var pathIndex=0; pathIndex < geometry.paths.length; pathIndex++){
                        finalGeom.addPath(geometry.paths[pathIndex]);
                    }
                    break
                case "point":
                    finalGeom = new esri.geometry.Point(geometry.x,geometry.y,new esri.SpatialReference(geometry.spatialReference.wkid));
                    break;
                case "polygon":
                    finalGeom = new esri.geometry.Polygon(new esri.SpatialReference(geometry.spatialReference.wkid));
                    for(var ringIndex=0; ringIndex < geometry.rings.length; ringIndex++){
                        finalGeom.addRing(geometry.rings[ringIndex]);
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
            var json = {};
            json.layer = layer.layerId;
            json.enumValue = enumValue;
            json.geometry = JSON.stringify(graphic.geometry);
            json.attributes = null;
            if(graphic.hasOwnProperty("attributes")){
                if(graphic.attributes != null){
                    try{
                        var q = JSON.stringify(graphic.attributes);
                    }
                    catch(err){
                        console.log("_serializeGraphic: " + err.toString());
                    }
                    json.attributes = q;
                }
            }
            return JSON.stringify(json);
        }

        //////////////////////////
        ///
        /// INTERNAL Models
        ///
        //////////////////////////

        /**
         * Model for transporting information related
         * to a pending delete from temp local store.
         * @param count
         * @param value
         * @param arcgisDeleteError
         * @param localStorageDeleteError
         * @private
         */
        this._deleteObject = function(){
            this.totalCount = 0;
            this.itemNumber = null;
            this.value = null;
            this.arcgisDeleteError = false;
            this.localStoreDeleteError = false;
        }

        /**
         * Model for storing serialized index info.
         * @param layerId
         * @param id
         * @param enumType
         * @param success
         * @param geoType The type of Esri geometry
         * @param date Date
         * @private
         */
        this._indexObject = function(/* String */ layerId,
                                     /* String */ id, /* String */ enumType, /* boolean */ success,
                                     /* String */ geoType, /* Date */ date){
            this.id = id;
            this.layerId = layerId;
            this.type = enumType;
            this.success = success;
            this.geometryType = geoType;
            this.date = date;
        }

        /**
         * Model for storing results when attempting to apply edits
         * after internet has been reestablished
         * @param success
         * @param enumString
         * @param graphicsLayerId
         * @param objectId
         * @param error
         * @private
         */
        this._editResultObject = function(/* boolean */ success, /* String */ enumString,
                                          /* int */ graphicsLayerId, /* int */ objectId,/* String */ date, error){
            this.success = success;
            this.enumString = enumString;
            this.graphicsLayerId = graphicsLayerId;
            this.objectId = objectId;
            this.date = date;
            this.error = error;
        }

        //////////////////////////
        ///
        /// INITIALISE
        ///
        //////////////////////////

        /**
         * Auto-detects online/offline conditions.
         * Listen for INTERNET_STATUS_EVENT = true/false.
         * Dependant on Offline.js
         * @private
         */
        this._offlineMonitor = function(){
            Offline.options = { checkOnLoad: true, reconnect: true, requests: false };
            Offline.check();
            Offline.on('up down', function(){
                if(Offline.state === 'up'){
                    console.log("internet is up.");
                    this._dispatchEvent(true,this._localEnum().INTERNET_STATUS_EVENT);
                }
                else{
                    console.log("internet is down.");
                    this._dispatchEvent(false,this._localEnum().INTERNET_STATUS_EVENT);
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
            return;
        }

        this._parseFeatureLayers = function(/* Event */ map){
            var layerIds = map.graphicsLayerIds;
            try{
                for (var i=0; i<layerIds.length; i++){
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
        this._init = function()
        {
            this.utils = new OfflineUtils();
            this._parseFeatureLayers(this.map);
            if(typeof Offline == "object"){
                this._offlineMonitor();
                console.log("OfflineStore is ready.")
                var arr = this._getTempLocalStore();
                if(arr != null && Offline.state === 'up'){
                    this._reestablishedInternet();
                }
                else if(arr != null && Offline.state !== 'up'){
                    this._startOfflineListener();
                }
            }
        }.bind(this)() /* called immediately!! */

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
            if (window.CustomEvent) {
                var event = new CustomEvent("windowErrorEvent", {
                    detail: {
                        message: msg,
                        time: new Date()
                    },
                    bubbles: true,
                    cancelable: true
                });
                document.dispatchEvent(event);
            }
            return true;
        }
    };

});
