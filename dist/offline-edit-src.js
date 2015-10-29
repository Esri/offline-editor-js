/*! esri-offline-maps - v2.16.0 - 2015-10-29
*   Copyright (c) 2015 Environmental Systems Research Institute, Inc.
*   Apache License*/
/*jshint -W030 */
define([
        "dojo/Evented",
        "dojo/_base/Deferred",
        "dojo/promise/all",
        "dojo/_base/declare",
        "dojo/_base/array",
        "dojo/dom-attr",
        "dojo/dom-style",
        "dojo/query",
        "esri/config",
        "esri/layers/GraphicsLayer",
        "esri/graphic",
        "esri/request",
        "esri/symbols/SimpleMarkerSymbol",
        "esri/symbols/SimpleLineSymbol",
        "esri/symbols/SimpleFillSymbol",
        "esri/urlUtils"],
    function (Evented, Deferred, all, declare, array, domAttr, domStyle, query,
              esriConfig, GraphicsLayer, Graphic, esriRequest, SimpleMarkerSymbol, SimpleLineSymbol, SimpleFillSymbol, urlUtils) {
        "use strict";
        return declare("O.esri.Edit.OfflineFeaturesManager", [Evented],
            {
                _onlineStatus: "online",
                _featureLayers: {},
                _featureCollectionUsageFlag: false, // if a feature collection was used to create the feature layer.
                _editStore: new O.esri.Edit.EditStore(),
                _defaultXhrTimeout: 15000, // ms

                ONLINE: "online",				// all edits will directly go to the server
                OFFLINE: "offline",             // edits will be enqueued
                RECONNECTING: "reconnecting",   // sending stored edits to the server
                attachmentsStore: null,         // indexedDB for storing attachments
                proxyPath: null,                // by default we use CORS and therefore proxyPath is null

                ENABLE_FEATURECOLLECTION: false,    // Set this to true for full offline use if you want to use the
                                                    // getFeatureCollections() pattern of reconstituting a feature layer.

                // Database properties
                DB_NAME: "features_store",      // Sets the database name.
                DB_OBJECTSTORE_NAME: "features",// Represents an object store that allows access to a set of data in the IndexedDB database
                DB_UID: "objectid",        // Set this based on the unique identifier is set up in the feature service

                ATTACHMENTS_DB_NAME: "attachments_store", //Sets attachments database name
                ATTACHMENTS_DB_OBJECTSTORE_NAME: "attachments",
                // NOTE: attachments don't have the same issues as Graphics as related to UIDs (e.g. the need for DB_UID).
                // You can manually create a graphic, but it would be very rare for someone to
                // manually create an attachment. So, we don't provide a public property for
                // the attachments database UID.

                // manager emits event when...
                events: {
                    EDITS_SENT: "edits-sent",           // ...whenever any edit is actually sent to the server
                    EDITS_ENQUEUED: "edits-enqueued",   // ...when an edit is enqueued (and not sent to the server)
                    EDITS_ENQUEUED_ERROR: "edits-enqueued-error", // ...when there is an error during the queing process
                    EDITS_SENT_ERROR: "edits-sent-error",         // ...there was a problem with one or more edits!
                    ALL_EDITS_SENT: "all-edits-sent",   // ...after going online and there are no pending edits in the queue
                    ATTACHMENT_ENQUEUED: "attachment-enqueued",
                    ATTACHMENTS_SENT: "attachments-sent",
                    EXTEND_COMPLETE: "extend-complete"  // ...when the libary has completed its initialization
                },

                /**
                 * Need to call this method only if you want to support offline attachments
                 * it is optional
                 * @param callback(success)
                 * @returns void
                 */
                initAttachments: function (callback) {
                    callback = callback || function (success) {
                        console.log("attachments inited ", success ? "ok" : "failed");
                    };

                    if (!this._checkFileAPIs()) {
                        return callback(false, "File APIs not supported");
                    }

                    try {
                        this.attachmentsStore = new O.esri.Edit.AttachmentsStore();
                        this.attachmentsStore.dbName = this.ATTACHMENTS_DB_NAME;
                        this.attachmentsStore.objectStoreName = this.ATTACHMENTS_DB_OBJECTSTORE_NAME;

                        if (/*false &&*/ this.attachmentsStore.isSupported()) {
                            this.attachmentsStore.init(callback);
                        }
                        else {
                            return callback(false, "indexedDB not supported");
                        }
                    }
                    catch (err) {
                        console.log("problem!  " + err.toString());
                    }
                },

                /**
                 * Overrides a feature layer. Call this AFTER the FeatureLayer's 'update-end' event.
                 * IMPORTANT: If dataStore is specified it will be saved to the database. Any complex
                 * objects such as [esri.Graphic] will need to be serialized or you will get an IndexedDB error.
                 * @param layer
                 * @param updateEndEvent The FeatureLayer's update-end event object
                 * @param callback {true, null} or {false, errorString} Traps whether or not the database initialized
                 * @param dataStore Optional configuration Object. Added @ v2.5. There is only one reserved object key and that is "id".
                 * Use this option to store featureLayerJSON and any other configuration information you'll need access to after
                 * a full offline browser restart.
                 * @returns deferred
                 */
                extend: function (layer, callback, dataStore) {

                    var extendPromises = []; // deferred promises related to initializing this method

                    var self = this;
                    layer.offlineExtended = true; // to identify layer has been extended

                    if(!layer.loaded || layer._url === null) {
                        console.error("Make sure to initialize OfflineFeaturesManager after layer loaded and feature layer update-end event.");
                    }

                    // NOTE: At v2.6.1 we've discovered that not all feature layers support objectIdField.
                    // However, to try to be consistent here with how the library is managing Ids
                    // we force the layer.objectIdField to DB_UID. This should be consistent with
                    // how esri.Graphics assign a unique ID to a graphic. If it is not, then this
                    // library will break and we'll have to re-architect how it manages UIDs.
                    layer.objectIdField = this.DB_UID;

                    var url = null;

                    // There have been reproducible use cases showing when a browser is restarted offline that
                    // for some reason the layer.url may be undefined.
                    // This is an attempt to minimize the possibility of that situation causing errors.
                    if(layer.url) {
                        url = layer.url;
                        // we keep track of the FeatureLayer object
                        this._featureLayers[layer.url] = layer;
                    }

                    // This is a potentially brittle solution to detecting if a feature layer collection
                    // was used to create the feature layer.
                    // Is there a better way??
                    if(layer._mode.featureLayer.hasOwnProperty("_collection")){
                        // This means a feature collection was used to create the feature layer and it will
                        // require different handling when running applyEdit()
                        this._featureCollectionUsageFlag = true;
                    }

                    // Initialize the database as well as set offline data.
                    if(!this._editStore._isDBInit) {
                        extendPromises.push(this._initializeDB(dataStore, url));
                    }

                    // replace the applyEdits() method
                    layer._applyEdits = layer.applyEdits;


                    // attachments
                    layer._addAttachment = layer.addAttachment;
                    layer._queryAttachmentInfos = layer.queryAttachmentInfos;
                    layer._deleteAttachments = layer.deleteAttachments;
                    layer._updateAttachment = layer.updateAttachment;

                    /*
                     operations supported offline:
                     1. add a new attachment to an existing feature (DONE)
                     2. add a new attachment to a new feature (DONE)
                     3. remove an attachment that is already in the server... (DONE)
                     4. remove an attachment that is not in the server yet (DONE)
                     5. update an existing attachment to an existing feature (DONE)
                     6. update a new attachment (DONE)

                     concerns:
                     - manage the relationship between offline features and attachments: what if the user wants to add
                     an attachment to a feature that is still offline? we need to keep track of objectids so that when
                     the feature is sent to the server and receives a final objectid we replace the temporary negative id
                     by its final objectid (DONE)
                     - what if the user deletes an offline feature that had offline attachments? we need to discard the attachment  (DONE)
                     */

                    //
                    // attachments
                    //
                    layer.queryAttachmentInfos = function (objectId, callback, errback) {
                        if (self.getOnlineStatus() === self.ONLINE) {
                            var def = this._queryAttachmentInfos(objectId,
                                function () {
                                    console.log(arguments);
                                    self.emit(self.events.ATTACHMENTS_INFO, arguments);
                                    callback && callback.apply(this, arguments);
                                },
                                errback);
                            return def;
                        }

                        if (!self.attachmentsStore) {
                            console.log("in order to support attachments you need to call initAttachments() method of offlineFeaturesManager");
                            return;
                        }

                        // will only return LOCAL attachments
                        var deferred = new Deferred();
                        self.attachmentsStore.getAttachmentsByFeatureId(this.url, objectId, function (attachments) {
                            callback && callback(attachments);
                            deferred.resolve(attachments);
                        });
                        return deferred;
                    };

                    layer.addAttachment = function (objectId, formNode, callback, errback) {

                        if (self.getOnlineStatus() === self.ONLINE) {
                            return this._addAttachment(objectId, formNode,
                                function () {
                                    console.log(arguments);
                                    self.emit(self.events.ATTACHMENTS_SENT, arguments);
                                    callback && callback.apply(this, arguments);
                                },
                                function (err) {
                                    console.log("addAttachment: " + err);
                                    errback && errback.apply(this, arguments);
                                }
                            );
                        }

                        if (!self.attachmentsStore) {
                            console.error("in order to support attachments you need to call initAttachments() method of offlineFeaturesManager");
                            return;
                        }

                        var files = this._getFilesFromForm(formNode);
                        var file = files[0]; // addAttachment can only add one file, so the rest -if any- are ignored

                        var deferred = new Deferred();
                        var attachmentId = this._getNextTempId();
                        self.attachmentsStore.store(this.url, attachmentId, objectId, file,self.attachmentsStore.TYPE.ADD, function (success, newAttachment) {
                            var returnValue = {attachmentId: attachmentId, objectId: objectId, success: success};
                            if (success) {
                                self.emit(self.events.ATTACHMENT_ENQUEUED, returnValue);
                                callback && callback(returnValue);
                                deferred.resolve(returnValue);

                                // replace the default URL that is set by attachmentEditor with the local file URL
                                var attachmentUrl = this._url.path + "/" + objectId + "/attachments/" + attachmentId;
                                var attachmentElement = query("[href=" + attachmentUrl + "]");
                                attachmentElement.attr("href", newAttachment.url);
                            }
                            else {
                                returnValue.error = "can't store attachment";
                                errback && errback(returnValue);
                                deferred.reject(returnValue);
                            }
                        }.bind(this));

                        return deferred;
                    };

                    layer.updateAttachment = function(objectId, attachmentId, formNode, callback, errback) {
                        if (self.getOnlineStatus() === self.ONLINE) {
                            return this._updateAttachment(objectId, attachmentId, formNode,
                                function () {
                                    callback && callback.apply(this, arguments);
                                },
                                function (err) {
                                    console.log("updateAttachment: " + err);
                                    errback && errback.apply(this, arguments);
                                });
                            //return def;
                        }

                        if (!self.attachmentsStore) {
                            console.error("in order to support attachments you need to call initAttachments() method of offlineFeaturesManager");
                            return;
                        }

                        var files = this._getFilesFromForm(formNode);
                        var file = files[0]; // addAttachment can only add one file, so the rest -if any- are ignored
                        var action = self.attachmentsStore.TYPE.UPDATE; // Is this an ADD or an UPDATE?

                        var deferred = new Deferred();

                        // If the attachment has a temporary ID we want to keep it's action as an ADD.
                        // Otherwise we'll get an error when we try to UPDATE an ObjectId that doesn't exist in ArcGIS Online or Server.
                        if(attachmentId < 0) {
                            action = self.attachmentsStore.TYPE.ADD;
                        }

                        self.attachmentsStore.store(this.url, attachmentId, objectId, file, action, function (success, newAttachment) {
                            var returnValue = {attachmentId: attachmentId, objectId: objectId, success: success};
                            if (success) {
                                self.emit(self.events.ATTACHMENT_ENQUEUED, returnValue);
                                callback && callback(returnValue);
                                deferred.resolve(returnValue);

                                // replace the default URL that is set by attachmentEditor with the local file URL
                                var attachmentUrl = this._url.path + "/" + objectId + "/attachments/" + attachmentId;
                                var attachmentElement = query("[href=" + attachmentUrl + "]");
                                attachmentElement.attr("href", newAttachment.url);
                            }
                            else {
                                returnValue.error = "layer.updateAttachment::attachmentStore can't store attachment";
                                errback && errback(returnValue);
                                deferred.reject(returnValue);
                            }
                        }.bind(this));

                        return deferred;
                    };

                    layer.deleteAttachments = function (objectId, attachmentsIds, callback, errback) {
                        if (self.getOnlineStatus() === self.ONLINE) {
                            var def = this._deleteAttachments(objectId, attachmentsIds,
                                function () {
                                    callback && callback.apply(this, arguments);
                                },
                                function (err) {
                                    console.log("deleteAttachments: " + err);
                                    errback && errback.apply(this, arguments);
                                });
                            return def;
                        }

                        if (!self.attachmentsStore) {
                            console.error("in order to support attachments you need to call initAttachments() method of offlineFeaturesManager");
                            return;
                        }

                        // case 1.- it is a new attachment
                        // case 2.- it is an already existing attachment

                        // asynchronously delete each of the attachments
                        var promises = [];
                        attachmentsIds.forEach(function (attachmentId) {
                            attachmentId = parseInt(attachmentId, 10); // to number

                            var deferred = new Deferred();

                            // IMPORTANT: If attachmentId < 0 then it's a local/new attachment
                            // and we can simply delete it from the attachmentsStore.
                            // However, if the attachmentId > 0 then we need to store the DELETE
                            // so that it can be processed and sync'd correctly during _uploadAttachments().
                            if(attachmentId < 0) {
                                self.attachmentsStore.delete(attachmentId, function (success) {
                                    var result = {objectId: objectId, attachmentId: attachmentId, success: success};
                                    deferred.resolve(result);
                                });
                            }
                            else {
                                var dummyBlob = new Blob([],{type: "image/png"}); //TO-DO just a placeholder. Need to consider add a null check.
                                self.attachmentsStore.store(this.url, attachmentId, objectId, dummyBlob,self.attachmentsStore.TYPE.DELETE, function (success, newAttachment) {
                                    var returnValue = {attachmentId: attachmentId, objectId: objectId, success: success};
                                    if (success) {
                                        deferred.resolve(returnValue);
                                    }
                                    else {
                                        deferred.reject(returnValue);
                                    }
                                }.bind(this));
                            }
                            //console.assert(attachmentId < 0, "we only support deleting local attachments");
                            promises.push(deferred);
                        }, this);

                        // call callback once all deletes have finished
                        // IMPORTANT: This returns an array!!!
                        var allPromises = all(promises);
                        allPromises.then(function (results) {
                            callback && callback(results);
                        });

                        return allPromises;
                    };

                    //
                    // other functions
                    //

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
                            var def = this._applyEdits(adds, updates, deletes,
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
                                    // We also have deleted the phantom graphic.
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
                                    // We also have deleted the phantom graphic.
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
                            // If we have added a feature and then deleted it in the app then we go ahead
                            // and delete it and its phantom graphic from the database.
                            // NOTE: at this time we don't handle attachments automatically
                            this._validateFeature(deleteEdit,this.url,self._editStore.DELETE).then(function(result){
                                console.log("EDIT DELETE IS BACK!!! " );

                                if(result.success){
                                    thisLayer._pushValidatedDeleteFeatureToDB(thisLayer,deleteEdit,result.operation,results,objectId,deferred);
                                }
                                else{
                                    // If we get here then we deleted an edit that was added offline.
                                    // We also have deleted the phantom graphic.
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

                            layer._pushFeatureCollections(function(success){
                                console.log("All edits done");

                                if(success && promisesSuccess){
                                    self.emit(self.events.EDITS_ENQUEUED, results);
                                }
                                else {
                                    if(!success){
                                        console.log("applyEdits() there was a problem with _pushFeatureCollections.");
                                    }
                                    self.emit(self.events.EDITS_ENQUEUED_ERROR, results);
                                }

                                //promisesSuccess === true ? self.emit(self.events.EDITS_ENQUEUED, results) : self.emit(self.events.EDITS_ENQUEUED_ERROR, results);

                                // we already pushed the edits into the database, now we let the FeatureLayer to do the local updating of the layer graphics
                                this._editHandler(results, _adds, updatesMap, callback, errback, deferred1);
                            }.bind(this));

                            //success === true ? self.emit(self.events.EDITS_ENQUEUED, results) : self.emit(self.events.EDITS_ENQUEUED_ERROR, results);
                            // EDITS_ENQUEUED = callback(true, edit), and EDITS_ENQUEUED_ERROR = callback(false, /*String */ error)
                            //this._editHandler(results, _adds, updatesMap, callback, errback, deferred1);
                        }.bind(this));

                        return deferred1;

                    }; // layer.applyEdits()
 
                    /**
                     * Converts an array of graphics/features into JSON
                     * @param features
                     * @param updateEndEvent The layer's 'update-end' event
                     * @param callback
                     */
                    layer.convertGraphicLayerToJSON = function (features, updateEndEvent, callback) {
                        var layerDefinition = {};

                        // We want to be consistent, but we've discovered that not all feature layers have an objectIdField
                        if(updateEndEvent.target.hasOwnProperty("objectIdField"))
                        {
                            layerDefinition.objectIdFieldName = updateEndEvent.target.objectIdField;
                        }else {
                            layerDefinition.objectIdFieldName = this.objectIdField;
                        }

                        layerDefinition.globalIdFieldName = updateEndEvent.target.globalIdField;
                        layerDefinition.geometryType = updateEndEvent.target.geometryType;
                        layerDefinition.spatialReference = updateEndEvent.target.spatialReference;
                        layerDefinition.fields = updateEndEvent.target.fields;

                        var length = features.length;
                        var jsonArray = [];
                        for (var i = 0; i < length; i++) {
                            var jsonGraphic = features[i].toJson();
                            jsonArray.push(jsonGraphic);
                            if (i == (length - 1)) {
                                var featureJSON = JSON.stringify(jsonArray);
                                var layerDefJSON = JSON.stringify(layerDefinition);
                                callback(featureJSON, layerDefJSON);
                                break;
                            }
                        }
                    };

                    /**
                     * Retrieves f=json from the feature layer
                     * @param url FeatureLayer's URL
                     * @param callback
                     * @private
                     */
                    layer.getFeatureLayerJSON = function (url, callback) {
                        require(["esri/request"], function (esriRequest) {
                            var request = esriRequest({
                                url: url,
                                content: {f: "json"},
                                handleAs: "json",
                                callbackParamName: "callback"
                            });

                            request.then(function (response) {
                                console.log("Success: ", response);
                                callback(true, response);
                            }, function (error) {
                                console.log("Error: ", error.message);
                                callback(false, error.message);
                            });
                        });
                    };

                    /**
                     * Sets the optional feature layer storage object
                     * @param jsonObject
                     * @param callback
                     */
                    layer.setFeatureLayerJSONDataStore = function(jsonObject, callback){
                        self._editStore.pushFeatureLayerJSON(jsonObject,function(success,error){
                            callback(success,error);
                        });
                    };

                    /**
                     * Retrieves the optional feature layer storage object
                     * @param callback callback(true, object) || callback(false, error)
                     */
                    layer.getFeatureLayerJSONDataStore = function(callback){
                        self._editStore.getFeatureLayerJSON(function(success,message){
                            callback(success,message);
                        });
                    };

                    /**
                     * Sets the phantom layer with new features.
                     * Used to restore PhantomGraphicsLayer after offline restart
                     * @param graphicsArray an array of Graphics
                     */
                    layer.setPhantomLayerGraphics = function (graphicsArray) {
                        var length = graphicsArray.length;

                        if (length > 0) {
                            for (var i = 0; i < length; i++) {
                                var graphic = new Graphic(graphicsArray[i]);
                                this._phantomLayer.add(graphic);
                            }
                        }
                    };

                    /**
                     * Returns the array of graphics from the phantom graphics layer.
                     * This layer identifies features that have been modified
                     * while offline.
                     * @returns {array}
                     */
                    layer.getPhantomLayerGraphics = function (callback) {
                        //return layer._phantomLayer.graphics;
                        var graphics = layer._phantomLayer.graphics;
                        var length = layer._phantomLayer.graphics.length;
                        var jsonArray = [];
                        for (var i = 0; i < length; i++) {
                            var jsonGraphic = graphics[i].toJson();
                            jsonArray.push(jsonGraphic);
                            if (i == (length - 1)) {
                                var graphicsJSON = JSON.stringify(jsonArray);
                                callback(graphicsJSON);
                                break;
                            }
                        }
                    };

                    /**
                     * Returns an array of phantom graphics from the database.
                     * @param callback callback (true, array) or (false, errorString)
                     */
                    layer.getPhantomGraphicsArray = function(callback){
                        self._editStore.getPhantomGraphicsArray(function(array,message){
                            if(message == "end"){
                                callback(true,array);
                            }
                            else{
                                callback(false,message);
                            }
                        });
                    };

                    /**
                     * Returns the approximate size of the attachments database in bytes
                     * @param callback callback({usage}, error) Whereas, the usage Object is {sizeBytes: number, attachmentCount: number}
                     */
                    layer.getAttachmentsUsage = function(callback) {
                        self.attachmentsStore.getUsage(function(usage,error){
                            callback(usage,error);
                        });
                    };

                    /**
                     * Full attachments database reset.
                     * CAUTION! If some attachments weren't successfully sent, then their record
                     * will still exist in the database. If you use this function you
                     * will also delete those records.
                     * @param callback (boolean, error)
                     */
                    layer.resetAttachmentsDatabase = function(callback){
                        self.attachmentsStore.resetAttachmentsQueue(function(result,error){
                            callback(result,error);
                        });
                    };

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
                     * Automatically creates a set of featureLayerCollections. This is specifically for
                     * use with offline browser restarts. You can retrieve the collections and use them
                     * to reconstitute a featureLayer and then redisplay all the associated features.
                     *
                     * To retrieve use OfflineFeaturesManager.getFeatureCollections().
                     * @param callback (boolean)
                     * @private
                     */
                    layer._pushFeatureCollections = function(callback){

                        // First let's see if any collections exists
                        self._editStore._getFeatureCollections(function(success, result) {

                            var featureCollection =
                            {
                                featureLayerUrl: layer.url,
                                featureLayerCollection: layer.toJson()
                            };

                            // An array of feature collections, of course :-)
                            var featureCollectionsArray = [
                                featureCollection
                            ];

                            // An object for storing multiple feature collections
                            var featureCollectionsObject = {
                                // The id is required because the editsStore keypath
                                // uses it as a UID for all entries in the database
                                id: self._editStore.FEATURE_COLLECTION_ID,
                                featureCollections: featureCollectionsArray
                            };

                            // THIS IS A HACK.
                            // There is a bug in JS API 3.11+ when you create a feature layer from a featureCollectionObject
                            // the hasAttachments property does not get properly repopulated.
                            layer.hasAttachments = featureCollection.featureLayerCollection.layerDefinition.hasAttachments;

                            // If the featureCollectionsObject already exists
                            if(success){
                                var count = 0;
                                for(var i = 0; i < result.featureCollections.length; i++) {

                                    // Update the current feature collection
                                    if(result.featureCollections[i].featureLayerUrl === layer.url) {
                                        count++;
                                        result.featureCollections[i] = featureCollection;
                                    }
                                }

                                // If we have a new feature layer then add it to the featureCollections array
                                if(count === 0) {
                                    result.featureCollections.push(featureCollection);
                                }
                            }
                            // If it does not exist then we need to add a featureCollectionsObject
                            else if(!success && result === null) {
                                result = featureCollectionsObject;
                            }
                            else {
                                console.error("There was a problem retrieving the featureCollections from editStore.");
                            }

                            // Automatically update the featureCollectionsObject in the database with every ADD, UPDATE
                            // and DELETE. It can be retrieved via OfflineFeaturesManager.getFeatureCollections();
                            self._editStore._pushFeatureCollections(result, function(success, error) {
                                if(!success){
                                    console.error("There was a problem creating the featureCollectionObject: " + error);
                                    callback(false);
                                }
                                else {
                                    callback(true);
                                }
                            }.bind(this));
                        });
                    };

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

                                var phantomDelete = new Graphic(
                                    deleteEdit.geometry,
                                    self._getPhantomSymbol(deleteEdit.geometry, self._editStore.DELETE),
                                    tempIdObject
                                );

                                layer._phantomLayer.add(phantomDelete);

                                // Add phantom graphic to the database
                                self._editStore.pushPhantomGraphic(phantomDelete, function (result) {
                                    if (!result) {
                                        console.log("There was a problem adding phantom graphic id: " + objectId);
                                    }
                                    else{
                                        console.log("Phantom graphic " + objectId + " added to database as a deletion.");
                                        domAttr.set(phantomDelete.getNode(), "stroke-dasharray", "4,4");
                                        domStyle.set(phantomDelete.getNode(), "pointer-events", "none");
                                    }
                                });

                                if (self.attachmentsStore) {
                                    // delete local attachments of this feature, if any... we just launch the delete and don't wait for it to complete
                                    self.attachmentsStore.deleteAttachmentsByFeatureId(layer.url, objectId, function (deletedCount) {
                                        console.log("deleted", deletedCount, "attachments of feature", objectId);
                                    });
                                }
                            }
                            else{
                                // If we can't push edit to database then we don't create a phantom graphic
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

                                var phantomUpdate = new Graphic(
                                    updateEdit.geometry,
                                    self._getPhantomSymbol(updateEdit.geometry, self._editStore.UPDATE),
                                    tempIdObject
                                );

                                layer._phantomLayer.add(phantomUpdate);

                                // Add phantom graphic to the database
                                self._editStore.pushPhantomGraphic(phantomUpdate, function (result) {
                                    if (!result) {
                                        console.log("There was a problem adding phantom graphic id: " + objectId);
                                    }
                                    else{
                                        console.log("Phantom graphic " + objectId + " added to database as an update.");
                                        domAttr.set(phantomUpdate.getNode(), "stroke-dasharray", "5,2");
                                        domStyle.set(phantomUpdate.getNode(), "pointer-events", "none");
                                    }
                                });

                            }
                            else{
                                // If we can't push edit to database then we don't create a phantom graphic
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

                                var phantomAdd = new Graphic(
                                    addEdit.geometry,
                                    self._getPhantomSymbol(addEdit.geometry, self._editStore.ADD),
                                    tempIdObject
                                );

                                // Add phantom graphic to the layer
                                layer._phantomLayer.add(phantomAdd);

                                // Add phantom graphic to the database
                                self._editStore.pushPhantomGraphic(phantomAdd, function (result) {
                                    if (!result) {
                                        console.log("There was a problem adding phantom graphic id: " + objectId);
                                    }
                                    else{
                                        console.log("Phantom graphic " + objectId + " added to database as an add.");
                                        domAttr.set(phantomAdd.getNode(), "stroke-dasharray", "10,4");
                                        domStyle.set(phantomAdd.getNode(), "pointer-events", "none");
                                    }

                                });
                            }
                            else{
                                // If we can't push edit to database then we don't create a phantom graphic
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
                                            // server yet we need to delete it and its phantom graphic.
                                            layer._deleteTemporaryFeature(graphic,function(success){
                                                if(!success){
                                                    resolved = false;
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
                     * Delete a graphic and its associated phantom graphic that has been added while offline.
                     * @param graphic
                     * @param callback
                     * @private
                     */
                    layer._deleteTemporaryFeature = function(graphic,callback){

                        var phantomGraphicId = self._editStore.PHANTOM_GRAPHIC_PREFIX + self._editStore._PHANTOM_PREFIX_TOKEN + graphic.attributes[self.DB_UID];

                        function _deleteGraphic(){
                            var deferred = new Deferred();
                            self._editStore.delete(layer.url,graphic,function(success,error){
                                if(success){
                                    deferred.resolve(true);
                                }
                                else{
                                    deferred.resolve(false);
                                }
                            });
                            return deferred.promise;
                        }

                        function _deletePhantomGraphic(){
                            var deferred = new Deferred();
                            self._editStore.deletePhantomGraphic(phantomGraphicId,function(success){
                                if(success) {
                                    deferred.resolve(true);
                                }
                                else {
                                    deferred.resolve(false);
                                }
                            }, function(error) {
                                deferred.resolve(false);
                            });
                            return deferred.promise;
                        }

                        all([_deleteGraphic(),_deletePhantomGraphic()]).then(function (results) {
                            callback(results);
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

                    layer._replaceFeatureIds = function (tempObjectIds, newObjectIds, callback) {
                        console.log("replacing ids of attachments", tempObjectIds, newObjectIds);
                        console.assert(tempObjectIds.length === newObjectIds.length, "arrays must be the same length");

                        if (!tempObjectIds.length) {
                            console.log("no ids to replace!");
                            callback(0);
                        }

                        var i, n = tempObjectIds.length;
                        var count = n;
                        var successCount = 0;
                        for (i = 0; i < n; i++) {
                            self.attachmentsStore.replaceFeatureId(this.url, tempObjectIds[i], newObjectIds[i], function (success) {
                                --count;
                                successCount += (success ? 1 : 0);
                                if (count === 0) {
                                    callback(successCount);
                                }
                            }.bind(this));
                        }
                    };

                    // we need to identify ADDs before sending them to the server
                    // we assign temporary ids (using negative numbers to distinguish them from real ids)
                    layer._nextTempId = -1;
                    layer._getNextTempId = function () {
                        return this._nextTempId--;
                    };

                    function _initPhantomLayer() {
                        try {
                            layer._phantomLayer = new GraphicsLayer({opacity: 0.8});
                            layer._map.addLayer(layer._phantomLayer);
                        }
                        catch (err) {
                            console.log("Unable to init PhantomLayer: " + err.message);
                        }
                    }

                    _initPhantomLayer();

                    // We are currently only passing in a single deferred.
                    all(extendPromises).then(function (r) {

                        // DB already initialized
                        if(r.length === 0 && url){
                            // Initialize the internal featureLayerCollectionObject
                            if(this.ENABLE_FEATURECOLLECTION) {
                                layer._pushFeatureCollections(function(success){
                                    if(success){
                                        callback(true, null);
                                    }
                                    else {
                                        callback(false, null);
                                    }
                                });
                            }
                            else {
                                callback(true, null);
                            }
                        }
                        else if(r[0].success && !url){

                            // This functionality is specifically for offline restarts
                            // and attempts to retrieve a feature layer url.
                            // It's a hack because layer.toJson() doesn't convert layer.url.
                            this._editStore.getFeatureLayerJSON(function(success,message){
                                if(success) {
                                    this._featureLayers[message.__featureLayerURL] = layer;
                                    layer.url = message.__featureLayerURL;

                                    // Initialize the internal featureLayerCollectionObject
                                    if(this.ENABLE_FEATURECOLLECTION) {
                                        layer._pushFeatureCollections(function(success){
                                            if(success){
                                                callback(true, null);
                                            }
                                            else {
                                                callback(false, null);
                                            }
                                        });
                                    }
                                    else {
                                        callback(true, null);
                                    }
                                }
                                else {
                                    // NOTE: We have to have a valid feature layer URL in order to initialize the featureLayerCollectionObject
                                    console.error("getFeatureLayerJSON() failed and unable to create featureLayerCollectionObject.");
                                    callback(false, message);
                                }
                            }.bind(this));
                        }
                        else if(r[0].success){

                            if(this.ENABLE_FEATURECOLLECTION) {
                                layer._pushFeatureCollections(function(success){
                                    if(success){
                                        callback(true, null);
                                    }
                                    else {
                                        callback(false, null);
                                    }
                                });
                            }
                            else {
                                callback(true, null);
                            }
                        }
                    }.bind(this));

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
                    console.log("offlineFeaturesManager going online");
                    this._onlineStatus = this.RECONNECTING;
                    this._replayStoredEdits(function (success, responses) {
                        var result = {success: success, responses: responses};
                        this._onlineStatus = this.ONLINE;
                        if (this.attachmentsStore != null) {
                            console.log("sending attachments");
                            this._sendStoredAttachments(function (success, uploadedResponses, dbResponses) {
                                //this._onlineStatus = this.ONLINE;
                                result.attachments = {success: success, responses: uploadedResponses, dbResponses: dbResponses};
                                callback && callback(result);
                            }.bind(this));
                        }
                        else {
                            //this._onlineStatus = this.ONLINE;
                            callback && callback(result);
                        }
                    }.bind(this));
                },

                /**
                 * Determines if offline or online condition exists
                 * @returns {string} ONLINE or OFFLINE
                 */
                getOnlineStatus: function () {
                    return this._onlineStatus;
                },

                /**
                * Serialize the feature layer graphics
                * @param features Array of features
                * @param callback Returns a JSON string
                */
                serializeFeatureGraphicsArray: function (features, callback) {
                    var length = features.length;
                    var jsonArray = [];
                    for (var i = 0; i < length; i++) {
                        var jsonGraphic = features[i].toJson();
                        jsonArray.push(jsonGraphic);
                        if (i == (length - 1)) {
                            var featureJSON = JSON.stringify(jsonArray);
                            callback(featureJSON);
                            break;
                        }
                    }
                },

                /**
                 * Retrieves the feature collection object. Specifically used in offline browser restarts.
                 * This is an object created automatically by the library and is updated with every ADD, UPDATE and DELETE.
                 * Attachments are handled separately and not part of the feature collection created here.
                 *
                 * It has the following signature: {id: "feature-collection-object-1001",
                 * featureLayerCollections: [{ featureCollection: [Object], featureLayerUrl: String }]}
                 *
                 * @param callback
                 */
                getFeatureCollections: function(callback){
                    if(!this._editStore._isDBInit){

                        this._initializeDB(null,null).then(function(result){
                            if(result.success){
                                this._editStore._getFeatureCollections(function(success,message){
                                    callback(success,message);
                                });
                            }
                        }.bind(this), function(err){
                            callback(false, err);
                        });
                    }
                    else {
                        this._editStore._getFeatureCollections(function(success,message){
                            callback(success,message);
                        });
                    }
                },

                /**
                 * Retrieves the optional feature layer storage object
                 * For use in full offline scenarios.
                 * @param callback callback(true, object) || callback(false, error)
                 */
                getFeatureLayerJSONDataStore: function(callback){
                    if(!this._editStore._isDBInit){

                        this._initializeDB(null,null).then(function(result){
                            if(result.success){
                                this._editStore.getFeatureLayerJSON(function(success,message){
                                    callback(success,message);
                                });
                            }
                        }.bind(this), function(err){
                            callback(false, err);
                        });
                    }
                    else {
                        this._editStore.getFeatureLayerJSON(function(success,message){
                            callback(success,message);
                        });
                    }
                },

                /* internal methods */

                /**
                 * Initialize the database and push featureLayer JSON to DB if required.
                 * NOTE: also stores feature layer url in hidden dataStore property dataStore.__featureLayerURL.
                 * @param dataStore Object
                 * @param url Feature Layer's url. This is used by this library for internal feature identification.
                 * @param callback
                 * @private
                 */
                //_initializeDB: function(dataStore,url,callback){
                _initializeDB: function(dataStore,url){
                    var deferred = new Deferred();

                    var editStore = this._editStore;

                    // Configure the database
                    editStore.dbName = this.DB_NAME;
                    editStore.objectStoreName = this.DB_OBJECTSTORE_NAME;
                    editStore.objectId = this.DB_UID;

                    // Attempt to initialize the database
                    editStore.init(function (result, error) {

                        ////////////////////////////////////////////////////
                        // OFFLINE RESTART CONFIGURATION
                        // Added @ v2.5
                        //
                        // Configure database for offline restart
                        // dataStore object allows you to store data that you'll
                        // use after an offline browser restart.
                        //
                        // If dataStore Object is not defined then do nothing.
                        //
                        ////////////////////////////////////////////////////

                        if (typeof dataStore === "object" && result === true && (dataStore !== undefined) && (dataStore !== null)) {

                            // Add a hidden property to hold the feature layer's url
                            // When converting a feature layer to json (layer.toJson()) we lose this information.
                            // This library needs to know the feature layer url.
                            if(url) {
                                dataStore.__featureLayerURL = url;
                            }

                            editStore.pushFeatureLayerJSON(dataStore, function (success, err) {
                                if (success) {
                                    deferred.resolve({success:true, error: null});
                                }
                                else {
                                    deferred.reject({success:false, error: err});
                                }
                            });
                        }
                        else if(result){
                            deferred.resolve({success:true, error: null});
                        }
                        else{
                            deferred.reject({success:false, error: null});
                        }
                    });

                    return deferred;
                },

                /**
                 * internal method that checks if this browser supports everything that is needed to handle offline attachments
                 * it also extends XMLHttpRequest with sendAsBinary() method, needed in Chrome
                 */
                _checkFileAPIs: function () {
                    if (window.File && window.FileReader && window.FileList && window.Blob) {
                        console.log("All APIs supported!");

                        if (!XMLHttpRequest.prototype.sendAsBinary) {
                            // https://code.google.com/p/chromium/issues/detail?id=35705#c40
                            XMLHttpRequest.prototype.sendAsBinary = function (datastr) {
                                function byteValue(x) {
                                    return x.charCodeAt(0) & 0xff; // jshint ignore:line
                                }

                                var ords = Array.prototype.map.call(datastr, byteValue);
                                var ui8a = new Uint8Array(ords);
                                this.send(ui8a.buffer);
                            };
                            console.log("extending XMLHttpRequest");
                        }
                        return true;
                    }
                    console.log("The File APIs are not fully supported in this browser.");
                    return false;
                },

                /**
                 * internal method that extends an object with sendAsBinary() method
                 * sometimes extending XMLHttpRequest.prototype is not enough, as ArcGIS JS lib seems to mess with this object too
                 * @param oAjaxReq object to extend
                 */
                _extendAjaxReq: function (oAjaxReq) {
                    oAjaxReq.sendAsBinary = XMLHttpRequest.prototype.sendAsBinary;
                    console.log("extending XMLHttpRequest");
                },

                //
                // phantom symbols
                //

                _phantomSymbols: [],

                _getPhantomSymbol: function (geometry, operation) {
                    if (this._phantomSymbols.length === 0) {
                        var color = [0, 255, 0, 255];
                        var width = 1.5;

                        this._phantomSymbols.point = [];
                        this._phantomSymbols.point[this._editStore.ADD] = new SimpleMarkerSymbol({
                            "type": "esriSMS", "style": "esriSMSCross",
                            "xoffset": 10, "yoffset": 10,
                            "color": [255, 255, 255, 0], "size": 15,
                            "outline": {"color": color, "width": width, "type": "esriSLS", "style": "esriSLSSolid"}
                        });
                        this._phantomSymbols.point[this._editStore.UPDATE] = new SimpleMarkerSymbol({
                            "type": "esriSMS", "style": "esriSMSCircle",
                            "xoffset": 0, "yoffset": 0,
                            "color": [255, 255, 255, 0], "size": 15,
                            "outline": {"color": color, "width": width, "type": "esriSLS", "style": "esriSLSSolid"}
                        });
                        this._phantomSymbols.point[this._editStore.DELETE] = new SimpleMarkerSymbol({
                            "type": "esriSMS", "style": "esriSMSX",
                            "xoffset": 0, "yoffset": 0,
                            "color": [255, 255, 255, 0], "size": 15,
                            "outline": {"color": color, "width": width, "type": "esriSLS", "style": "esriSLSSolid"}
                        });
                        this._phantomSymbols.multipoint = null;

                        this._phantomSymbols.polyline = [];
                        this._phantomSymbols.polyline[this._editStore.ADD] = new SimpleLineSymbol({
                            "type": "esriSLS", "style": "esriSLSSolid",
                            "color": color, "width": width
                        });
                        this._phantomSymbols.polyline[this._editStore.UPDATE] = new SimpleLineSymbol({
                            "type": "esriSLS", "style": "esriSLSSolid",
                            "color": color, "width": width
                        });
                        this._phantomSymbols.polyline[this._editStore.DELETE] = new SimpleLineSymbol({
                            "type": "esriSLS", "style": "esriSLSSolid",
                            "color": color, "width": width
                        });

                        this._phantomSymbols.polygon = [];
                        this._phantomSymbols.polygon[this._editStore.ADD] = new SimpleFillSymbol({
                            "type": "esriSFS",
                            "style": "esriSFSSolid",
                            "color": [255, 255, 255, 0],
                            "outline": {"type": "esriSLS", "style": "esriSLSSolid", "color": color, "width": width}
                        });
                        this._phantomSymbols.polygon[this._editStore.UPDATE] = new SimpleFillSymbol({
                            "type": "esriSFS",
                            "style": "esriSFSSolid",
                            "color": [255, 255, 255, 0],
                            "outline": {"type": "esriSLS", "style": "esriSLSDash", "color": color, "width": width}
                        });
                        this._phantomSymbols.polygon[this._editStore.DELETE] = new SimpleFillSymbol({
                            "type": "esriSFS",
                            "style": "esriSFSSolid",
                            "color": [255, 255, 255, 0],
                            "outline": {"type": "esriSLS", "style": "esriSLSDot", "color": color, "width": width}
                        });
                    }

                    return this._phantomSymbols[geometry.type][operation];
                },

                //
                // methods to handle attachment uploads
                //

                _uploadAttachment: function (attachment) {
                    var dfd = new Deferred();

                    var layer = this._featureLayers[attachment.featureLayerUrl];

                    var formData = new FormData();
                    formData.append("attachment",attachment.file);

                    switch(attachment.type){
                        case this.attachmentsStore.TYPE.ADD:
                            layer.addAttachment(attachment.objectId,formData,function(evt){
                                dfd.resolve({attachmentResult:evt,id:attachment.id});
                            },function(err){
                                dfd.reject(err);
                            });
                            break;
                        case this.attachmentsStore.TYPE.UPDATE:
                            formData.append("attachmentId", attachment.id);

                            // NOTE:
                            // We need to handle updates different from ADDS and DELETES because of how the JS API
                            // parses the DOM formNode property.
                            layer._sendAttachment("update",/* objectid */attachment.objectId, formData,function(evt){
                                dfd.resolve({attachmentResult:evt,id:attachment.id});
                            },function(err){
                                dfd.reject(err);
                            });

                            break;
                        case this.attachmentsStore.TYPE.DELETE:
                            // IMPORTANT: This method returns attachmentResult as an Array. Whereas ADD and UPDATE do not!!
                            layer.deleteAttachments(attachment.objectId,[attachment.id],function(evt){
                                dfd.resolve({attachmentResult:evt,id:attachment.id});
                            },function(err){
                                dfd.reject(err);
                            });
                            break;
                    }

                    return dfd.promise;
                },

                _deleteAttachmentFromDB: function (attachmentId, uploadResult) {
                    var dfd = new Deferred();

                    console.log("upload complete", uploadResult, attachmentId);
                    this.attachmentsStore.delete(attachmentId, function (success) {
                        console.assert(success === true, "can't delete attachment already uploaded");
                        console.log("delete complete", success);
                        dfd.resolve({success:success,result:uploadResult});
                    });

                    return dfd;
                },

                /**
                 * Removes attachments from DB if they were successfully uploaded
                 * @param results promises.results
                 * @callback callback callback( {errors: boolean, attachmentsDBResults: results, uploadResults: results} )
                 * @private
                 */
                _cleanAttachmentsDB: function(results,callback){

                    var self = this;
                    var promises = [];
                    var count = 0;

                    results.forEach(function(value){

                        if(typeof value.attachmentResult == "object" && value.attachmentResult.success){
                            // Delete an attachment from the database if it was successfully
                            // submitted to the server.
                            promises.push(self._deleteAttachmentFromDB(value.id,null));
                        }
                        // NOTE: layer.deleteAttachments returns an array rather than an object
                        else if(value.attachmentResult instanceof Array){

                            // Because we get an array we have to cycle thru it to verify all results
                            value.attachmentResult.forEach(function(deleteValue){
                                if(deleteValue.success){
                                    // Delete an attachment from the database if it was successfully
                                    // submitted to the server.
                                    promises.push(self._deleteAttachmentFromDB(value.id,null));
                                }
                                else {
                                    count++;
                                }
                            });
                        }
                        else{
                            // Do nothing. Don't delete attachments from DB if we can't upload them
                            count++;
                        }
                    });

                    var allPromises = all(promises);
                    allPromises.then(function(dbResults){
                       if(count > 0){
                           // If count is greater than zero then we have errors and need to set errors to true
                           callback({errors: true, attachmentsDBResults: dbResults, uploadResults: results});
                       }
                       else{
                           callback({errors: false, attachmentsDBResults: dbResults, uploadResults: results});
                       }
                    });
                },

                /**
                 * Attempts to upload stored attachments when the library goes back on line.
                 * @param callback callback({success: boolean, uploadResults: results, dbResults: results})
                 * @private
                 */
                _sendStoredAttachments: function (callback) {
                    this.attachmentsStore.getAllAttachments(function (attachments) {

                        var self = this;

                        console.log("we have", attachments.length, "attachments to upload");

                        var promises = [];
                        attachments.forEach(function (attachment) {
                            console.log("sending attachment", attachment.id, "to feature", attachment.featureId);

                            var uploadAttachmentComplete = this._uploadAttachment(attachment);
                            promises.push(uploadAttachmentComplete);
                        }, this);
                        console.log("promises", promises.length);
                        var allPromises = all(promises);
                        allPromises.then(function (uploadResults) {
                                console.log(uploadResults);
                                self._cleanAttachmentsDB(uploadResults,function(dbResults){
                                    if(dbResults.errors){
                                        callback && callback(false, uploadResults,dbResults);
                                    }
                                    else{
                                        callback && callback(true, uploadResults,dbResults);
                                    }
                                });
                            },
                            function (err) {
                                console.log("error!", err);
                                callback && callback(false, err);
                            });
                    }.bind(this));
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
                    var attachmentsStore = this.attachmentsStore;
                    var editStore = this._editStore;

                    this._editStore.getAllEditsArray(function (result, err) {
                        if (result.length > 0) {
                            tempArray = result;

                            var length = tempArray.length;

                            for (var n = 0; n < length; n++) {
                                layer = featureLayers[tempArray[n].layer];

                                // If the layer has attachments then check to see if the attachmentsStore has been initialized
                                if (attachmentsStore == null && layer.hasAttachments) {
                                    console.log("NOTICE: you may need to run OfflineFeaturesManager.initAttachments(). Check the Attachments doc for more info. Layer id: " + layer.id + " accepts attachments");
                                }

                                // Assign the attachmentsStore to the layer as a private var so we can access it from
                                // the promises applyEdits() method.
                                layer._attachmentsStore = attachmentsStore;

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

                                //if(that._featureCollectionUsageFlag){
                                // Note: when the feature layer is created with a feature collection we have to handle applyEdits() differently
                                // TO-DO rename this method.
                                promises[n] = that._internalApplyEditsAll(layer, tempArray[n].id, tempObjectIds, adds, updates, deletes);
                            }

                            // wait for all requests to finish
                            // responses contain {id,layer,tempId,addResults,updateResults,deleteResults}
                            var allPromises = all(promises);
                            allPromises.then(
                                function (responses) {
                                    console.log("OfflineFeaturesManager sync - all responses are back");

                                    this._parseResponsesArray(responses).then(function(result) {
                                        if(result) {
                                            this.emit(this.events.ALL_EDITS_SENT,responses);
                                        }
                                        else {
                                            this.emit(this.events.EDITS_SENT_ERROR, {msg: "Not all edits synced", respones: responses});
                                        }
                                        callback && callback(true, responses);
                                    }.bind(this));
                                }.bind(that),
                                function (errors) {
                                    console.log("OfflineFeaturesManager._replayStoredEdits - ERROR!!");
                                    console.log(errors);
                                    callback && callback(false, errors);
                                }.bind(that)
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
                 * This does not handle phantom graphics!
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
                 * Retrieves f=json from the feature layer
                 * @param url FeatureLayer's URL
                 * @param callback
                 * @private
                 */
                getFeatureLayerJSON: function (url, callback) {
                    require(["esri/request"], function (esriRequest) {
                        var request = esriRequest({
                            url: url,
                            content: {f: "json"},
                            handleAs: "json",
                            callbackParamName: "callback"
                        });

                        request.then(function (response) {
                            console.log("Success: ", response);
                            callback(true, response);
                        }, function (error) {
                            console.log("Error: ", error.message);
                            callback(false, error.message);
                        });
                    });
                },

                /**
                 * DEPRECATED at v2.11
                 * Executes the _applyEdits() method when a feature layer is created using a REST endpoint
                 * @param layer
                 * @param id the unique id that identifies the Graphic in the database
                 * @param tempObjectIds
                 * @param adds
                 * @param updates
                 * @param deletes
                 * @returns {l.Deferred.promise} contains {id,layer,tempId,addResults,updateResults,deleteResults}
                 * @private
                 */
                _internalApplyEdits: function (layer, id, tempObjectIds, adds, updates, deletes) {
                    var that = this;
                    var dfd = new Deferred();

                    layer._applyEdits(adds, updates, deletes,
                        function (addResults, updateResults, deleteResults) {
                            layer._phantomLayer.clear();

                            // We use a different pattern if the attachmentsStore is valid and the layer has attachments
                            if (layer._attachmentsStore != null && layer.hasAttachments && tempObjectIds.length > 0) {

                                var newObjectIds = addResults.map(function (r) {
                                    return r.objectId;
                                });

                                layer._replaceFeatureIds(tempObjectIds, newObjectIds, function (count) {
                                    console.log("Done replacing feature ids. Total count = " + count);
                                });
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
                                    databaseErrors: null
                                }); // wrap three arguments in a single object
                            }, function(error) {
                                dfd.resolve({
                                    id: id,
                                    layer: layer.url,
                                    tempId: tempObjectIds, // let's us internally match an ADD to it's new ObjectId
                                    addResults: addResults,
                                    updateResults: updateResults,
                                    deleteResults: deleteResults,
                                    databaseResults: null,
                                    databaseErrors: error
                                }); // wrap three arguments in a single object
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
                            layer._phantomLayer.clear();

                            // We use a different pattern if the attachmentsStore is valid and the layer has attachments
                            if (layer._attachmentsStore != null && layer.hasAttachments && tempObjectIds.length > 0) {

                                var newObjectIds = addResults.map(function (r) {
                                    return r.objectId;
                                });

                                layer._replaceFeatureIds(tempObjectIds, newObjectIds, function (count) {
                                    console.log("Done replacing feature ids. Total count = " + count);
                                });
                            }

                            if(addResults.length > 0) {
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

                            var id = this._editStore.PHANTOM_GRAPHIC_PREFIX + this._editStore._PHANTOM_PREFIX_TOKEN + fakeGraphic.attributes[this.DB_UID];

                            // Delete the phantom graphic associated with the dit
                            this._editStore.deletePhantomGraphic(id, function(success,error){
                                if(!success) {
                                    console.log("_cleanDatabase delete phantom graphic error: " + error);
                                    dfd.reject({success: false, error: error, id: id});
                                }
                                else {
                                    console.log("_cleanDatabase success: " + id);
                                    dfd.resolve({success: true, error: null, id: id});
                                }
                            });
                        }
                        else {
                            dfd.reject({success: false, error: error, id: id});
                        }
                    }.bind(this));

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
                        a = "&adds=" + JSON.stringify((adds));
                    }
                    if(updates.length > 0) {
                        array.forEach(updates, function(update){
                            if(update.hasOwnProperty("infoTemplate")){ // if the update has an infoTemplate attached,
                                delete update.infoTemplate; // delete it to reduce payload size.
                            }
                        }, this);
                        u = "&updates=" + JSON.stringify(updates);
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

                    var req = new XMLHttpRequest();
                    req.open("POST", layer.url + "/applyEdits", true);
                    req.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
                    req.onload = function()
                    {
                        if( req.status === 200 && req.responseText !== "")
                        {
                            try {
                                var obj = JSON.parse(this.response);
                                callback(obj.addResults, obj.updateResults, obj.deleteResults);
                            }
                            catch(err) {
                                console.error("EDIT REQUEST REPONSE WAS NOT SUCCESSFUL:", req);
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
                _parseResponsesArray: function(responses) {

                    var dfd = new Deferred();
                    var err = 0;

                    for (var key in responses) {
                        if (responses.hasOwnProperty(key)) {
                            responses[key].addResults.map(function(result){
                                if(!result.success) {
                                    err++;
                                }
                            });

                            responses[key].updateResults.map(function(result){
                                if(!result.success) {
                                    err++;
                                }
                            });

                            responses[key].deleteResults.map(function(result){
                                if(!result.success) {
                                    err++;
                                }
                            });
                        }
                    }

                    if(err > 0){
                        dfd.resolve(false);
                    }
                    else {
                        dfd.resolve(true);
                    }

                    return dfd.promise;
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
            console.error("editsStore.pushEdit() - failed to insert undefined objectId into database. Did you set offlineFeaturesManager.DB_UID? " + JSON.stringify(graphic.attributes));
            callback(false,"editsStore.pushEdit() - failed to insert undefined objectId into database. Did you set offlineFeaturesManager.DB_UID? " + JSON.stringify(graphic.attributes));
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
     * DEPRECATED at v2.11
     * TO-DO remove in the next release
     *
     * Removes some phantom graphics from database.
     * The responseObject contains {id,layer,tempId,addResults,updateResults,deleteResults}.
     * IF there are no results.success then nothing will be deleted.
     *
     * WARNING: Can generate false positives. IndexedDB will always return success
     * even if you attempt to delete a non-existent id.
     *
     * CAUTION: This should always be used in conjunction with deleting the phantom graphic's
     * associated edit entry in the database.
     *
     * @param responseObject
     * @param callback boolean
     */
    this.resetLimitedPhantomGraphicsQueue = function (responseObject, callback) {

        if (Object.keys(responseObject).length > 0) {
            var db = this._db;

            var errors = 0;
            var tx = db.transaction([this.objectStoreName], "readwrite");
            var objectStore = tx.objectStore(this.objectStoreName);

            objectStore.onerror = function () {
                errors++;
                console.log("PHANTOM GRAPHIC ERROR");
            };

            tx.oncomplete = function () {
                errors === 0 ? callback(true) : callback(false);
            };

            for (var key in responseObject) {
                if (responseObject.hasOwnProperty(key)) {
                    var edit = responseObject[key];
                    var id = this.PHANTOM_GRAPHIC_PREFIX + this._PHANTOM_PREFIX_TOKEN + edit.id;

                    // CAUTION:
                    // TO-DO we do NOT match the edit.id with edit's objectId

                    // If we have an add, update or delete success then delete the entry, otherwise we skip it.
                    if(edit.updateResults.length > 0){
                        if (edit.updateResults[0].success){
                            objectStore.delete(id);
                        }
                    }

                    if(edit.deleteResults.length > 0){
                        if (edit.deleteResults[0].success){
                            objectStore.delete(id);
                        }
                    }

                    if(edit.addResults.length > 0){
                        if (edit.addResults[0].success){
                            objectStore.delete(id);
                        }
                    }
                }
            }
        }
        else {
            callback(true);
        }
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

    /**
     * Save space in the database...don't need to store the entire Graphic object just its public properties!
     * @param graphic
     * @returns {*}
     * @private
     */
    this._serialize = function (graphic) {
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

    this._deserialize = function (json) {
        var graphic;

        require(["esri/graphic"], function (Graphic) {
            graphic = new Graphic(JSON.parse(json));
        });

        return graphic;
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



/*global IDBKeyRange,indexedDB */

O.esri.Edit.AttachmentsStore = function () {
    "use strict";

    this._db = null;

    this.dbName = "attachments_store";
    this.objectStoreName = "attachments";

    this.TYPE = {
        "ADD" : "add",
        "UPDATE" : "update",
        "DELETE" : "delete"
    };

    this.isSupported = function () {
        if (!window.indexedDB) {
            return false;
        }
        return true;
    };

    /**
     * Stores an attachment in the database.
     * In theory, this abides by the query-attachment-infos-complete Object which can be found here:
     * https://developers.arcgis.com/javascript/jsapi/featurelayer-amd.html#event-query-attachment-infos-complete
     * @param featureLayerUrl
     * @param attachmentId The temporary or actual attachmentId issued by the feature service
     * @param objectId The actual ObjectId issues by the feature service
     * @param attachmentFile
     * @param type Type of operation: "add", "update" or "delete"
     * @param callback
     */
    this.store = function (featureLayerUrl, attachmentId, objectId, attachmentFile, type, callback) {
        try {
            // Avoid allowing the wrong type to be stored
            if(type == this.TYPE.ADD || type == this.TYPE.UPDATE || type == this.TYPE.DELETE) {

                // first of all, read file content
                this._readFile(attachmentFile, function (success, fileContent) {

                    if (success) {
                        // now, store it in the db
                        var newAttachment =
                        {
                            id: attachmentId,
                            objectId: objectId,
                            type: type,

                            // Unique ID - don't use the ObjectId
                            // multiple features services could have an a feature with the same ObjectId
                            featureId: featureLayerUrl + "/" + objectId,
                            contentType: attachmentFile.type,
                            name: attachmentFile.name,
                            size: attachmentFile.size,
                            featureLayerUrl: featureLayerUrl,
                            content: fileContent,
                            file: attachmentFile
                        };

                        var transaction = this._db.transaction([this.objectStoreName], "readwrite");

                        transaction.oncomplete = function (event) {
                            callback(true, newAttachment);
                        };

                        transaction.onerror = function (event) {
                            callback(false, event.target.error.message);
                        };

                        try {
                            transaction.objectStore(this.objectStoreName).put(newAttachment);
                        }
                        catch(err) {
                            callback(false, err);
                        }
                    }
                    else {
                        callback(false, fileContent);
                    }
                }.bind(this));
            }
            else{
                console.error("attachmentsStore.store() Invalid type in the constructor!");
                callback(false,"attachmentsStore.store() Invalid type in the constructor!");
            }
        }
        catch (err) {
            console.log("AttachmentsStore: " + err.stack);
            callback(false, err.stack);
        }
    };

    this.retrieve = function (attachmentId, callback) {
        console.assert(this._db !== null, "indexeddb not initialized");

        var objectStore = this._db.transaction([this.objectStoreName]).objectStore(this.objectStoreName);
        var request = objectStore.get(attachmentId);
        request.onsuccess = function (event) {
            var result = event.target.result;
            if (!result) {
                callback(false, "not found");
            }
            else {
                callback(true, result);
            }
        };
        request.onerror = function (err) {
            console.log(err);
            callback(false, err);
        };
    };

    this.getAttachmentsByFeatureId = function (featureLayerUrl, objectId, callback) {
        console.assert(this._db !== null, "indexeddb not initialized");

        var featureId = featureLayerUrl + "/" + objectId;
        var attachments = [];

        var objectStore = this._db.transaction([this.objectStoreName]).objectStore(this.objectStoreName);
        var index = objectStore.index("featureId");
        var keyRange = IDBKeyRange.only(featureId);
        index.openCursor(keyRange).onsuccess = function (evt) {
            var cursor = evt.target.result;
            if (cursor) {
                attachments.push(cursor.value);
                cursor.continue();
            }
            else {
                callback(attachments);
            }
        };
    };

    this.getAttachmentsByFeatureLayer = function (featureLayerUrl, callback) {
        console.assert(this._db !== null, "indexeddb not initialized");

        var attachments = [];

        var objectStore = this._db.transaction([this.objectStoreName]).objectStore(this.objectStoreName);
        var index = objectStore.index("featureLayerUrl");
        var keyRange = IDBKeyRange.only(featureLayerUrl);
        index.openCursor(keyRange).onsuccess = function (evt) {
            var cursor = evt.target.result;
            if (cursor) {
                attachments.push(cursor.value);
                cursor.continue();
            }
            else {
                callback(attachments);
            }
        };
    };

    this.getAllAttachments = function (callback) {
        console.assert(this._db !== null, "indexeddb not initialized");

        var attachments = [];

        var objectStore = this._db.transaction([this.objectStoreName]).objectStore(this.objectStoreName);
        objectStore.openCursor().onsuccess = function (evt) {
            var cursor = evt.target.result;
            if (cursor) {
                attachments.push(cursor.value);
                cursor.continue();
            }
            else {
                callback(attachments);
            }
        };
    };

    this.deleteAttachmentsByFeatureId = function (featureLayerUrl, objectId, callback) {
        console.assert(this._db !== null, "indexeddb not initialized");

        var featureId = featureLayerUrl + "/" + objectId;

        var objectStore = this._db.transaction([this.objectStoreName], "readwrite").objectStore(this.objectStoreName);
        var index = objectStore.index("featureId");
        var keyRange = IDBKeyRange.only(featureId);
        var deletedCount = 0;
        index.openCursor(keyRange).onsuccess = function (evt) {
            var cursor = evt.target.result;
            if (cursor) {
                //var attachment = cursor.value;
                //this._revokeLocalURL(attachment);
                objectStore.delete(cursor.primaryKey);
                deletedCount++;
                cursor.continue();
            }
            else {
                setTimeout(function () {
                    callback(deletedCount);
                }, 0);
            }
        }.bind(this);
    };

    this.delete = function (attachmentId, callback) {
        console.assert(this._db !== null, "indexeddb not initialized");

        // before deleting an attachment we must revoke the blob URL that it contains
        // in order to free memory in the browser
        this.retrieve(attachmentId, function (success, attachment) {
            if (!success) {
                callback(false, "attachment " + attachmentId + " not found");
                return;
            }

            //this._revokeLocalURL(attachment);

            var request = this._db.transaction([this.objectStoreName], "readwrite")
                .objectStore(this.objectStoreName)
                .delete(attachmentId);
            request.onsuccess = function (event) {
                setTimeout(function () {
                    callback(true);
                }, 0);
            };
            request.onerror = function (err) {
                callback(false, err);
            };
        }.bind(this));
    };

    this.deleteAll = function (callback) {
        console.assert(this._db !== null, "indexeddb not initialized");

        this.getAllAttachments(function (attachments) {
            //attachments.forEach(function (attachment) {
            //    this._revokeLocalURL(attachment);
            //}, this);

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
        }.bind(this));
    };

    this.replaceFeatureId = function (featureLayerUrl, oldId, newId, callback) {
        console.assert(this._db !== null, "indexeddb not initialized");

        var featureId = featureLayerUrl + "/" + oldId;

        var objectStore = this._db.transaction([this.objectStoreName], "readwrite").objectStore(this.objectStoreName);
        var index = objectStore.index("featureId");
        var keyRange = IDBKeyRange.only(featureId);
        var replacedCount = 0;
        index.openCursor(keyRange).onsuccess = function (evt) {
            var cursor = evt.target.result;
            if (cursor) {
                var newFeatureId = featureLayerUrl + "/" + newId;
                var updated = cursor.value;
                updated.featureId = newFeatureId;
                updated.objectId = newId;
                objectStore.put(updated);
                replacedCount++;
                cursor.continue();
            }
            else {
                // If no records match then evt.target.result = null
                // allow time for all changes to persist...
                setTimeout(function () {
                    callback(replacedCount);
                }, 1);
            }
        };
    };

    this.getUsage = function (callback) {
        console.assert(this._db !== null, "indexeddb not initialized");

        var usage = {sizeBytes: 0, attachmentCount: 0};

        var transaction = this._db.transaction([this.objectStoreName])
            .objectStore(this.objectStoreName)
            .openCursor();

        console.log("dumping keys");

        transaction.onsuccess = function (event) {
            var cursor = event.target.result;
            if (cursor) {
                console.log(cursor.value.id, cursor.value.featureId, cursor.value.objectId);
                var storedObject = cursor.value;
                var json = JSON.stringify(storedObject);
                usage.sizeBytes += json.length;
                usage.attachmentCount += 1;
                cursor.continue();
            }
            else {
                callback(usage, null);
            }
        }.bind(this);
        transaction.onerror = function (err) {
            callback(null, err);
        };
    };

    /**
     * Full attachments database reset.
     * CAUTION! If some attachments weren't successfully sent, then their record
     * will still exist in the database. If you use this function you
     * will also delete those records.
     * @param callback boolean
     */
    this.resetAttachmentsQueue = function (callback) {
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

    // internal methods

    this._readFile = function (attachmentFile, callback) {
        var reader = new FileReader();
        reader.onload = function (evt) {
            callback(true,evt.target.result);
        };
        reader.onerror = function (evt) {
            callback(false,evt.target.result);
        };
        reader.readAsBinaryString(attachmentFile);
    };

    // Deprecated @ v2.7
    //this._createLocalURL = function (attachmentFile) {
    //    return window.URL.createObjectURL(attachmentFile);
    //};

    //this._revokeLocalURL = function (attachment) {
    //    window.URL.revokeObjectURL(attachment.url);
    //};

    this.init = function (callback) {
        console.log("init AttachmentStore");

        var request = indexedDB.open(this.dbName, 12);
        callback = callback || function (success) {
            console.log("AttachmentsStore::init() success:", success);
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

            var objectStore = db.createObjectStore(this.objectStoreName, {keyPath: "id"});
            objectStore.createIndex("featureId", "featureId", {unique: false});
            objectStore.createIndex("featureLayerUrl", "featureLayerUrl", {unique: false});
        }.bind(this);

        request.onsuccess = function (event) {
            this._db = event.target.result;
            console.log("database opened successfully");
            callback(true);
        }.bind(this);
    };
};

