/*global IDBKeyRange,indexedDB */

"use strict";
O.esri.Edit.EditStore = function()
{
    this._db = null;

    // Public properties

    var dbName = "features_store";
    var objectStoreName = "features";
    var dbIndex = "featureId";

    // ENUMs

    this.ADD = "add";
    this.UPDATE = "update";
    this.DELETE = "delete";

    this.FEATURE_LAYER_JSON_ID = "feature-layer-object-1001";
    this.PHANTOM_GRAPHIC_PREFIX = "phantom-layer";

    this.isSupported = function()
    {
        if(!window.indexedDB){
            return false;
        }
        return true;
    };

    /**
     * Commit an edit to the database
     * @param operation add, update or delete
     * @param layerUrl the URL of the feature layer
     * @param graphic esri/graphic. The method will serialize to JSON
     * @param callback {true, edit} or {false, error}
     */
    this.pushEdit = function(operation,layerUrl,graphic, callback)
    {

        var edit = {
                id: layerUrl + "/" + graphic.attributes.objectid,
                operation: operation,
                layer: layerUrl,
                graphic: this._serialize(graphic)
            };

        var transaction = this._db.transaction([objectStoreName],"readwrite");

        transaction.oncomplete = function(event){
            callback(true);
        };

        transaction.onerror = function(event){
            callback(false,event.target.error.message);
        };

        var objectStore = transaction.objectStore(objectStoreName);
        objectStore.put(edit);
    };

    /**
     * Use this to store any static FeatureLayer or related JSON data related to your app that will assist in restoring
     * a FeatureLayer.
     *
     * Handles both adds and updates. It copies any object properties, so it will not, by default, overwrite the entire object.
     *
     * Example: If you just submit {featureLayerRenderer: {someJSON}} it will only update the featureLayerRenderer property
     *
     * NOTE: "dataObject.id" is a reserved property. If you use "id" in your object this method will break.
     * @param dataObject Object
     * @param callback {true, null} or {false, error}
     */
    this.pushFeatureLayerJSON = function(dataObject /*Object*/, callback){

        console.assert(this._db !== null, "indexeddb not initialized");
        if(typeof dataObject != "object"){
            callback(false,"dataObject type is not an object.");
        }

        var db = this._db;
        dataObject.id = this.FEATURE_LAYER_JSON_ID;

        this.getFeatureLayerJSON(function(success,result) {

            if (success && typeof result !== "undefined") {

                var objectStore = db.transaction([objectStoreName],"readwrite").objectStore(objectStoreName);

                for(var key in dataObject){
                    if (dataObject.hasOwnProperty(key)) {
                        result[key] = dataObject[key];
                    }
                }

                // Insert the update into the database
                var updateFeatureLayerDataRequest = objectStore.put(result);

                updateFeatureLayerDataRequest.onsuccess = function(){
                    callback(true,null);
                }

                updateFeatureLayerDataRequest.onerror = function(err){
                    callback(false,err);
                };
            }
            else{

                var transaction = db.transaction([objectStoreName],"readwrite");

                transaction.oncomplete = function(event){
                    callback(true, null);
                };

                transaction.onerror = function(event){
                    callback(false,event.target.error.message);
                };

                var objectStore = transaction.objectStore(objectStoreName);
                objectStore.put(dataObject);
            }
        });
    };

    /**
     * Retrieve the FeatureLayer data object
     * @param callback {true, object} or {false, error}
     */
    this.getFeatureLayerJSON = function(callback){

        console.assert(this._db !== null, "indexeddb not initialized");

        var objectStore = this._db.transaction([objectStoreName],"readwrite").objectStore(objectStoreName);

        //Get the entry associated with the graphic
        var objectStoreGraphicRequest = objectStore.get(this.FEATURE_LAYER_JSON_ID);

        objectStoreGraphicRequest.onsuccess = function() {
            var object = objectStoreGraphicRequest.result;
            if(typeof object != "undefined"){
                callback(true,object);
            }
            else{
                callback(false,"nothing found");
            }
        };

        objectStoreGraphicRequest.onerror = function(msg){
            callback(false,msg);
        }
    };

    /**
     * Safe delete. Checks if id exists, then reverifies.
     * @param callback {success, {message: String}}
     */
    this.deleteFeatureLayerJSON = function(callback){
        // NOTE: the implementation of the IndexedDB spec has a design fault with respect to
        // handling deletes. The result of a delete operation is always designated as undefined.
        // What this means is that there is no way to tell if an operation was successful or not.
        // And, it will always return 'true.'
        //
        // In order to get around this we have to verify if after the attempted deletion operation
        // if the record is or is not in the database. Kinda dumb, but that's how IndexedDB works.
        //http://stackoverflow.com/questions/17137879/is-there-a-way-to-get-information-on-deleted-record-when-calling-indexeddbs-obj

        var db = this._db;
        var deferred = null;
        var self = this;

        var id = this.FEATURE_LAYER_JSON_ID;

        require(["dojo/Deferred"], function(Deferred) {
            deferred = new Deferred();

            // Step 4 - Then we check to see if the record actually exists or not.
            deferred.then(function (result) {
                    // IF the delete was successful, then the record should return an error because it doesn't exist.
                    // We aren't 100% sure how all platforms will perform so we also trap the promise for return results.
                    self.editExists(id).then(function (results) {
                            // If the result is false then in theory the id no longer exists
                            // and we should return 'true' to indicate a successful delete operation.
                            results.success == false ? callback(true, {message:"id does not exist"}) : callback(false, {message:null});
                        },
                        function (err) {
                            // If the result is false then in theory the id no longer exists
                            // and we should return 'true' to indicate a successful delete operation.
                            callback(true, {message:"id does not exist"}); //because we want this test to throw an error. That means item deleted.
                        })
                },
                // There was a problem with the delete operation on the database
                // This error message will come from editExists();
                function (err) {
                    callback(false, {message: "id does not exist"});
                });

            // Step 1 - lets see if record exits. If it does not then return callback. Otherwise,
            // continue on with the deferred.
            self.editExists(id).then(function (result) {
                    if (result && result.success) {

                        var objectStore = db.transaction([objectStoreName], "readwrite").objectStore(objectStoreName);

                        // Step 2 - go ahead and delete graphic
                        var objectStoreDeleteRequest = objectStore.delete(id);

                        // Step 3 - We know that the onsuccess will always fire unless something serious goes wrong.
                        // So we go ahead and resolve the deferred here.
                        objectStoreDeleteRequest.onsuccess = function () {
                            deferred.resolve(true);
                        };

                        objectStoreDeleteRequest.onerror = function (msg) {
                            deferred.reject({success: false, error: msg});
                        }
                    }
                    else{
                        deferred.reject({success:false,message:"id does not exist"})
                    }
                },
                // If there is an error in editExists()
                function (err) {
                    deferred.reject({success: false, message: err});
                });
        })
    };

    /**
     * Returns all the edits recursively via the callback
     * @param callback {value, message}
     */
    this.getAllEdits = function(callback){

        console.assert(this._db !== null, "indexeddb not initialized");

        if(this._db !== null){

            var fLayerJSONId = this.FEATURE_LAYER_JSON_ID;
            var phantomGraphicPrefix = this.PHANTOM_GRAPHIC_PREFIX;

            var transaction = this._db.transaction([objectStoreName])
                .objectStore(objectStoreName)
                .openCursor();

            transaction.onsuccess = function(event)
            {
                var cursor = event.target.result;
                if(cursor && cursor.hasOwnProperty("value") && cursor.value.hasOwnProperty("id")){

                    // Make sure we are not return FeatureLayer JSON data or a Phantom Graphic
                    if(cursor.value.id !== fLayerJSONId && cursor.value.id.indexOf(phantomGraphicPrefix) == -1){
                        callback(cursor.value,null);
                    }
                    cursor.continue();
                }
                else
                {
                    callback(null, "end");
                }
            }.bind(this);
            transaction.onerror = function(err)
            {
                callback(null, err);
            };
        }
        else
        {
            callback(null, "no db");
        }
    };

    /**
     * Returns all the edits as a single Array via the callback
     * @param callback {value, message}
     */
    this.getAllEditsArray = function(callback){

        console.assert(this._db !== null, "indexeddb not initialized");
        var editsArray = [];

        if(this._db !== null){

            var fLayerJSONId = this.FEATURE_LAYER_JSON_ID;
            var phantomGraphicPrefix = this.PHANTOM_GRAPHIC_PREFIX;

            var transaction = this._db.transaction([objectStoreName])
                .objectStore(objectStoreName)
                .openCursor();

            transaction.onsuccess = function(event)
            {
                var cursor = event.target.result;
                if(cursor && cursor.hasOwnProperty("value") && cursor.value.hasOwnProperty("id")){

                    // Make sure we are not return FeatureLayer JSON data or a Phantom Graphic
                    if(cursor.value.id !== fLayerJSONId && cursor.value.id.indexOf(phantomGraphicPrefix) == -1){
                        editsArray.push(cursor.value);

                    }
                    cursor.continue();
                }
                else
                {
                    callback(editsArray, "end");
                }
            }.bind(this);
            transaction.onerror = function(err)
            {
                callback(null, err);
            };
        }
        else
        {
            callback(null, "no db");
        }
    };

    /**
     * Update an edit already exists in the database
     * @param operation add, update or delete
     * @param layer the URL of the feature layer
     * @param graphic esri/graphic. The method will serialize to JSON
     * @param callback {true, edit} or {false, error}
     */
    this.updateExistingEdit = function(operation,layer,graphic, callback){

        console.assert(this._db !== null, "indexeddb not initialized");

        var objectStore = this._db.transaction([objectStoreName],"readwrite").objectStore(objectStoreName);

        //Let's get the entry associated with the graphic
        var objectStoreGraphicRequest = objectStore.get(graphic.attributes.objectid);
        objectStoreGraphicRequest.onsuccess = function() {

            //Grab the data object returned as a result
            var data = objectStoreGraphicRequest.result;

            //Create a new update object
            var update = {
                id: layer + "/" + graphic.attributes.objectid,
                operation: operation,
                layer: layer,
                graphic: graphic.toJson()
            };

            // Insert the update into the database
            var updateGraphicRequest = objectStore.put(update);

            updateGraphicRequest.onsuccess = function(){
                callback(true);
            }

            updateGraphicRequest.onerror = function(err){
                callback(false,err);
            };
        }
    };

    /**
     * Delete a pending edit's record from the database.
     * IMPORTANT: Be aware of false negatives. See Step 4 in this function.
     *
     * @param layerUrl
     * @param graphic Graphic
     * @param callback {boolean, error}
     */
    this.delete = function(layerUrl, graphic, callback){

        // NOTE: the implementation of the IndexedDB spec has a design fault with respect to
        // handling deletes. The result of a delete operation is always designated as undefined.
        // What this means is that there is no way to tell if an operation was successful or not.
        // And, it will always return 'true.'
        //
        // In order to get around this we have to verify if after the attempted deletion operation
        // if the record is or is not in the database. Kinda dumb, but that's how IndexedDB works.
        //http://stackoverflow.com/questions/17137879/is-there-a-way-to-get-information-on-deleted-record-when-calling-indexeddbs-obj

        var db = this._db;
        var deferred = null;
        var self = this;

        var id = layerUrl + "/" + graphic.attributes.objectid;

        require(["dojo/Deferred"], function(Deferred){
            deferred = new Deferred();

            // Step 1 - lets see if record exits. If it does then return callback.
            self.editExists(id).then(function(result){
               if(result.success){
                   // Step 4 - Then we check to see if the record actually exists or not.
                   deferred.then(function(result){

                           // IF the delete was successful, then the record should return 'false' because it doesn't exist.
                           self.editExists(id).then(function(results){
                                   results.success == false ? callback(true) : callback(false);
                               },
                               function(err){
                                   callback(true); //because we want this test to throw an error. That means item deleted.
                               })
                       },
                       // There was a problem with the delete operation on the database
                       function(err){
                           callback(false,err);
                       });

                   var objectStore = db.transaction([objectStoreName],"readwrite").objectStore(objectStoreName);

                   // Step 2 - go ahead and delete graphic
                   var objectStoreDeleteRequest = objectStore.delete(id);

                   // Step 3 - We know that the onsuccess will always fire unless something serious goes wrong.
                   // So we go ahead and resolve the deferred here.
                   objectStoreDeleteRequest.onsuccess = function() {
                       deferred.resolve(true);
                   };

                   objectStoreDeleteRequest.onerror = function(msg){
                       deferred.reject({success:false,error:msg});
                   }
               }
            },
            // If there is an error in editExists()
            function(err){
                callback(false);
            });
        });
    };

    this.resetEditsQueue = function(callback)
    {
        console.assert(this._db !== null, "indexeddb not initialized");

        var request = this._db.transaction([objectStoreName],"readwrite")
            .objectStore(objectStoreName)
            .clear();
        request.onsuccess = function(event){
            setTimeout(function(){callback(true);},0);
        };
        request.onerror = function(err){
            callback(false,err);
        };
    };

    this.pendingEditsCount = function(callback)
    {
        console.assert(this._db !== null, "indexeddb not initialized");

        var count = 0;
        var id = this.FEATURE_LAYER_JSON_ID;

        var objectStore = this._db.transaction([objectStoreName]).objectStore(objectStoreName);
        objectStore.openCursor().onsuccess = function(evt)
        {
            var cursor = evt.target.result;
            if(cursor && cursor.hasOwnProperty("value") && cursor.value.hasOwnProperty("id"))
            {
                if(cursor.value.id !== id){
                    count++;
                }
                cursor.continue();
            }
            else
            {
                callback(count);
            }
        };
    };

    /**
     * Verify is an edit already exists in the database. Checks the objectId and layerId.
     * @param id
     * @returns {deferred} {success: boolean, error: message}
     * @private
     */
    this.editExists = function(id){

        var db = this._db;
        var deferred = null;

        require(["dojo/Deferred"], function(Deferred){
            deferred = new Deferred();

            var objectStore = db.transaction([objectStoreName],"readwrite").objectStore(objectStoreName);

            //Get the entry associated with the graphic
            var objectStoreGraphicRequest = objectStore.get(id);

            objectStoreGraphicRequest.onsuccess = function() {
                var graphic = objectStoreGraphicRequest.result;
                if(graphic && (graphic.id == id)){
                    deferred.resolve({success:true,error:null});
                }
                else{
                    deferred.reject({success:false,error:"Layer id is not a match."});
                }
            };

            objectStoreGraphicRequest.onerror = function(msg){
                deferred.reject({success:false,error:msg});
            }
        });

        //We return a deferred object so that when calling this function you can chain it with a then() statement.
        return deferred;
    };

    /**
     * Returns the approximate size of the database in bytes
     * @param callback  {usage, error} Whereas, the usage Object is {sizeBytes: number, editCount: number}
     */
    this.getUsage = function(callback)
    {
        console.assert(this._db !== null, "indexeddb not initialized");

        var usage = { sizeBytes: 0, editCount: 0 };

        var transaction = this._db.transaction([objectStoreName])
            .objectStore(objectStoreName)
            .openCursor();

        console.log("dumping keys");

        transaction.onsuccess = function(event)
        {
            var cursor = event.target.result;
            if(cursor && cursor.hasOwnProperty("value") && cursor.value.hasOwnProperty("id"))
            {
                var storedObject = cursor.value;
                var json = JSON.stringify(storedObject);
                usage.sizeBytes += json.length;
                usage.editCount += 1;
                cursor.continue();
            }
            else
            {
                callback(usage,null);
            }
        };
        transaction.onerror = function(err)
        {
            callback(null,err);
        };
    };

    // internal methods

    /**
     * Save space in the database...don't need to store the entire Graphic object just its public properties!
     * @param graphic
     * @returns {*}
     * @private
     */
    this._serialize = function(graphic)
    {
        // see http://resources.arcgis.com/en/help/arcgis-rest-api/index.html#/Apply_Edits_Feature_Service_Layer/02r3000000r6000000/
        // use graphic's built-in serializing method
        var json = graphic.toJson();
        var jsonClean =
        {
            attributes: json.attributes,
            geometry: json.geometry,
            infoTemplate: json.infoTemplate,
            symbol: json.symbol
        };
        return JSON.stringify(jsonClean);
    };

    this._deserialize = function(json)
    {
        var graphic;

        require(["esri/graphic"],function(Graphic){
            graphic = new Graphic(JSON.parse(json));
        });

        return graphic;
    };

    this.init = function(callback)
    {
        console.log("init editsStore.js");

        var request = indexedDB.open(dbName, 11);
        callback = callback || function(success) { console.log("EditsStore::init() success:", success); }.bind(this);

        request.onerror = function(event)
        {
            console.log("indexedDB error: " + event.target.errorCode);
            callback(false,event.target.errorCode);
        }.bind(this);

        request.onupgradeneeded = function(event)
        {
            var db = event.target.result;

            if( db.objectStoreNames.contains(objectStoreName))
            {
                db.deleteObjectStore(objectStoreName);
            }

            var objectStore = db.createObjectStore(objectStoreName, { keyPath: "id" });
            objectStore.createIndex(dbIndex,dbIndex, {unique: false});
        }.bind(this);

        request.onsuccess = function(event)
        {
            this._db = event.target.result;
            console.log("database opened successfully");
            callback(true);
        }.bind(this);
    };

    ///
    /// DEPRECATED
    ///

    /**
     * Deprecated @ v2.5. Use pendingEditsCount() instead.
     */
    this.hasPendingEdits = function()
    {
        return "DEPRECATED at v2.5!";
    };

    /**
     * Deprecated @ v2.5. Use public function editExists() instead.
     */
    this._isEditDuplicated = function(newEdit,edits){
        return "DEPRECATED at v2.5!";
    };
};


