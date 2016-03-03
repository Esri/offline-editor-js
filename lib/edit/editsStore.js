/*global indexedDB */
/*jshint -W030 */
O.esri.Edit.EditStore = function () {

    "use strict";

    this._db = null;
    this._isDBInit = false;

    // Public properties

    this.dbName = "features_store";
    this.objectStoreName = "features";
    this.objectId = "objectid"; // set this depending on how your feature service is configured;

    //var _dbIndex = "featureId"; // @private

    // ENUMs

    this.ADD = "add";
    this.UPDATE = "update";
    this.DELETE = "delete";

    this.FEATURE_LAYER_JSON_ID = "feature-layer-object-1001";
    this.FEATURE_COLLECTION_ID = "feature-collection-object-1001";
    this.PHANTOM_GRAPHIC_PREFIX = "phantom-layer";
    this._PHANTOM_PREFIX_TOKEN = "|@|";

    this.isSupported = function () {
        if (!window.indexedDB) {
            return false;
        }
        return true;
    };

    /**
     * Commit an edit to the database
     * @param operation add, update or delete
     * @param layerUrl the URL of the feature layer
     * @param graphic esri/graphic. The method will serialize to JSON
     * @param callback callback(true, edit) or callback(false, error)
     */
    this.pushEdit = function (operation, layerUrl, graphic, callback) {

        var edit = {
            id: layerUrl + "/" + graphic.attributes[this.objectId],
            operation: operation,
            layer: layerUrl,
            type: graphic.geometry.type,
            graphic: graphic.toJson()
        };

        if(typeof graphic.attributes[this.objectId] === "undefined") {
            console.error("editsStore.pushEdit() - failed to insert undefined objectId into database. Did you set offlineEdit.DB_UID? " + JSON.stringify(graphic.attributes));
            callback(false,"editsStore.pushEdit() - failed to insert undefined objectId into database. Did you set offlineEdit.DB_UID? " + JSON.stringify(graphic.attributes));
        }
        else{
            var transaction = this._db.transaction([this.objectStoreName], "readwrite");

            transaction.oncomplete = function (event) {
                callback(true);
            };

            transaction.onerror = function (event) {
                callback(false, event.target.error.message);
            };

            var objectStore = transaction.objectStore(this.objectStoreName);
            objectStore.put(edit);
        }
    };

    /**
     * Use this to store any static FeatureLayer or related JSON data related to your app that will assist in restoring
     * a FeatureLayer.
     *
     * Handles both adds and updates. It copies any object properties, so it will not, by default, overwrite the entire object.
     *
     * Example 1: If you just submit {featureLayerRenderer: {someJSON}} it will only update the featureLayerRenderer property
     * Example 2: This is a full example
     * {
     *      featureLayerJSON: ...,
     *      graphics: ..., // Serialized Feature Layer graphics. Must be serialized!
     *      renderer: ...,
     *      opacity: ...,
     *      outfields: ...,
     *      mode: ...,
     *      extent: ...,
     *      zoom: 7,
     *      lastEdit: ...
     * }
     *
     * NOTE: "dataObject.id" is a reserved property. If you use "id" in your object this method will break.
     * @param dataStore Object
     * @param callback callback(true, null) or callback(false, error)
     */
    this.pushFeatureLayerJSON = function (dataStore /*Object*/, callback) {

        console.assert(this._db !== null, "indexeddb not initialized");
        if (typeof dataStore != "object") {
            callback(false, "dataObject type is not an object.");
        }

        var db = this._db;
        dataStore.id = this.FEATURE_LAYER_JSON_ID;

        this.getFeatureLayerJSON(function (success, result) {

            var objectStore;

            if (success && typeof result !== "undefined") {

                objectStore = db.transaction([this.objectStoreName], "readwrite").objectStore(this.objectStoreName);

                // Make a copy of the object
                for (var key in dataStore) {
                    if (dataStore.hasOwnProperty(key)) {
                        result[key] = dataStore[key];
                    }
                }

                // Insert the update into the database
                var updateFeatureLayerDataRequest = objectStore.put(result);

                updateFeatureLayerDataRequest.onsuccess = function () {
                    callback(true, null);
                };

                updateFeatureLayerDataRequest.onerror = function (err) {
                    callback(false, err);
                };
            }
            else {

                var transaction = db.transaction([this.objectStoreName], "readwrite");

                transaction.oncomplete = function (event) {
                    callback(true, null);
                };

                transaction.onerror = function (event) {
                    callback(false, event.target.error.message);
                };

                objectStore = transaction.objectStore(this.objectStoreName);

                // Protect against data cloning errors since we don't validate the input object
                // Example: if you attempt to use an esri.Graphic in its native form you'll get a data clone error
                try {
                    objectStore.put(dataStore);
                }
                catch (err) {
                    callback(false, JSON.stringify(err));
                }
            }
        }.bind(this));
    };

    /**
     * Retrieve the FeatureLayer data object
     * @param callback callback(true, object) || callback(false, error)
     */
    this.getFeatureLayerJSON = function (callback) {

        console.assert(this._db !== null, "indexeddb not initialized");

        var objectStore = this._db.transaction([this.objectStoreName], "readwrite").objectStore(this.objectStoreName);

        //Get the entry associated with the graphic
        var objectStoreGraphicRequest = objectStore.get(this.FEATURE_LAYER_JSON_ID);

        objectStoreGraphicRequest.onsuccess = function () {
            var object = objectStoreGraphicRequest.result;
            if (typeof object != "undefined") {
                callback(true, object);
            }
            else {
                callback(false, "nothing found");
            }
        };

        objectStoreGraphicRequest.onerror = function (msg) {
            callback(false, msg);
        };
    };

    /**
     * Safe delete. Checks if id exists, then reverifies.
     * @param callback callback(boolean, {message: String})
     */
    this.deleteFeatureLayerJSON = function (callback) {
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

        require(["dojo/Deferred"], function (Deferred) {
            deferred = new Deferred();

            // Step 4 - Then we check to see if the record actually exists or not.
            deferred.then(function (result) {
                    // IF the delete was successful, then the record should return an error because it doesn't exist.
                    // We aren't 100% sure how all platforms will perform so we also trap the promise for return results.
                    self.editExists(id).then(function (results) {
                            // If edit does exist then we have not been successful in deleting the object.
                            callback(false, {message: "object was not deleted."});
                        },
                        function (err) {
                            // If the result is false then in theory the id no longer exists
                            // and we should return 'true' to indicate a successful delete operation.
                            callback(true, {message: "id does not exist"}); //because we want this test to throw an error. That means item deleted.
                        });
                },
                // There was a problem with the delete operation on the database
                // This error message will come from editExists();
                function (err) {
                    callback(false, {message: "id does not exist"});
                });

            // Step 1 - lets see if record exits. If it does not then return callback. Otherwise,
            // continue on with the deferred.
            self.editExists(id).then(function (result) {

                var objectStore = db.transaction([self.objectStoreName], "readwrite").objectStore(self.objectStoreName);

                // Step 2 - go ahead and delete graphic
                var objectStoreDeleteRequest = objectStore.delete(id);

                // Step 3 - We know that the onsuccess will always fire unless something serious goes wrong.
                // So we go ahead and resolve the deferred here.
                objectStoreDeleteRequest.onsuccess = function () {
                    deferred.resolve(true);
                };

                objectStoreDeleteRequest.onerror = function (msg) {
                    deferred.reject({success: false, error: msg});
                };

            },
            // If there is an error in editExists()
            function (err) {
                deferred.reject({success: false, message: err});
            }.bind(this));
        });
    };

    /**
     * Add a phantom graphic to the store.
     * IMPORTANT! Requires graphic to have an objectId
     * @param graphic
     * @param callback
     */
    this.pushPhantomGraphic = function (graphic, callback) {
        console.assert(this._db !== null, "indexeddb not initialized");

        var db = this._db;
        var id = this.PHANTOM_GRAPHIC_PREFIX + this._PHANTOM_PREFIX_TOKEN + graphic.attributes[this.objectId];

        var object = {
            id: id,
            graphic: graphic.toJson()
        };

        var transaction = db.transaction([this.objectStoreName], "readwrite");

        transaction.oncomplete = function (event) {
            callback(true, null);
        };

        transaction.onerror = function (event) {
            callback(false, event.target.error.message);
        };

        var objectStore = transaction.objectStore(this.objectStoreName);
        objectStore.put(object);

    };

    /**
     * Return an array of phantom graphics
     * @param callback
     */
    this.getPhantomGraphicsArray = function (callback) {
        console.assert(this._db !== null, "indexeddb not initialized");
        var editsArray = [];

        if (this._db !== null) {

            var phantomGraphicPrefix = this.PHANTOM_GRAPHIC_PREFIX;

            var transaction = this._db.transaction([this.objectStoreName])
                .objectStore(this.objectStoreName)
                .openCursor();

            transaction.onsuccess = function (event) {
                var cursor = event.target.result;
                if (cursor && cursor.value && cursor.value.id) {

                    // Make sure we are not return FeatureLayer JSON data or a Phantom Graphic
                    if (cursor.value.id.indexOf(phantomGraphicPrefix) != -1) {
                        editsArray.push(cursor.value);

                    }
                    cursor.continue();
                }
                else {
                    callback(editsArray, "end");
                }
            }.bind(this);
            transaction.onerror = function (err) {
                callback(null, err);
            };
        }
        else {
            callback(null, "no db");
        }
    };

    /**
     * Internal method that returns an array of id's only
     * @param callback
     * @private
     */
    this._getPhantomGraphicsArraySimple = function (callback) {
        console.assert(this._db !== null, "indexeddb not initialized");
        var editsArray = [];

        if (this._db !== null) {

            var phantomGraphicPrefix = this.PHANTOM_GRAPHIC_PREFIX;

            var transaction = this._db.transaction([this.objectStoreName])
                .objectStore(this.objectStoreName)
                .openCursor();

            transaction.onsuccess = function (event) {
                var cursor = event.target.result;
                if (cursor && cursor.value && cursor.value.id) {

                    // Make sure we are not return FeatureLayer JSON data or a Phantom Graphic
                    if (cursor.value.id.indexOf(phantomGraphicPrefix) != -1) {
                        editsArray.push(cursor.value.id);

                    }
                    cursor.continue();
                }
                else {
                    callback(editsArray, "end");
                }
            }.bind(this);
            transaction.onerror = function (err) {
                callback(null, err);
            };
        }
        else {
            callback(null, "no db");
        }
    };

    /**
     * Deletes an individual graphic from the phantom layer
     * @param id Internal ID
     * @param callback callback(boolean, message)
     */
    this.deletePhantomGraphic = function (id, callback) {
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

        require(["dojo/Deferred"], function (Deferred) {
            deferred = new Deferred();

            // Step 1 - lets see if record exits. If it does then return callback.
            self.editExists(id).then(function (result) {

                // Step 4 - Then we check to see if the record actually exists or not.
                deferred.then(function (result) {

                        // IF the delete was successful, then the record should return 'false' because it doesn't exist.
                        self.editExists(id).then(function (results) {
                                callback(false, "item was not deleted"); // item is still in the database!!
                            },
                            function (err) {
                                callback(true, "item successfully deleted"); //because we want this test to throw an error. That means item deleted.
                            });
                    },
                    // There was a problem with the delete operation on the database
                    function (err) {
                        callback(false, err);
                    });

                var objectStore = db.transaction([self.objectStoreName], "readwrite").objectStore(self.objectStoreName);

                // Step 2 - go ahead and delete graphic
                var objectStoreDeleteRequest = objectStore.delete(id);

                // Step 3 - We know that the onsuccess will always fire unless something serious goes wrong.
                // So we go ahead and resolve the deferred here.
                objectStoreDeleteRequest.onsuccess = function () {
                    deferred.resolve(true);
                };

                objectStoreDeleteRequest.onerror = function (msg) {
                    deferred.reject({success: false, error: msg});
                };
            },
            // If there is an error in editExists()
            function (err) {
                callback(false, "item doesn't exist in db");
            });
        });
    };

    /**
     * Removes all phantom graphics from database
     * @param callback boolean
     */
    this.resetPhantomGraphicsQueue = function (callback) {

        var db = this._db;

        // First we need to get the array of graphics that are stored in the database
        // so that we can cycle thru them.
        this._getPhantomGraphicsArraySimple(function (array) {
            if (array != []) {

                var errors = 0;
                var tx = db.transaction([this.objectStoreName], "readwrite");
                var objectStore = tx.objectStore(this.objectStoreName);

                objectStore.onerror = function () {
                    errors++;
                };

                tx.oncomplete = function () {
                    errors === 0 ? callback(true) : callback(false);
                };

                var length = array.length;
                for (var i = 0; i < length; i++) {
                    objectStore.delete(array[i]);
                }
            }
            else {
                callback(true);
            }
        }.bind(this));
    };

    /**
     * Retrieve an edit by its internal ID
     * @param id String identifier
     * @param callback callback(true,graphic) or callback(false, error)
     */
    this.getEdit = function(id,callback){

        console.assert(this._db !== null, "indexeddb not initialized");
        var objectStore = this._db.transaction([this.objectStoreName], "readwrite").objectStore(this.objectStoreName);

        if(typeof id === "undefined"){
            callback(false,"id is undefined.");
            return;
        }

        //Get the entry associated with the graphic
        var objectStoreGraphicRequest = objectStore.get(id);

        objectStoreGraphicRequest.onsuccess = function () {
            var graphic = objectStoreGraphicRequest.result;
            if (graphic && (graphic.id == id)) {
                callback(true,graphic);
            }
            else {
                callback(false,"Id not found");
            }
        };

        objectStoreGraphicRequest.onerror = function (msg) {
            callback(false,msg);
        };
    };

    /**
     * Returns all the edits recursively via the callback
     * @param callback {value, message}
     */
    this.getAllEdits = function (callback) {

        console.assert(this._db !== null, "indexeddb not initialized");

        if (this._db !== null) {

            var fLayerJSONId = this.FEATURE_LAYER_JSON_ID;
            var fCollectionId = this.FEATURE_COLLECTION_ID;
            var phantomGraphicPrefix = this.PHANTOM_GRAPHIC_PREFIX;

            var transaction = this._db.transaction([this.objectStoreName])
                .objectStore(this.objectStoreName)
                .openCursor();

            transaction.onsuccess = function (event) {
                var cursor = event.target.result;
                if (cursor && cursor.hasOwnProperty("value") && cursor.value.hasOwnProperty("id")) {

                    // Make sure we are not return FeatureLayer JSON data or a Phantom Graphic
                    if (cursor.value.id !== fLayerJSONId && cursor.value.id !== fCollectionId && cursor.value.id.indexOf(phantomGraphicPrefix) == -1) {
                        callback(cursor.value, null);
                    }
                    cursor.continue();
                }
                else {
                    callback(null, "end");
                }
            }.bind(this);
            transaction.onerror = function (err) {
                callback(null, err);
            };
        }
        else {
            callback(null, "no db");
        }
    };

    /*
     * Query the database, looking for any existing Add temporary OIDs, and return the nextTempId to be used.
     * @param feature - extended layer from offline edit advanced
     * @param callback {int, messageString} or {null, messageString}
     */
    this.getNextLowestTempId = function (feature, callback) {
        var addOIDsArray = [],
            self = this;

        if (this._db !== null) {

            var fLayerJSONId = this.FEATURE_LAYER_JSON_ID;
            var fCollectionId = this.FEATURE_COLLECTION_ID;
            var phantomGraphicPrefix = this.PHANTOM_GRAPHIC_PREFIX;
            
            var transaction = this._db.transaction([this.objectStoreName])
                .objectStore(this.objectStoreName)
                .openCursor();

            transaction.onsuccess = function (event) {
                var cursor = event.target.result;
                if (cursor && cursor.value && cursor.value.id) {
                    // Make sure we are not return FeatureLayer JSON data or a Phantom Graphic
                    if (cursor.value.id !== fLayerJSONId && cursor.value.id !== fCollectionId && cursor.value.id.indexOf(phantomGraphicPrefix) == -1) {
                        if(cursor.value.layer === feature.url && cursor.value.operation === "add"){ // check to make sure the edit is for the feature we are looking for, and that the operation is an add.
                            addOIDsArray.push(cursor.value.graphic.attributes[self.objectId]); // add the temporary OID to the array
                        }
                    }
                    cursor.continue();
                }
                else {
                    if(addOIDsArray.length === 0){ // if we didn't find anything,
                        callback(-1, "success"); // we'll start with -1
                    }
                    else{
                        var filteredOIDsArray = addOIDsArray.filter(function(val){ // filter out any non numbers from the array...
                            return !isNaN(val); // .. should anything have snuck in or returned a NaN
                        });
                        var lowestTempId = Math.min.apply(Math, filteredOIDsArray); // then find the lowest number from the array
                        callback(lowestTempId--, "success"); // and we'll start with one less than tat.
                    }
                }
            }.bind(this);
            transaction.onerror = function (err) {
                callback(null, err);
            };
        }
        else {
            callback(null, "no db");
        }
    },

    /**
     * Returns all the edits as a single Array via the callback
     * @param callback {array, messageString} or {null, messageString}
     */
    this.getAllEditsArray = function (callback) {

        console.assert(this._db !== null, "indexeddb not initialized");
        var editsArray = [];

        if (this._db !== null) {

            var fLayerJSONId = this.FEATURE_LAYER_JSON_ID;
            var fCollectionId = this.FEATURE_COLLECTION_ID;
            var phantomGraphicPrefix = this.PHANTOM_GRAPHIC_PREFIX;

            var transaction = this._db.transaction([this.objectStoreName])
                .objectStore(this.objectStoreName)
                .openCursor();

            transaction.onsuccess = function (event) {
                var cursor = event.target.result;
                if (cursor && cursor.value && cursor.value.id) {

                    // Make sure we are not return FeatureLayer JSON data or a Phantom Graphic
                    if (cursor.value.id !== fLayerJSONId && cursor.value.id !== fCollectionId && cursor.value.id.indexOf(phantomGraphicPrefix) == -1) {
                        editsArray.push(cursor.value);

                    }
                    cursor.continue();
                }
                else {
                    callback(editsArray, "end");
                }
            }.bind(this);
            transaction.onerror = function (err) {
                callback(null, err);
            };
        }
        else {
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
    this.updateExistingEdit = function (operation, layer, graphic, callback) {

        console.assert(this._db !== null, "indexeddb not initialized");

        var objectStore = this._db.transaction([this.objectStoreName], "readwrite").objectStore(this.objectStoreName);

        //Let's get the entry associated with the graphic
        var objectStoreGraphicRequest = objectStore.get(graphic.attributes[this.objectId]);
        objectStoreGraphicRequest.onsuccess = function () {

            //Grab the data object returned as a result
            // TO-DO Do we keep this??
            objectStoreGraphicRequest.result;

            //Create a new update object
            var update = {
                id: layer + "/" + graphic.attributes[this.objectId],
                operation: operation,
                layer: layer,
                graphic: graphic.toJson()
            };

            // Insert the update into the database
            var updateGraphicRequest = objectStore.put(update);

            updateGraphicRequest.onsuccess = function () {
                callback(true);
            };

            updateGraphicRequest.onerror = function (err) {
                callback(false, err);
            };
        }.bind(this);
    };

    /**
     * Delete a pending edit's record from the database.
     * IMPORTANT: Be aware of false negatives. See Step 4 in this function.
     *
     * @param layerUrl
     * @param graphic Graphic
     * @param callback {boolean, error}
     */
    this.delete = function (layerUrl, graphic, callback) {

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

        var id = layerUrl + "/" + graphic.attributes[this.objectId];

        require(["dojo/Deferred"], function (Deferred) {
            deferred = new Deferred();

            // Step 1 - lets see if record exits. If it does then return callback.
            self.editExists(id).then(function (result) {

                // Step 4 - Then we check to see if the record actually exists or not.
                deferred.then(function (result) {

                        // IF the delete was successful, then the record should return 'false' because it doesn't exist.
                        self.editExists(id).then(function (results) {
                                callback(false);
                            },
                            function (err) {
                                callback(true); //because we want this test to throw an error. That means item deleted.
                            });
                    },
                    // There was a problem with the delete operation on the database
                    function (err) {
                        callback(false, err);
                    });

                var objectStore = db.transaction([self.objectStoreName], "readwrite").objectStore(self.objectStoreName);

                // Step 2 - go ahead and delete graphic
                var objectStoreDeleteRequest = objectStore.delete(id);

                // Step 3 - We know that the onsuccess will always fire unless something serious goes wrong.
                // So we go ahead and resolve the deferred here.
                objectStoreDeleteRequest.onsuccess = function () {
                    deferred.resolve(true);
                };

                objectStoreDeleteRequest.onerror = function (msg) {
                    deferred.reject({success: false, error: msg});
                };

            },
            // If there is an error in editExists()
            function (err) {
                callback(false);
            });
        });
    };

    /**
     * Full database reset.
     * CAUTION! If some edits weren't successfully sent, then their record
     * will still exist in the database. If you use this function you
     * will also delete those records.
     * @param callback boolean
     */
    this.resetEditsQueue = function (callback) {
        console.assert(this._db !== null, "indexeddb not initialized");

        var request = this._db.transaction([this.objectStoreName], "readwrite")
            .objectStore(this.objectStoreName)
            .clear();
        request.onsuccess = function (event) {
            setTimeout(function () {
                callback(true);
            }, 0);
        };
        request.onerror = function (err) {
            callback(false, err);
        };
    };

    this.pendingEditsCount = function (callback) {
        console.assert(this._db !== null, "indexeddb not initialized");

        var count = 0;
        var id = this.FEATURE_LAYER_JSON_ID;
        var fCollectionId = this.FEATURE_COLLECTION_ID;
        var phantomGraphicPrefix = this.PHANTOM_GRAPHIC_PREFIX;

        var transaction = this._db.transaction([this.objectStoreName], "readwrite");
        var objectStore = transaction.objectStore(this.objectStoreName);
        objectStore.openCursor().onsuccess = function (evt) {
            var cursor = evt.target.result;

            // IMPORTANT:
            // Remember that we have feature layer JSON and Phantom Graphics in the same database
            if (cursor && cursor.value && cursor.value.id && cursor.value.id.indexOf(phantomGraphicPrefix) == -1) {
                if (cursor.value.id !== id && cursor.value.id !== fCollectionId) {
                    count++;
                }
                cursor.continue();
            }
            else {
                callback(count);
            }
        };
    };

    /**
     * Verify is an edit already exists in the database. Checks the objectId.
     * @param id
     * @returns {deferred} {success: boolean, error: message}
     * @private
     */
    this.editExists = function (id) {

        var db = this._db;
        var deferred = null;
        var self = this;

        require(["dojo/Deferred"], function (Deferred) {
            deferred = new Deferred();

            var objectStore = db.transaction([self.objectStoreName], "readwrite").objectStore(self.objectStoreName);

            //Get the entry associated with the graphic
            var objectStoreGraphicRequest = objectStore.get(id);

            objectStoreGraphicRequest.onsuccess = function () {
                var graphic = objectStoreGraphicRequest.result;
                if (graphic && (graphic.id == id)) {
                    deferred.resolve({success: true, error: null});
                }
                else {
                    deferred.reject({success: false, error: "objectId is not a match."});
                }
            };

            objectStoreGraphicRequest.onerror = function (msg) {
                deferred.reject({success: false, error: msg});
            };
        });

        //We return a deferred object so that when calling this function you can chain it with a then() statement.
        return deferred;
    };

    /**
     * Returns the approximate size of the database in bytes
     * IMPORTANT: Currently requires all data be serialized!
     * @param callback  callback({usage}, error) Whereas, the usage Object is {sizeBytes: number, editCount: number}
     */
    this.getUsage = function (callback) {
        console.assert(this._db !== null, "indexeddb not initialized");

        var id = this.FEATURE_LAYER_JSON_ID;
        var fCollectionId = this.FEATURE_COLLECTION_ID;
        var phantomGraphicPrefix = this.PHANTOM_GRAPHIC_PREFIX;

        var usage = {sizeBytes: 0, editCount: 0};

        var transaction = this._db.transaction([this.objectStoreName])
            .objectStore(this.objectStoreName)
            .openCursor();

        console.log("dumping keys");

        transaction.onsuccess = function (event) {
            var cursor = event.target.result;
            if (cursor && cursor.value && cursor.value.id) {
                var storedObject = cursor.value;
                var json = JSON.stringify(storedObject);
                usage.sizeBytes += json.length;

                if (cursor.value.id.indexOf(phantomGraphicPrefix) == -1 && cursor.value.id !== id && cursor.value.id !== fCollectionId) {
                    usage.editCount += 1;
                }

                cursor.continue();
            }
            else {
                callback(usage, null);
            }
        };
        transaction.onerror = function (err) {
            callback(null, err);
        };
    };

    //
    // internal methods
    //

    /**
     * The library automatically keeps a copy of the featureLayerCollection and its
     * associated layer.url.
     *
     * There should be only one featureLayerCollection Object per feature layer.
     * @param featureCollectionObject
     * @param callback
     * @private
     */
    this._pushFeatureCollections = function(featureCollectionObject, callback){
        var transaction = this._db.transaction([this.objectStoreName], "readwrite");

        transaction.oncomplete = function (event) {
            callback(true);
        };

        transaction.onerror = function (event) {
            callback(false, event.target.error.message);
        };

        var objectStore = transaction.objectStore(this.objectStoreName);
        objectStore.put(featureCollectionObject);
    };

    this._getFeatureCollections = function(callback){
        var objectStore = this._db.transaction([this.objectStoreName], "readonly").objectStore(this.objectStoreName);

        //Get the entry associated with the graphic
        var objectStoreGraphicRequest = objectStore.get(this.FEATURE_COLLECTION_ID);

        objectStoreGraphicRequest.onsuccess = function () {
            var object = objectStoreGraphicRequest.result;
            if (typeof object != "undefined") {
                callback(true, object);
            }
            else {
                callback(false, null);
            }
        };

        objectStoreGraphicRequest.onerror = function (msg) {
            callback(false, msg);
        };
    };

    this.init = function (callback) {
        console.log("init editsStore.js");

        var request = indexedDB.open(this.dbName, 11);
        callback = callback || function (success) {
            console.log("EditsStore::init() success:", success);
        }.bind(this);

        request.onerror = function (event) {
            console.log("indexedDB error: " + event.target.errorCode);
            callback(false, event.target.errorCode);
        }.bind(this);

        request.onupgradeneeded = function (event) {
            var db = event.target.result;

            if (db.objectStoreNames.contains(this.objectStoreName)) {
                db.deleteObjectStore(this.objectStoreName);
            }

            db.createObjectStore(this.objectStoreName, {keyPath: "id"});
        }.bind(this);

        request.onsuccess = function (event) {
            this._db = event.target.result;
            this._isDBInit = true;
            console.log("database opened successfully");
            callback(true, null);
        }.bind(this);
    };
};


