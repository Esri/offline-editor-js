/*! esri-offline-maps - v3.7.0 - 2016-11-01
*   Copyright (c) 2016 Environmental Systems Research Institute, Inc.
*   Apache License*/
// Configure offline/online detection
// Requires: http://github.hubspot.com/offline/docs/welcome/

Offline.options = { // jshint ignore:line
    checks: {
        image: {
            url: function() {
                return 'http://esri.github.io/offline-editor-js/tiny-image.png?_=' + (Math.floor(Math.random() * 1000000000));
            }
        },
        active: 'image'
    }
};
/*jshint -W030 */
/**
 * This library is optimized for Partial Offline Support ONLY
 */
define([
        "dojo/Evented",
        "dojo/_base/Deferred",
        "dojo/promise/all",
        "dojo/_base/declare",
        "dojo/_base/array",
        "dojo/dom-attr",
        "dojo/dom-style",
        "dojo/query",
        "dojo/on",
        "esri/config",
        "esri/layers/GraphicsLayer",
        "esri/layers/FeatureLayer",
        "esri/graphic"],
    function (Evented, Deferred, all, declare, array, domAttr, domStyle, query, on,
              esriConfig, GraphicsLayer, FeatureLayer, Graphic) {
        "use strict";
        return declare("O.esri.Edit.OfflineEditBasic", [Evented],
            {
                _onlineStatus: "online",
                _featureLayers: {},
                _editStore: new O.esri.Edit.EditStorePOLS(),
                _defaultXhrTimeout: 15000,      // ms
                _autoOfflineDetect: true,
                _esriFieldTypeOID: "",          // Determines the correct casing for objectid. Some feature layers use different casing

                ONLINE: "online",				// all edits will directly go to the server
                OFFLINE: "offline",             // edits will be enqueued
                RECONNECTING: "reconnecting",   // sending stored edits to the server
                proxyPath: null,                // by default we use CORS and therefore proxyPath is null

                // Database properties
                DB_NAME: "features_store",      // Sets the database name.
                DB_OBJECTSTORE_NAME: "features",// Represents an object store that allows access to a set of data in the IndexedDB database
                DB_UID: "objectid",        // Set this based on the unique identifier is set up in the feature service

                // manager emits event when...
                events: {
                    EDITS_SENT: "edits-sent",           // ...whenever any edit is actually sent to the server
                    EDITS_ENQUEUED: "edits-enqueued",   // ...when an edit is enqueued (and not sent to the server)
                    EDITS_ENQUEUED_ERROR: "edits-enqueued-error", // ...when there is an error during the queing process
                },

                constructor: function(options){
                    if(options && options.hasOwnProperty("autoDetect")){
                        this._autoOfflineDetect = options.autoDetect;
                    }
                },

                /**
                 * Overrides a feature layer. Call this AFTER the FeatureLayer's 'update-end' event.
                 * objects such as [esri.Graphic] will need to be serialized or you will get an IndexedDB error.
                 * @param layer
                 * @param updateEndEvent The FeatureLayer's update-end event object
                 * @param callback {true, null} or {false, errorString} Traps whether or not the database initialized
                 * @returns deferred
                 */
                extend: function (layer, callback) {

                    var extendPromises = []; // deferred promises related to initializing this method

                    var self = this;
                    layer.offlineExtended = true; // to identify layer has been extended

                    if(!layer.loaded || layer._url === null) {
                        console.error("Make sure to initialize OfflineEditBasic after layer loaded and feature layer update-end event.");
                    }

                    // NOTE: At v2.6.1 we've discovered that not all feature layers support objectIdField.
                    // However, to try to be consistent here with how the library is managing Ids
                    // we force the layer.objectIdField to DB_UID. This should be consistent with
                    // how esri.Graphics assign a unique ID to a graphic. If it is not, then this
                    // library will break and we'll have to re-architect how it manages UIDs.
                    layer.objectIdField = this.DB_UID;

                    // NOTE: set the casing for the feature layers objectid.
                    for(var i = 0; i < layer.fields.length; i++){
                        if(layer.fields[i].type === "esriFieldTypeOID"){
                            this._esriFieldTypeOID = layer.fields[i].name;
                            break;
                        }
                    }

                    var url = null;

                    // There have been reproducible use cases showing when a browser is restarted offline that
                    // for some reason the layer.url may be undefined.
                    // This is an attempt to minimize the possibility of that situation causing errors.
                    if(layer.url) {
                        url = layer.url;
                        // we keep track of the FeatureLayer object
                        this._featureLayers[layer.url] = layer;
                    }

                    // Initialize the database as well as set offline data.
                    if(!this._editStore._isDBInit) {
                        extendPromises.push(this._initializeDB(url));
                    }

                    // replace the applyEdits() method
                    layer._applyEdits = layer.applyEdits;

                    /**
                     * Overrides the ArcGIS API for JavaSccript applyEdits() method.
                     * @param adds Creates a new edit entry.
                     * @param updates Updates an existing entry.
                     * @param deletes Deletes an existing entry.
                     * @param callback Called when the operation is complete.
                     * @param errback  An error object is returned if an error occurs
                     * @returns {*} deferred
                     * @event EDITS_ENQUEUED boolean if all edits successfully stored while offline
                     * @event EDITS_ENQUEUED_ERROR string message if there was an error while storing an edit while offline
                     */
                    layer.applyEdits = function (adds, updates, deletes, callback, errback) {
                        // inside this method, 'this' will be the FeatureLayer
                        // and 'self' will be the offlineFeatureLayer object
                        var promises = [];

                        if (self.getOnlineStatus() === self.ONLINE) {
                            var def = layer._applyEdits(adds, updates, deletes,
                                function () {
                                    self.emit(self.events.EDITS_SENT, arguments);
                                    callback && callback.apply(this, arguments);
                                },
                                errback);
                            return def;
                        }

                        var deferred1 = new Deferred();
                        var results = {addResults: [], updateResults: [], deleteResults: []};
                        var updatesMap = {};

                        var _adds = adds || [];
                        _adds.forEach(function (addEdit) {
                            var deferred = new Deferred();

                            var objectId = this._getNextTempId();

                            addEdit.attributes[this.objectIdField] = objectId;

                            var thisLayer = this;

                            // We need to run some validation tests against each feature being added.
                            // Adding the same feature multiple times results in the last edit wins. LIFO.
                            this._validateFeature(addEdit,this.url,self._editStore.ADD).then(function(result){
                                console.log("EDIT ADD IS BACK!!! " );

                                if(result.success){
                                    thisLayer._pushValidatedAddFeatureToDB(thisLayer,addEdit,result.operation,results,objectId,deferred);
                                }
                                else{
                                    // If we get here then we deleted an edit that was added offline.
                                    deferred.resolve(true);
                                }

                            },function(error){
                                console.log("_validateFeature: Unable to validate!");
                                deferred.reject(error);
                            });

                            promises.push(deferred);
                        }, this);

                        updates = updates || [];
                        updates.forEach(function (updateEdit) {
                            var deferred = new Deferred();

                            var objectId = updateEdit.attributes[this.objectIdField];
                            updatesMap[objectId] = updateEdit;

                            var thisLayer = this;

                            // We need to run some validation tests against each feature being updated.
                            // If we have added a feature and we need to update it then we change it's operation type to "add"
                            // and the last edits wins. LIFO.
                            this._validateFeature(updateEdit,this.url,self._editStore.UPDATE).then(function(result){
                                console.log("EDIT UPDATE IS BACK!!! " );

                                if(result.success){
                                    thisLayer._pushValidatedUpdateFeatureToDB(thisLayer,updateEdit,result.operation,results,objectId,deferred);
                                }
                                else{
                                    // If we get here then we deleted an edit that was added offline.
                                    deferred.resolve(true);
                                }

                            },function(error){
                                console.log("_validateFeature: Unable to validate!");
                                deferred.reject(error);
                            });

                            promises.push(deferred);
                        }, this);

                        deletes = deletes || [];
                        deletes.forEach(function (deleteEdit) {
                            var deferred = new Deferred();

                            var objectId = deleteEdit.attributes[this.objectIdField];

                            var thisLayer = this;

                            // We need to run some validation tests against each feature being deleted.
                            // If we have added a feature and then deleted it in the app
                            this._validateFeature(deleteEdit,this.url,self._editStore.DELETE).then(function(result){
                                console.log("EDIT DELETE IS BACK!!! " );

                                if(result.success){
                                    thisLayer._pushValidatedDeleteFeatureToDB(thisLayer,deleteEdit,result.operation,results,objectId,deferred);
                                }
                                else{
                                    // If we get here then we deleted an edit that was added offline.
                                    deferred.resolve(true);
                                }

                            },function(error){
                                console.log("_validateFeature: Unable to validate!");
                                deferred.reject(error);
                            });

                            promises.push(deferred);
                        }, this);

                        all(promises).then(function (r) {
                            // Make sure all edits were successful. If not throw an error.
                            var promisesSuccess = true;
                            for (var v = 0; v < r.length; v++) {
                                if (r[v] === false) {
                                    promisesSuccess = false;
                                }
                            }

                            promisesSuccess === true ? self.emit(self.events.EDITS_ENQUEUED, results) : self.emit(self.events.EDITS_ENQUEUED_ERROR, results);
                            this._editHandler(results, _adds, updatesMap, callback, errback, deferred1);
                        }.bind(this));

                        return deferred1;

                    }; // layer.applyEdits()

                    /**
                     * Returns the approximate size of the edits database in bytes
                     * @param callback callback({usage}, error) Whereas, the usage Object is {sizeBytes: number, editCount: number}
                     */
                    layer.getUsage = function(callback){
                        self._editStore.getUsage(function(usage,error){
                            callback(usage,error);
                        });
                    };

                    /**
                     * Full edits database reset.
                     * CAUTION! If some edits weren't successfully sent, then their record
                     * will still exist in the database. If you use this function you
                     * will also delete those records.
                     * @param callback (boolean, error)
                     */
                    layer.resetDatabase = function(callback){
                        self._editStore.resetEditsQueue(function(result,error){
                            callback(result,error);
                        });
                    };

                    /**
                     * Returns the number of edits pending in the database.
                     * @param callback callback( int )
                     */
                    layer.pendingEditsCount = function(callback){
                        self._editStore.pendingEditsCount(function(count){
                            callback(count);
                        });
                    };

                    /**
                     * Create a featureDefinition
                     * @param featureLayer
                     * @param featuresArr
                     * @param geometryType
                     * @param callback
                     */
                    layer.getFeatureDefinition = function (/* Object */ featureLayer, /* Array */ featuresArr, /* String */ geometryType, callback) {

                        var featureDefinition = {
                            "layerDefinition": featureLayer,
                            "featureSet": {
                                "features": featuresArr,
                                "geometryType": geometryType
                            }

                        };

                        callback(featureDefinition);
                    };

                    /**
                     * Returns an iterable array of all edits stored in the database
                     * Each item in the array is an object and contains:
                     * {
                     *    id: "internal ID",
                     *    operation: "add, update or delete",
                     *    layer: "layerURL",
                     *    type: "esri Geometry Type",
                     *    graphic: "esri.Graphic converted to JSON then serialized"
                     * }
                     * @param callback (true, array) or (false, errorString)
                     */
                    layer.getAllEditsArray = function(callback){
                        self._editStore.getAllEditsArray(function(array,message){
                            if(message == "end"){
                                callback(true,array);
                            }
                            else{
                                callback(false,message);
                            }
                        });
                    };

                    /* internal methods */

                    /**
                     * Pushes a DELETE request to the database after it's been validated
                     * @param layer
                     * @param deleteEdit
                     * @param operation
                     * @param resultsArray
                     * @param objectId
                     * @param deferred
                     * @private
                     */
                    layer._pushValidatedDeleteFeatureToDB = function(layer,deleteEdit,operation,resultsArray,objectId,deferred){
                        self._editStore.pushEdit(operation, layer.url, deleteEdit, function (result, error) {

                            if(result){
                                resultsArray.deleteResults.push({success: true, error: null, objectId: objectId});

                                // Use the correct key as set by self.DB_UID
                                var tempIdObject = {};
                                tempIdObject[self.DB_UID] = objectId;
                            }
                            else{
                                resultsArray.deleteResults.push({success: false, error: error, objectId: objectId});
                            }

                            deferred.resolve(result);
                        });
                    };

                    /**
                     * Pushes an UPDATE request to the database after it's been validated
                     * @param layer
                     * @param updateEdit
                     * @param operation
                     * @param resultsArray
                     * @param objectId
                     * @param deferred
                     * @private
                     */
                    layer._pushValidatedUpdateFeatureToDB = function(layer,updateEdit,operation,resultsArray,objectId,deferred){
                        self._editStore.pushEdit(operation, layer.url, updateEdit, function (result, error) {

                            if(result){
                                resultsArray.updateResults.push({success: true, error: null, objectId: objectId});

                                // Use the correct key as set by self.DB_UID
                                var tempIdObject = {};
                                tempIdObject[self.DB_UID] = objectId;
                            }
                            else{
                                resultsArray.updateResults.push({success: false, error: error, objectId: objectId});
                            }

                            deferred.resolve(result);
                        });
                    };

                    /**
                     * Pushes an ADD request to the database after it's been validated
                     * @param layer
                     * @param addEdit
                     * @param operation
                     * @param resultsArray
                     * @param objectId
                     * @param deferred
                     * @private
                     */
                    layer._pushValidatedAddFeatureToDB = function(layer,addEdit,operation,resultsArray,objectId,deferred){
                        self._editStore.pushEdit(operation, layer.url, addEdit, function (result, error) {
                            if(result){
                                resultsArray.addResults.push({success: true, error: null, objectId: objectId});

                                // Use the correct key as set by self.DB_UID
                                var tempIdObject = {};
                                tempIdObject[self.DB_UID] = objectId;
                            }
                            else{
                                resultsArray.addResults.push({success: false, error: error, objectId: objectId});
                            }

                            deferred.resolve(result);
                        });
                    };

                    /**
                     * Validates duplicate entries. Last edit on same feature can overwite any previous values.
                     * Note: if an edit was already added offline and you delete it then we return success == false
                     * @param graphic esri.Graphic.
                     * @param layerUrl the URL of the feature service
                     * @param operation add, update or delete action on an edit
                     * @returns deferred {success:boolean,graphic:graphic,operation:add|update|delete}
                     * @private
                     */
                    layer._validateFeature = function (graphic,layerUrl,operation) {

                        var deferred = new Deferred();

                        var id = layerUrl + "/" + graphic.attributes[self.DB_UID];

                        self._editStore.getEdit(id,function(success,result){
                            if (success) {
                                switch( operation )
                                {
                                    case self._editStore.ADD:
                                        // Not good - however we'll allow the new ADD to replace/overwrite existing edit
                                        // and pass it through unmodified. Last ADD wins.
                                        deferred.resolve({"success":true,"graphic":graphic,"operation":operation});
                                        break;
                                    case self._editStore.UPDATE:
                                        // If we are doing an update on a feature that has not been added to
                                        // the server yet, then we need to maintain its operation as an ADD
                                        // and not an UPDATE. This avoids the potential for an error if we submit
                                        // an update operation on a feature that has not been added to the
                                        // database yet.
                                        if(result.operation == self._editStore.ADD){
                                            graphic.operation = self._editStore.ADD;
                                            operation = self._editStore.ADD;
                                        }
                                        deferred.resolve({"success":true,"graphic":graphic,"operation":operation});
                                        break;
                                    case self._editStore.DELETE:

                                        var resolved = true;

                                        if(result.operation == self._editStore.ADD){
                                            // If we are deleting a new feature that has not been added to the
                                            // server yet we need to delete it
                                            layer._deleteTemporaryFeature(graphic,function(success, error){
                                                if(!success){
                                                    resolved = false;
                                                    console.log("Unable to delete feature: " + JSON.stringify(error));
                                                }
                                            });
                                        }
                                        deferred.resolve({"success":resolved,"graphic":graphic,"operation":operation});
                                        break;
                                }
                            }
                            else if(result == "Id not found"){
                                // Let's simply pass the graphic back as good-to-go.
                                // No modifications needed because the graphic does not
                                // already exist in the database.
                                deferred.resolve({"success":true,"graphic":graphic,"operation":operation});
                            }
                            else{
                                deferred.reject(graphic);
                            }
                        });

                        return deferred;
                    };

                    /**
                     * Delete a graphic that has been added while offline.
                     * @param graphic
                     * @param callback
                     * @private
                     */
                    layer._deleteTemporaryFeature = function(graphic,callback){
                        self._editStore.delete(layer.url,graphic,function(success,error){
                            callback(success, error);
                        });
                    };

                    layer._getFilesFromForm = function (formNode) {
                        var files = [];
                        var inputNodes = array.filter(formNode.elements, function (node) {
                            return node.type === "file";
                        });
                        inputNodes.forEach(function (inputNode) {
                            files.push.apply(files, inputNode.files);
                        }, this);
                        return files;
                    };
                    
                    layer._getNextTempId = function () {
                        return this._nextTempId--;
                    };

                    // We are currently only passing in a single deferred.
                    all(extendPromises).then(function (r) {

                        if(r[0].success){

                            // we need to identify ADDs before sending them to the server
                            // we assign temporary ids (using negative numbers to distinguish them from real ids)
                            // query the database first to find any existing offline adds, and find the next lowest integer to start with.
                            self._editStore.getNextLowestTempId(layer, function(value, status){
                                if(status === "success"){
                                    layer._nextTempId = value;
                                }
                                else{
                                    console.log("Set _nextTempId not found: " + value + ", resetting to -1");
                                    layer._nextTempId = -1;
                                }
                            });

                            if(self._autoOfflineDetect){
                                Offline.on('up', function(){ // jshint ignore:line

                                    self.goOnline(function(success,error){ // jshint ignore:line
                                        console.log("GOING ONLINE");
                                    });
                                });

                                Offline.on('down', function(){ // jshint ignore:line
                                    self.goOffline(); // jshint ignore:line
                                });
                            }

                            callback(true, null);
                        }
                        else {
                            callback(false, r[0].error);
                        }
                    });

                }, // extend

                /**
                 * Forces library into an offline state. Any edits applied during this condition will be stored locally
                 */
                goOffline: function () {
                    console.log("offlineFeatureManager going offline");
                    this._onlineStatus = this.OFFLINE;
                },

                /**
                 * Forces library to return to an online state. If there are pending edits,
                 * an attempt will be made to sync them with the remote feature server
                 * @param callback callback( boolean, errors )
                 */
                goOnline: function (callback) {
                    console.log("OfflineEditBasic going online");
                    this._onlineStatus = this.RECONNECTING;
                    this._replayStoredEdits(function (success, responses) {
                        //var result = {success: success, responses: responses};
                        this._onlineStatus = this.ONLINE;

                        //this._onlineStatus = this.ONLINE;
                        callback && callback(success,responses);

                    }.bind(this));
                },

                /**
                 * Determines if offline or online condition exists
                 * @returns {string} ONLINE or OFFLINE
                 */
                getOnlineStatus: function () {
                    return this._onlineStatus;
                },

                /* internal methods */

                /**
                 * Initialize the database and push featureLayer JSON to DB if required.
                 * @param url Feature Layer's url. This is used by this library for internal feature identification.
                 * @return deferred
                 * @private
                 */
                _initializeDB: function(url){
                    var deferred = new Deferred();

                    var editStore = this._editStore;

                    // Configure the database
                    editStore.dbName = this.DB_NAME;
                    editStore.objectStoreName = this.DB_OBJECTSTORE_NAME;
                    editStore.objectId = this.DB_UID;

                    // Attempt to initialize the database
                    editStore.init(function (result, error) {

                        if(result){
                            deferred.resolve({success:true, error: null});
                        }
                        else{
                            deferred.reject({success:false, error: null});
                        }
                    });

                    return deferred;
                },

                //
                // methods to send features back to the server
                //

                /**
                 * Attempts to send any edits in the database. Monitor events for success or failure.
                 * @param callback
                 * @event ALL_EDITS_SENT when all edits have been successfully sent. Contains {[addResults],[updateResults],[deleteResults]}
                 * @event EDITS_SENT_ERROR some edits were not sent successfully. Contains {msg: error}
                 * @private
                 */
                _replayStoredEdits: function (callback) {
                    var promises = {};
                    var that = this;

                    //
                    // send edits for each of the layers
                    //
                    var layer;
                    var adds = [], updates = [], deletes = [];
                    var tempObjectIds = [];
                    var tempArray = [];
                    var featureLayers = this._featureLayers;

                    var editStore = this._editStore;

                    this._editStore.getAllEditsArray(function (result, err) {
                        if (result.length > 0) {
                            tempArray = result;

                            var length = tempArray.length;

                            for (var n = 0; n < length; n++) {
                                layer = featureLayers[tempArray[n].layer];
                                layer.__onEditsComplete = layer.onEditsComplete;
                                layer.onEditsComplete = function () {
                                    console.log("intercepting events onEditsComplete");
                                };

                                // Let's zero everything out
                                adds = [], updates = [], deletes = [], tempObjectIds = [];

                                // IMPORTANT: reconstitute the graphic JSON into an actual esri.Graphic object
                                // NOTE: we are only sending one Graphic per loop!
                                var graphic = new Graphic(tempArray[n].graphic);

                                switch (tempArray[n].operation) {
                                    case editStore.ADD:
                                        for (var i = 0; i < layer.graphics.length; i++) {
                                            var g = layer.graphics[i];
                                            if (g.attributes[layer.objectIdField] === graphic.attributes[layer.objectIdField]) {
                                                layer.remove(g);
                                                break;
                                            }
                                        }
                                        tempObjectIds.push(graphic.attributes[layer.objectIdField]);
                                        delete graphic.attributes[layer.objectIdField];
                                        adds.push(graphic);
                                        break;
                                    case editStore.UPDATE:
                                        updates.push(graphic);
                                        break;
                                    case editStore.DELETE:
                                        deletes.push(graphic);
                                        break;
                                }

                                // Note: when the feature layer is created with a feature collection we have to handle applyEdits() differently
                                // TO-DO rename this method.
                                promises[n] = that._internalApplyEditsAll(layer, tempArray[n].id, tempObjectIds, adds, updates, deletes);
                            }

                            // wait for all requests to finish
                            // responses contain {id,layer,tempId,addResults,updateResults,deleteResults}
                            var allPromises = all(promises);
                            allPromises.then(
                                function (responses) {
                                    console.log("OfflineEditBasic sync - all responses are back");
                                    callback(true, responses);
                                },
                                function (errors) {
                                    console.log("OfflineEditBasic._replayStoredEdits - ERROR!!");
                                    callback(false, errors);
                                }
                            );

                        }
                        else{
                            // No edits were found
                            callback(true,[]);
                        }
                    });
                },

                /**
                 * DEPRECATED as of v2.11 -
                 * TO-DO remove in next release
                 * Only delete items from database that were verified as successfully updated on the server.
                 * @param responses Object
                 * @param callback callback(true, responses) or callback(false, responses)
                 * @private
                 */
                _cleanSuccessfulEditsDatabaseRecords: function (responses, callback) {
                    if (Object.keys(responses).length !== 0) {

                        var editsArray = [];
                        var editsFailedArray = [];

                        for (var key in responses) {
                            if (responses.hasOwnProperty(key)) {

                                var edit = responses[key];
                                var tempResult = {};

                                if (edit.updateResults.length > 0) {
                                    if (edit.updateResults[0].success) {
                                        tempResult.layer = edit.layer;
                                        tempResult.id = edit.updateResults[0].objectId;
                                        editsArray.push(tempResult);
                                    }
                                    else {
                                        editsFailedArray.push(edit);
                                    }
                                }
                                if (edit.deleteResults.length > 0) {
                                    if (edit.deleteResults[0].success) {
                                        tempResult.layer = edit.layer;
                                        tempResult.id = edit.deleteResults[0].objectId;
                                        editsArray.push(tempResult);
                                    }
                                    else {
                                        editsFailedArray.push(edit);
                                    }
                                }
                                if (edit.addResults.length > 0) {
                                    if (edit.addResults[0].success) {
                                        tempResult.layer = edit.layer;
                                        tempResult.id = edit.tempId;
                                        editsArray.push(tempResult);
                                    }
                                    else {
                                        editsFailedArray.push(edit);
                                    }
                                }
                            }
                        }

                        var promises = {};
                        var length = editsArray.length;
                        for (var i = 0; i < length; i++) {
                            promises[i] = this._updateDatabase(editsArray[i]);
                        }
                        //console.log("EDIT LIST " + JSON.stringify(editsArray));

                        // wait for all requests to finish
                        //
                        var allPromises = all(promises);
                        allPromises.then(
                            function (responses) {
                                editsFailedArray.length > 0 ? callback(false, responses) : callback(true, responses);
                            },
                            function (errors) {
                                callback(false, errors);
                            }
                        );
                    }
                    else {
                        callback(true, {});
                    }
                },

                /**
                 * Deletes edits from database.
                 * @param edit
                 * @returns {l.Deferred.promise|*|c.promise|q.promise|promise}
                 * @private
                 */
                _updateDatabase: function (edit) {
                    var dfd = new Deferred();
                    var fakeGraphic = {};
                    fakeGraphic.attributes = {};

                    // Use the correct attributes key!
                    fakeGraphic.attributes[this.DB_UID] = edit.id;

                    this._editStore.delete(edit.layer, fakeGraphic, function (success, error) {
                        if (success) {
                            dfd.resolve({success: true, error: null});
                        }
                        else {
                            dfd.reject({success: false, error: error});
                        }
                    }.bind(this));

                    return dfd.promise;

                },

                /**
                 * Applies edits. This works with both standard feature layers and when a feature layer is created
                 * using a feature collection.
                 *
                 * This works around specific behaviors in esri.layers.FeatureLayer when using the pattern
                 * new FeatureLayer(featureCollectionObject).
                 *
                 * Details on the specific behaviors can be found here:
                 * https://developers.arcgis.com/javascript/jsapi/featurelayer-amd.html#featurelayer2
                 *
                 * @param layer
                 * @param id
                 * @param tempObjectIds
                 * @param adds
                 * @param updates
                 * @param deletes
                 * @returns {*|r}
                 * @private
                 */
                _internalApplyEditsAll: function (layer, id, tempObjectIds, adds, updates, deletes) {
                    var that = this;
                    var dfd = new Deferred();

                    this._makeEditRequest(layer, adds, updates, deletes,
                        function (addResults, updateResults, deleteResults) {

                            // addResults present a special case for handling objectid
                            if(addResults.length > 0) {

                                var objectid = "";

                                if(addResults[0].hasOwnProperty("objectid")){
                                    objectid = "objectid";
                                }

                                if(addResults[0].hasOwnProperty("objectId")){
                                    objectid = "objectId";
                                }

                                if(addResults[0].hasOwnProperty("OBJECTID")){
                                    objectid = "OBJECTID";
                                }

                                // ??? These are the most common objectid values. I may have missed some!

                                // Some feature layers will return different casing such as: 'objectid', 'objectId' and 'OBJECTID'
                                // Normalize these values to the feature type OID so that we don't break other aspects
                                // of the JS API.
                                adds[0].attributes[that._esriFieldTypeOID] = addResults[0][objectid];
                                var graphic = new Graphic(adds[0].geometry,null,adds[0].attributes);
                                layer.add(graphic);
                            }

                            that._cleanDatabase(layer, tempObjectIds, addResults, updateResults, deleteResults).then(function(results){
                                dfd.resolve({
                                    id: id,
                                    layer: layer.url,
                                    tempId: tempObjectIds, // let's us internally match an ADD to it's new ObjectId
                                    addResults: addResults,
                                    updateResults: updateResults,
                                    deleteResults: deleteResults,
                                    databaseResults: results,
                                    databaseErrors: null,
                                    syncError: null
                                });
                            }, function(error) {
                                dfd.resolve({
                                    id: id,
                                    layer: layer.url,
                                    tempId: tempObjectIds, // let's us internally match an ADD to it's new ObjectId
                                    addResults: addResults,
                                    updateResults: updateResults,
                                    deleteResults: deleteResults,
                                    databaseResults: null,
                                    databaseErrors: error,
                                    syncError: error
                                });
                            });

                        },
                        function (error) {
                            layer.onEditsComplete = layer.__onEditsComplete;
                            delete layer.__onEditsComplete;

                            dfd.reject(error);
                        }
                    );
                    return dfd.promise;
                },

                _cleanDatabase: function(layer, tempId, addResults, updateResults, deleteResults) {

                    var dfd = new Deferred();
                    var id = null;

                    if (updateResults.length > 0) {
                        if (updateResults[0].success) {
                            id = updateResults[0].objectId;
                        }
                    }
                    if (deleteResults.length > 0) {
                        if (deleteResults[0].success) {
                            id = deleteResults[0].objectId;
                        }
                    }
                    if (addResults.length > 0) {
                        if (addResults[0].success) {
                            id = tempId;
                        }
                    }

                    var fakeGraphic = {};
                    fakeGraphic.attributes = {};

                    // Use the correct attributes key!
                    fakeGraphic.attributes[this.DB_UID] = id;

                    // Delete the edit from the database
                    this._editStore.delete(layer.url, fakeGraphic, function (success, error) {
                        if (success) {
                            dfd.resolve({success: true, error: null, id: id});
                        }
                        else {
                            dfd.reject({success: false, error: error, id: id});
                        }
                    });

                    return dfd.promise;
                },

                /**
                 * Used when a feature layer is created with a feature collection.
                 *
                 * In the current version of the ArcGIS JSAPI 3.12+ the applyEdit() method doesn't send requests
                 * to the server when a feature layer is created with a feature collection.
                 *
                 * The use case for using this is: clean start app > go offline and make edits > offline restart browser >
                 * go online.
                 *
                 * @param layer
                 * @param adds
                 * @param updates
                 * @param deletes
                 * @returns {*|r}
                 * @private
                 */
                _makeEditRequest: function(layer,adds, updates, deletes, callback, errback) {

                    var f = "f=json", a = "", u = "", d = "";

                    if(adds.length > 0) {
                        array.forEach(adds, function(add){
                            if(add.hasOwnProperty("infoTemplate")){ // if the add has an infoTemplate attached,
                                delete add.infoTemplate; // delete it to reduce payload size.
                            }
                        }, this);
                        a = "&adds=" + encodeURIComponent(JSON.stringify(adds));
                    }
                    if(updates.length > 0) {
                        array.forEach(updates, function(update){
                            if(update.hasOwnProperty("infoTemplate")){ // if the update has an infoTemplate attached,
                                delete update.infoTemplate; // delete it to reduce payload size.
                            }
                        }, this);
                        u = "&updates=" + encodeURIComponent(JSON.stringify(updates));
                    }
                    if(deletes.length > 0) {
                        var id = deletes[0].attributes[this.DB_UID];
                        d = "&deletes=" + id;
                    }

                    var params = f + a + u + d;

                    if(layer.hasOwnProperty("credential") && layer.credential){
                        if(layer.credential.hasOwnProperty("token") && layer.credential.token){
                            params = params + "&token=" + layer.credential.token;
                        }
                    }

                    // Respect the proxyPath if one has been set (Added at v3.2.0)
                    var url = this.proxyPath ? this.proxyPath + "?" + layer.url : layer.url;

                    var req = new XMLHttpRequest();
                    req.open("POST", url + "/applyEdits", true);
                    req.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
                    req.onload = function()
                    {
                        if( req.status === 200 && req.responseText !== "")
                        {
                            try {
                                // var b = this.responseText.replace(/"/g, "'"); // jshint ignore:line
                                var obj = JSON.parse(this.responseText);
                                callback(obj.addResults, obj.updateResults, obj.deleteResults);
                            }
                            catch(err) {
                                console.error("FAILED TO PARSE EDIT REQUEST RESPONSE:", req);
                                errback("Unable to parse xhr response", req);
                            }
                        }

                    };
                    req.onerror = function(e)
                    {
                        console.error("_makeEditRequest failed: " + e);
                        errback(e);
                    };
                    req.ontimeout = function() {
                        errback("xhr timeout error");
                    };
                    req.timeout = this._defaultXhrTimeout;
                    req.send(params);
                },

                /**
                 * Parses the respones related to going back online and cleaning up the database.
                 * @param responses
                 * @returns {promise} True means all was successful. False indicates there was a problem.
                 * @private
                 */
                _parseResponsesArray: function(responses,callback) {

                    var err = 0;

                    for (var key in responses) {
                        if (responses.hasOwnProperty(key)) {
                            responses[key].addResults.forEach(function(result){
                                if(!result.success) {
                                    err++;
                                }
                            });

                            responses[key].updateResults.forEach(function(result){
                                if(!result.success) {
                                    err++;
                                }
                            });

                            responses[key].deleteResults.forEach(function(result){
                                if(!result.success) {
                                    err++;
                                }
                            });
                        }
                    }

                    if(err > 0){
                        callback(false);
                    }
                    else {
                        callback(true);
                    }
                }
            }); // declare
    }); // define
/**
 * Creates a namespace for the non-AMD libraries in this directory
 */
/*jshint -W020 */
if(typeof O != "undefined"){
    O.esri.Edit = {};
}
else{
    O = {};
    O.esri = {
        Edit: {}
    };
}
/*global indexedDB */
/*jshint -W030 */
/**
 * This library is optimized for Partial Offline Support ONLY
 * @constructor
 */
O.esri.Edit.EditStorePOLS = function () {

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
     * Returns all the edits as a single Array via the callback
     * @param callback {array, messageString} or {null, messageString}
     */
    this.getAllEditsArray = function (callback) {

        console.assert(this._db !== null, "indexeddb not initialized");
        var editsArray = [];

        if (this._db !== null) {

            var fLayerJSONId = this.FEATURE_LAYER_JSON_ID;
            var fCollectionId = this.FEATURE_COLLECTION_ID;

            var transaction = this._db.transaction([this.objectStoreName])
                .objectStore(this.objectStoreName)
                .openCursor();

            transaction.onsuccess = function (event) {
                var cursor = event.target.result;
                if (cursor && cursor.value && cursor.value.id) {

                    // Make sure we are not return FeatureLayer JSON data
                    if (cursor.value.id !== fLayerJSONId && cursor.value.id !== fCollectionId) {
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

            var transaction = this._db.transaction([this.objectStoreName])
                .objectStore(this.objectStoreName)
                .openCursor();

            transaction.onsuccess = function (event) {
                var cursor = event.target.result;
                if (cursor && cursor.value && cursor.value.id) {
                    // Make sure we are not return FeatureLayer JSON data or a Phantom Graphic
                    if (cursor.value.id !== fLayerJSONId && cursor.value.id !== fCollectionId) {
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
                        callback(lowestTempId-1, "success"); // and we'll start with one less than tat.
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
                    callback(false, err);
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

        var transaction = this._db.transaction([this.objectStoreName], "readwrite");
        var objectStore = transaction.objectStore(this.objectStoreName);
        objectStore.openCursor().onsuccess = function (evt) {
            var cursor = evt.target.result;
            if (cursor && cursor.value && cursor.value.id) {
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

                if (cursor.value.id !== id && cursor.value.id !== fCollectionId) {
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


