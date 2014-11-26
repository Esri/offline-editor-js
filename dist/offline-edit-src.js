/*! offline-editor-js - v2.4 - 2014-11-26
*   Copyright (c) 2014 Environmental Systems Research Institute, Inc.
*   Apache License*/

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
    "esri/symbols/SimpleMarkerSymbol",
    "esri/symbols/SimpleLineSymbol",
    "esri/symbols/SimpleFillSymbol",
    "esri/urlUtils"],
	function(
		Evented,Deferred,all,declare,array,domAttr,domStyle,query,
		esriConfig,GraphicsLayer,Graphic,SimpleMarkerSymbol,SimpleLineSymbol,SimpleFillSymbol,urlUtils)
{
    "use strict";
    return declare("O.esri.Edit.OfflineFeaturesManager",[Evented],
    {
        _onlineStatus: "online",
        _featureLayers: {},
        _editStore: new O.esri.Edit.EditStore(),

        ONLINE: "online",				// all edits will directly go to the server
        OFFLINE: "offline",             // edits will be enqueued
        RECONNECTING: "reconnecting",   // sending stored edits to the server
        attachmentsStore: null,         // indexedDB for storing attachments
        proxyPath: null,                // by default we use CORS and therefore proxyPath is null

        // manager emits event when...
        events: {
            EDITS_SENT: "edits-sent",           // ...whenever any edit is actually sent to the server
            EDITS_ENQUEUED: "edits-enqueued",   // ...when an edit is enqueued (and not sent to the server)
            ALL_EDITS_SENT: "all-edits-sent",   // ...after going online and there are no pending edits in the queue
            ATTACHMENT_ENQUEUED: "attachment-enqueued",
            ATTACHMENTS_SENT: "attachments-sent"
        },

        /**
         * Need to call this method only if you want to support offline attachments
         * it is optional
         * @param callback(success)
         * @returns void
         */
        initAttachments: function(callback)
        {
            callback = callback || function(success) { console.log("attachments inited ", success? "ok" : "failed"); };

            if( !this._checkFileAPIs())
            {
                return callback(false, "File APIs not supported");                
            }

            try
            {
                this.attachmentsStore = new O.esri.Edit.AttachmentsStore();

                if( /*false &&*/ this.attachmentsStore.isSupported() )
                {
                    this.attachmentsStore.init(callback);
                }
                else
                {
                    return callback(false, "indexedDB not supported");
                }
            }
            catch(err)
            {
                console.log("problem!  " + err.toString());
            }
        },

        /** 
         * internal method that checks if this browser supports everything that is needed to handle offline attachments
         * it also extends XMLHttpRequest with sendAsBinary() method, needed in Chrome
         */
        _checkFileAPIs: function()
        {
            if( window.File && window.FileReader && window.FileList && window.Blob )
            {
                console.log("All APIs supported!");

                if(!XMLHttpRequest.prototype.sendAsBinary )
                {               
                    // https://code.google.com/p/chromium/issues/detail?id=35705#c40
                    XMLHttpRequest.prototype.sendAsBinary = function(datastr) 
                    {
                        function byteValue(x) {
                            return x.charCodeAt(0) & 0xff;
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
        _extendAjaxReq: function(oAjaxReq)
        {
            oAjaxReq.sendAsBinary = XMLHttpRequest.prototype.sendAsBinary;
            console.log("extending XMLHttpRequest");
        },

        /**
         * Overrides a feature layer.
         * @param layer
         * @returns deferred
         */
        extend: function(layer)
        {
            var self = this;

            // we keep track of the FeatureLayer object
            this._featureLayers[ layer.url ] = layer;

            // replace the applyEdits() method
            layer._applyEdits = layer.applyEdits;


            // attachments 
            layer._addAttachment = layer.addAttachment;
            layer._queryAttachmentInfos = layer.queryAttachmentInfos;
            layer._deleteAttachments = layer.deleteAttachments;

            /*
            operations supported offline:
            1. add a new attachment to an existing feature (DONE)
            2. add a new attachment to a new feature (DONE)
            3. remove an attachment that is already in the server... (NOT YET)
            4. remove an attachment that is not in the server yet (DONE)
            5. update an existing attachment to an existing feature (NOT YET)
            6. update a new attachment (NOT YET)

            concerns:
            - manage the relationship between offline features and attachments: what if the user wants to add
              an attachment to a feature that is still offline? we need to keep track of objectids so that when
              the feature is sent to the server and receives a final objectid we replace the temporary negative id
              by its final objectid (DONE)
            - what if the user deletes an offline feature that had offline attachments? we need to discard the attachment  (DONE)

            pending tasks:
            - delete attachment (DONE)
            - send attachments to server when reconnecting (DONE)
            - check for hasAttachments attribute in the FeatureLayer (NOT YET)
            */            

            //
            // attachments
            //
            layer.queryAttachmentInfos = function(objectId,callback,errback)
            {
                if( self.getOnlineStatus() === self.ONLINE)
                {
                    var def = this._queryAttachmentInfos(objectId,
                        function()
                        {
                            console.log(arguments);
                            self.emit(self.events.ATTACHMENTS_INFO,arguments);
                            callback && callback.apply(this,arguments);
                        },
                        errback);
                    return def;
                }

                if( !self.attachmentsStore ) 
                {                    
                    console.log("in order to support attachments you need to call initAttachments() method of offlineFeaturesManager");
                    return;
                }

                // will only return LOCAL attachments
                var deferred = new Deferred();
                self.attachmentsStore.getAttachmentsByFeatureId(this.url, objectId, function(attachments)
                {
                    callback && callback(attachments);
                    deferred.resolve(attachments);
                });
                return deferred;
            };

            layer.addAttachment = function(objectId,formNode,callback,errback)
            {
                if( self.getOnlineStatus() === self.ONLINE)
                {
                    return this._addAttachment(objectId,formNode,
                        function()
                        {
                            console.log(arguments);
                            self.emit(self.events.ATTACHMENTS_SENT,arguments);
                            callback && callback.apply(this,arguments);
                        },
                        function(err)
                        {
                            console.log("addAttachment: " + err);
                            errback && errback.apply(this,arguments);
                        }
                    );
                }

                if( !self.attachmentsStore )
                {
                    console.log("in order to support attachments you need to call initAttachments() method of offlineFeaturesManager");
                    return;
                }
                
                var files = this._getFilesFromForm(formNode);
                var file = files[0]; // addAttachment can only add one file, so the rest -if any- are ignored

                var deferred = new Deferred();
                var attachmentId = this._getNextTempId();
                self.attachmentsStore.store(this.url, attachmentId, objectId, file, function(success, newAttachment)
                {
                    var returnValue = { attachmentId: attachmentId, objectId:objectId, success:success };
                    if( success )
                    {
                        self.emit(self.events.ATTACHMENT_ENQUEUED,returnValue);
                        callback && callback(returnValue);
                        deferred.resolve(returnValue);

                        // replace the default URL that is set by attachmentEditor with the local file URL
                        var attachmentUrl = this._url.path + "/" + objectId + "/attachments/" + attachmentId;
                        var attachmentElement = query("[href=" + attachmentUrl + "]");
                        attachmentElement.attr("href", newAttachment.url);
                    }
                    else
                    {
                        returnValue.error = "can't store attachment";
                        errback && errback(returnValue);
                        deferred.reject(returnValue);                            
                    }
                }.bind(this));

                return deferred;
            };

            layer.deleteAttachments = function(objectId,attachmentsIds,callback,errback)
            {
                if( self.getOnlineStatus() === self.ONLINE)
                {
                    var def = this._deleteAttachments(objectId,attachmentsIds,
                        function()
                        {
                            callback && callback.apply(this,arguments);
                        },
                        function(err)
                        {
                            console.log("deleteAttachments: " + err);
                            errback && errback.apply(this,arguments);
                        });
                    return def;
                }

                if( !self.attachmentsStore )
                {
                    console.log("in order to support attachments you need to call initAttachments() method of offlineFeaturesManager");
                    return;
                }

                // case 1.- it is a new attachment
                // case 2.- it is an already existing attachment
                // only case 1 is supported right now

                // asynchronously delete each of the attachments
                var promises = [];
                attachmentsIds.forEach(function(attachmentId)
                {
                    attachmentId = parseInt(attachmentId,10); // to number
                    console.assert( attachmentId<0 , "we only support deleting local attachments");
                    var deferred = new Deferred();
                    self.attachmentsStore.delete(attachmentId, function(success)
                    {
                        var result = { objectId: objectId, attachmentId: attachmentId, success: success };
                        deferred.resolve(result);
                    });
                    promises.push(deferred);
                }, this);

                // call callback once all deletes have finished
                var allPromises = all(promises);
                allPromises.then( function(results)
                {
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
             */
            layer.applyEdits = function(adds,updates,deletes,callback,errback)
            {
                // inside this method, 'this' will be the FeatureLayer
                // and 'self' will be the offlineFeatureLayer object

                if( self.getOnlineStatus() === self.ONLINE)
                {
                    var def = this._applyEdits(adds,updates,deletes,
                        function()
                        {
                            self.emit(self.events.EDITS_SENT,arguments);
                            callback && callback.apply(this,arguments);
                        },
                        errback);
                    return def;
                }

                var deferred = new Deferred();
                var results = {	addResults:[],updateResults:[], deleteResults:[] };
                var updatesMap = {};

                this.onBeforeApplyEdits(adds, updates, deletes);

                adds = adds || [];
                adds.forEach(function(addEdit)
                {
                    var objectId = this._getNextTempId();
                    addEdit.attributes[ this.objectIdField ] = objectId;
                    var result = self._editStore.pushEdit(self._editStore.ADD, this.url, addEdit);
                    results.addResults.push({ success:result.success, error: result.error, objectId: objectId});
                    if(result.success)
                    {
                        var phantomAdd = new Graphic(
                            addEdit.geometry,
                            self._getPhantomSymbol(addEdit.geometry, self._editStore.ADD),
                            {
                                objectId: objectId
                            });
                        this._phantomLayer.add(phantomAdd);
						domAttr.set(phantomAdd.getNode(),"stroke-dasharray","10,4");
						domStyle.set(phantomAdd.getNode(), "pointer-events","none");
                    }
                },this);

                updates = updates || [];
                updates.forEach(function(updateEdit)
                {
                    var objectId = updateEdit.attributes[ this.objectIdField ];
                    var result = self._editStore.pushEdit(self._editStore.UPDATE, this.url, updateEdit);
                    results.updateResults.push({success:result.success, error: result.error, objectId: objectId});
                    updatesMap[ objectId ] = updateEdit;
                    if(result.success)
                    {
                        var phantomUpdate = new Graphic(
                            updateEdit.geometry,
                            self._getPhantomSymbol(updateEdit.geometry, self._editStore.UPDATE),
                            {
                                objectId: objectId
                            });
                        this._phantomLayer.add(phantomUpdate);
						domAttr.set(phantomUpdate.getNode(),"stroke-dasharray","5,2");
						domStyle.set(phantomUpdate.getNode(), "pointer-events","none");
                    }
                },this);

                deletes = deletes || [];
                deletes.forEach(function(deleteEdit)
                {
                    var objectId = deleteEdit.attributes[ this.objectIdField ];
                    var result = self._editStore.pushEdit(self._editStore.DELETE, this.url, deleteEdit);
                    results.deleteResults.push({success:result.success, error: result.error, objectId: objectId});
                    if(result.success)
                    {
                        var phantomDelete = new Graphic(
                            deleteEdit.geometry,
                            self._getPhantomSymbol(deleteEdit.geometry, self._editStore.DELETE),
                            {
                                objectId: objectId
                            });
                        this._phantomLayer.add(phantomDelete);
						domAttr.set(phantomDelete.getNode(),"stroke-dasharray","4,4");
						domStyle.set(phantomDelete.getNode(), "pointer-events","none");
                    }
                    if( self.attachmentsStore )
                    {                    
                        // delete local attachments of this feature, if any... we just launch the delete and don't wait for it to complete
                        self.attachmentsStore.deleteAttachmentsByFeatureId(this.url, objectId, function(deletedCount)
                        {
                            console.log("deleted",deletedCount,"attachments of feature",objectId);
                        });
                    }
                },this);

                /* we already pushed the edits into the local store, now we let the FeatureLayer to do the local updating of the layer graphics */
                setTimeout(function()
                {
                    this._editHandler(results, adds, updatesMap, callback, errback, deferred);
                    self.emit(self.events.EDITS_ENQUEUED, results);
                }.bind(this),0);
                return deferred;
            }; // layer.applyEdits()

            /**
             * Converts an array of graphics/features into JSON
             * @param features
             * @param updateEndEvent
             * @param callback
             */
            layer.convertGraphicLayerToJSON = function(features,updateEndEvent,callback){
                var layerDefinition = {};
                layerDefinition.objectIdFieldName = updateEndEvent.target.objectIdField;
                layerDefinition.globalIdFieldName = updateEndEvent.target.globalIdField;
                layerDefinition.geometryType = updateEndEvent.target.geometryType;
                layerDefinition.spatialReference = updateEndEvent.target.spatialReference;
                layerDefinition.fields = updateEndEvent.target.fields;

                var length = features.length;
                var jsonArray = [];
                for(var i=0; i < length; i++){
                    var jsonGraphic = features[i].toJson();
                    jsonArray.push(jsonGraphic);
                    if(i == (length - 1)) {
                        var featureJSON = JSON.stringify(jsonArray);
                        var layerDefJSON = JSON.stringify(layerDefinition);
                        callback(featureJSON,layerDefJSON);
                        break;
                    }
                }
            };

            /**
             * Sets the phantom layer with a new features.
             * @param graphicsArray an array of Graphics
             */
            layer.setPhantomLayerGraphics = function(graphicsArray){
                var length = graphicsArray.length;

                if(length > 0){
                    for(var i=0; i < length; i++){
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
            layer.getPhantomLayerGraphics = function(callback){
                //return layer._phantomLayer.graphics;
                var graphics = layer._phantomLayer.graphics;
                var length = layer._phantomLayer.graphics.length;
                var jsonArray = [];
                for(var i=0; i < length; i++){
                    var jsonGraphic = graphics[i].toJson();
                    jsonArray.push(jsonGraphic);
                    if(i == (length - 1)) {
                        var graphicsJSON = JSON.stringify(jsonArray);
                        callback(graphicsJSON);
                        break;
                    }
                }
            };

            /**
             * Create a featureDefinition
             * @param featureLayer
             * @param featuresArr
             * @param geometryType
             * @param callback
             */
            layer.getFeatureDefinition = function(/* Object */ featureLayer,/* Array */ featuresArr,/* String */ geometryType,callback){

                var featureDefinition = {
                    "layerDefinition":featureLayer,
                    "featureSet":{
                        "features": featuresArr,
                        "geometryType": geometryType
                    }

                }

                callback(featureDefinition);
            }

            /* internal methods */

            layer._getFilesFromForm = function(formNode)
            {
                var files = [];
                var inputNodes = array.filter(formNode.elements, function(node) { return node.type === "file"; });
                inputNodes.forEach(function(inputNode)
                {
                    files.push.apply(files,inputNode.files);
                },this);
                return files;
            };

            layer._replaceFeatureIds = function(tempObjectIds,newObjectIds,callback)
            {
                console.log("replacing ids of attachments",tempObjectIds, newObjectIds);
                console.assert( tempObjectIds.length === newObjectIds.length, "arrays must be the same length");

                if(!tempObjectIds.length)
                {
                    console.log("no ids to replace!");
                    callback(0);
                }

                var i, n = tempObjectIds.length;
                var count = n;
                var successCount = 0;
                for(i=0; i<n; i++)
                {
                    self.attachmentsStore.replaceFeatureId(this.url, tempObjectIds[i], newObjectIds[i], function(success)
                    {
                        --count;
                        successCount += (success? 1:0);
                        if( count === 0)
                        {
                            callback(successCount);                                
                        }
                    }.bind(this));
                }
            };

            // we need to identify ADDs before sending them to the server
            // we assign temporary ids (using negative numbers to distinguish them from real ids)
            layer._nextTempId = -1;
            layer._getNextTempId = function()
            {
                return this._nextTempId--;
            };

            function _initPhantomLayer()
            {
				try
				{
                    layer._phantomLayer = new GraphicsLayer({opacity:0.8});
					layer._map.addLayer(layer._phantomLayer);
                }
				catch(err)
				{
                    console.log("Unable to init PhantomLayer");
                }
            }

            _initPhantomLayer();

        }, // extend

        /**
         * Forces library into an offline state. Any edits applied during this condition will be stored locally
         */
        goOffline: function()
        {
            console.log("offlineFeatureManager going offline");
            this._onlineStatus = this.OFFLINE;
        },

        /**
         * Forces library to return to an online state. If there are pending edits,
         * an attempt will be made to sync them with the remote feature server
         * @param callback callback( boolean, errors )
         */
        goOnline: function(callback)
        {
            console.log("offlineFeaturesManager going online");
            this._onlineStatus = this.RECONNECTING;
            this._replayStoredEdits(function(success,responses)
            {
                var result = { features: { success:success, responses: responses} };
                if( this.attachmentsStore != null )
                {
                    console.log("sending attachments");
                    this._sendStoredAttachments(function(success, responses)
                    {
                        this._onlineStatus = this.ONLINE;
                        result.attachments = { success: success, responses:responses } ;
                        callback && callback(result);
                    }.bind(this));
                }
                else
                {
                    this._onlineStatus = this.ONLINE;
                    callback && callback(result);
                }
            }.bind(this));
        },

        /**
         * Determines if offline or online condition exists
         * @returns {string} ONLINE or OFFLINE
         */
        getOnlineStatus: function()
        {
            return this._onlineStatus;
        },

        /**
         * A string value representing human readable information on pending edits
         * @param edit
         * @returns {string}
         */
        getReadableEdit: function(edit)
        {
            var layer = this._featureLayers[ edit.layer ];
            var graphic = this._editStore._deserialize(edit.graphic);
            var readableGraphic = graphic.geometry.type;
            var layerId = edit.layer.substring(edit.layer.lastIndexOf("/")+1);
            if(layer)
            {
                readableGraphic += " [id=" + graphic.attributes[layer.objectIdField] + "]";                
            }
            return "o:" + edit.operation + ", l:" + layerId + ", g:" + readableGraphic;
        },

        /* internal methods */

        //
        // phantom symbols
        //

        _phantomSymbols: [],

        _getPhantomSymbol: function(geometry, operation)
        {
            if( this._phantomSymbols.length === 0)
            {
                var color = [0,255,0,255];
                var width = 1.5;

                this._phantomSymbols['point'] = [];
                this._phantomSymbols['point'][this._editStore.ADD] = new SimpleMarkerSymbol({
                    "type": "esriSMS", "style": "esriSMSCross",
                    "xoffset": 10, "yoffset": 10,
                    "color": [255,255,255,0], "size": 15,
                    "outline": { "color": color, "width": width, "type": "esriSLS", "style": "esriSLSSolid" }
                });
                this._phantomSymbols['point'][this._editStore.UPDATE] = new SimpleMarkerSymbol({
                    "type": "esriSMS", "style": "esriSMSCircle",
                    "xoffset": 0, "yoffset": 0,
                    "color": [255,255,255,0], "size": 15,
                    "outline": { "color": color, "width": width, "type": "esriSLS", "style": "esriSLSSolid" }
                });
                this._phantomSymbols['point'][this._editStore.DELETE] = new SimpleMarkerSymbol({
                    "type": "esriSMS", "style": "esriSMSX",
                    "xoffset": 0, "yoffset": 0,
                    "color": [255,255,255,0], "size": 15,
                    "outline": { "color": color, "width": width, "type": "esriSLS", "style": "esriSLSSolid" }
                });
                this._phantomSymbols['multipoint'] = null;

                this._phantomSymbols['polyline'] = [];
                this._phantomSymbols['polyline'][this._editStore.ADD] = new SimpleLineSymbol({
                    "type": "esriSLS", "style": "esriSLSSolid",
                    "color": color,"width": width
                });
                this._phantomSymbols['polyline'][this._editStore.UPDATE] = new SimpleLineSymbol({
                    "type": "esriSLS", "style": "esriSLSSolid", 
                    "color": color,"width": width
                });
                this._phantomSymbols['polyline'][this._editStore.DELETE] = new SimpleLineSymbol({
                    "type": "esriSLS", "style": "esriSLSSolid", 
                    "color": color,"width": width
                });

                this._phantomSymbols['polygon'] = [];
                this._phantomSymbols['polygon'][this._editStore.ADD] = new SimpleFillSymbol({
                    "type": "esriSFS",
                    "style": "esriSFSSolid",
                    "color": [255,255,255,0],
                    "outline": { "type": "esriSLS", "style": "esriSLSSolid", "color": color, "width": width }
                });
                this._phantomSymbols['polygon'][this._editStore.UPDATE] = new SimpleFillSymbol({
                    "type": "esriSFS",
                    "style": "esriSFSSolid",
                    "color": [255,255,255,0],
                    "outline": { "type": "esriSLS", "style": "esriSLSDash", "color": color, "width": width }
                });
                this._phantomSymbols['polygon'][this._editStore.DELETE] = new SimpleFillSymbol({
                    "type": "esriSFS",
                    "style": "esriSFSSolid",
                    "color": [255,255,255,0],
                    "outline": { "type": "esriSLS", "style": "esriSLSDot", "color": color, "width": width }
                });
            }

            return this._phantomSymbols[ geometry.type ][ operation ];
        },

        //
        // methods to handle attachment uploads
        //

        _fieldSegment: function(name,value)
        {
            return "Content-Disposition: form-data; name=\"" + name + "\"\r\n\r\n" + value + "\r\n";
        },

        _fileSegment: function(fieldName,fileName,fileType,fileContent)
        {
            return "Content-Disposition: form-data; name=\"" + fieldName + 
            "\"; filename=\""+ fileName + 
            "\"\r\nContent-Type: " + fileType + "\r\n\r\n" +
            fileContent + "\r\n";
        },

        _uploadAttachment: function(attachment)
        {
            var dfd = new Deferred();

            var segments = [];
            segments.push( this._fieldSegment("f","json") );
            segments.push( this._fileSegment("attachment", attachment.name,attachment.contentType,attachment.content ));

            var oAjaxReq = new XMLHttpRequest();

            // surprisingly, sometimes the oAjaxReq object doesn't have the sendAsBinary() method, even if we added it to the XMLHttpRequest.prototype
            if( ! oAjaxReq.sendAsBinary )
            {                
                this._extendAjaxReq(oAjaxReq);
            }

            oAjaxReq.onload = function(result)
            {
                dfd.resolve(JSON.parse(result.target.response));
            };
            oAjaxReq.onerror = function(err)
            {
                dfd.reject(err);
            };

            // IMPORTANT!
            // Proxy path can be set to null if feature service is CORS enabled
            // Refer to "Using the Proxy Page" for more information:  https://developers.arcgis.com/en/javascript/jshelp/ags_proxy.html
            var proxy = this.proxyPath || esriConfig.defaults.io.proxyUrl || "";
            if(proxy !== ""){
                proxy += "?";
            }
            console.log("proxy:", proxy);
            oAjaxReq.open("post", proxy + attachment.featureId + "/addAttachment", true);
            var sBoundary = "---------------------------" + Date.now().toString(16);
            oAjaxReq.setRequestHeader("Content-Type", "multipart\/form-data; boundary=" + sBoundary);
            oAjaxReq.sendAsBinary("--" + sBoundary + "\r\n" + segments.join("--" + sBoundary + "\r\n") + "--" + sBoundary + "--\r\n");

            return dfd;
        },

        _deleteAttachment: function(attachmentId, uploadResult)
        {
            var dfd = new Deferred();

            console.log("upload complete", uploadResult, attachmentId);
            this.attachmentsStore.delete(attachmentId, function(success)
            {
                console.assert(success===true, "can't delete attachment already uploaded");
                console.log("delete complete", success);
                dfd.resolve(uploadResult);
            });

            return dfd;
        },

        _sendStoredAttachments: function(callback)
        {
            this.attachmentsStore.getAllAttachments(function(attachments)
            {
                console.log("we have",attachments.length,"attachments to upload");

                var promises = [];
                attachments.forEach(function(attachment)
                {
                    console.log("sending attachment", attachment.id, "to feature", attachment.featureId);
                    var deleteCompleted = 
                        this._uploadAttachment(attachment)
                        .then(function(uploadResult)
                        {
                            if( uploadResult.addAttachmentResult && uploadResult.addAttachmentResult.success === true)
                            {                        
                                console.log("upload success", uploadResult.addAttachmentResult.success);
                                return this._deleteAttachment(attachment.id, uploadResult);
                            }
                            else
                            {                                
                                console.log("upload failed", uploadResult);
                                return null;
                            }
                        }.bind(this),
                        function(err)
                        {
                            console.log("failed uploading attachment", attachment);
                        }
                    );
                    promises.push( deleteCompleted );
                },this);
                console.log("promises", promises.length);
                var allPromises = all(promises);
                allPromises.then(function(results)
                {
                    console.log(results);
                    callback && callback(true, results);
                },
                function(err)
                {
                    console.log("error!",err);
                    callback && callback(false, err);
                });
            }.bind(this));
        },

        //
        // methods to send features back to the server
        //

        _optimizeEditsQueue: function()
        {
            var optimizedEdits = {},
                editCount = this._editStore.pendingEditsCount(),
                optimizedCount = 0;

            var edit, layer;
            var layerEdits, objectId;

            while( this._editStore.hasPendingEdits() )
            {
                edit = this._editStore.popFirstEdit();
                layer = this._featureLayers[ edit.layer ];

                if( ! (edit.layer in optimizedEdits) )
                {
                    optimizedEdits[edit.layer] = {};
                }

                layerEdits = optimizedEdits[edit.layer];
                objectId = edit.graphic.attributes[ layer.objectIdField ];

                if( !( objectId in layerEdits) )
                {
                    // first edit we see of this feature, no optimization to apply
                    layerEdits[ objectId ] = edit;
                    optimizedCount += 1;
                }
                else
                {
                    // we already have seen one edit for this same feature... we can merge the two edits in a single operation
                    switch( edit.operation )
                    {
                        case this._editStore.ADD:
                            /* impossible!! */
                            throw("can't add the same feature twice!");
                        case this._editStore.UPDATE:
                            layerEdits[ objectId ].graphic = edit.graphic;
                            break;
                        case this._editStore.DELETE:
                            if(objectId < 0)
                            {
                                delete layerEdits[ objectId ];
                                optimizedCount -= 1;
                            }
                            else
                            {
                                layerEdits[objectId].operation = this._editStore.DELETE;
                            }
                            break;
                    }
                }
                if( Object.keys(layerEdits).length === 0 )
                {
                    delete optimizedEdits[edit.layer];
                }
            }

            console.log("optimized", editCount, "edits into", optimizedCount,"edits of", Object.keys(optimizedEdits).length ,"layers");
            return optimizedEdits;
        },

         _replayStoredEdits: function(callback)
        {
            if( this._editStore.hasPendingEdits() )
            {
                //
                // flatten the queue into unique edits for each feature, grouped by FeatureLayer
                //
                var optimizedEdits = this._optimizeEditsQueue();
                var promises = {};

                if( Object.keys(optimizedEdits).length === 0 )
                {
                    this.emit(this.events.ALL_EDITS_SENT);
                    callback && callback(true, {});
                    return;
                }

                //
                // send edits for each of the layers
                //
                var layerUrl, layer, layerEdits;
                var adds, updates, deletes;
                var tempObjectIds;
                var objectId;
                var edit;
                var i,g;

                for(layerUrl in optimizedEdits)
                {
                    if(optimizedEdits.hasOwnProperty(layerUrl))
                    {
                        layer = this._featureLayers[ layerUrl ];

                        // If the layer has attachments then check to see if the attachmentsStore has been initialized
                        if(this.attachmentsStore == null && layer.hasAttachments){
                            console.log("ERROR: you need to run OfflineFeaturesManager.initAttachments(). Check the Attachments doc for more info.")
                            throw new Error("OfflineFeaturesManager: Attachments aren't initialized.");
                        }

                        // Assign the attachmentsStore to the layer as a private var so we can access it from
                        // the promises applyEdits() method.
                        layer._attachmentsStore = this.attachmentsStore;

                        layerEdits = optimizedEdits[layerUrl];

                        console.assert(Object.keys(layerEdits).length !== 0);

                        layer.__onEditsComplete = layer.onEditsComplete;
                        layer.onEditsComplete = function() { console.log("intercepting events onEditsComplete"); };
                        layer.__onBeforeApplyEdits = layer.onBeforeApplyEdits;
                        layer.onBeforeApplyEdits = function() { console.log("intercepting events onBeforeApplyEdits");};

                        adds = []; updates = []; deletes = [];
                        tempObjectIds = [];                    

                        for(objectId in layerEdits)
                        {
                            if(layerEdits.hasOwnProperty(objectId))
                            {
                                edit = layerEdits[objectId];
                                switch(edit.operation)
                                {
                                    case this._editStore.ADD:
                                        for(i=0; i<layer.graphics.length; i++)
                                        {
                                            g = layer.graphics[i];
                                            if( g.attributes[layer.objectIdField] === edit.graphic.attributes[layer.objectIdField] )
                                            {
                                                layer.remove(g);
                                                break;
                                            }
                                        }
                                        tempObjectIds.push(edit.graphic.attributes[ layer.objectIdField ]);
                                        delete edit.graphic.attributes[ layer.objectIdField ];
                                        adds.push(edit.graphic);
                                        break;
                                    case this._editStore.UPDATE:
                                        updates.push(edit.graphic);
                                        break;
                                    case this._editStore.DELETE:
                                        deletes.push(edit.graphic);
                                        break;
                                }
                            }
                        }

                        // closure to keep layer and tempObjectIds values
                        promises[layerUrl] = (function(layer,tempObjectIds)
                        {
                            // unfortunately we can't use the promise that is returned from layer._applyEdits()
                            // because it returns 3 result parameters (addResults,updateResults,deleteResults)
                            // and when we combine all promises in the dojo/promise/all() method below this only
                            // supports promises that return one value
                            var dfd = new Deferred();
                            layer._applyEdits(adds,updates,deletes,
                                function(addResults,updateResults,deleteResults)
                                {
                                    layer._phantomLayer.clear();
                                    layer.onEditsComplete = layer.__onEditsComplete; delete layer.__onEditsComplete;
                                    layer.onBeforeApplyEdits = layer.__onBeforeApplyEdits; delete layer.__onBeforeApplyEdits;
                                    var newObjectIds = addResults.map(function(r){ return r.objectId; });

                                    // We use a different pattern if the attachmentsStore is valid and the layer has attachments
                                    if( layer._attachmentsStore != null && layer.hasAttachments && tempObjectIds.length > 0)
                                    {
                                        layer._replaceFeatureIds(tempObjectIds,newObjectIds,function(success)
                                        {
                                            dfd.resolve({addResults:addResults,updateResults:updateResults,deleteResults:deleteResults}); // wrap three arguments in a single object
                                        });
                                    }
                                    else
                                    {
                                        dfd.resolve({addResults:addResults,updateResults:updateResults,deleteResults:deleteResults}); // wrap three arguments in a single object                                    
                                    }
                                },
                                function(error)
                                {
                                    layer.onEditsComplete = layer.__onEditsComplete; delete layer.__onEditsComplete;
                                    layer.onBeforeApplyEdits = layer.__onBeforeApplyEdits; delete layer.__onBeforeApplyEdits;
                                    dfd.reject(error);
                                }
                            );
                            return dfd;
                        }(layer,tempObjectIds));
                    }
                }

                //
                // wait for all requests to finish
                //
                var allPromises = all(promises);
                allPromises.then(
                    function(responses)
                    {
                        console.log("all responses are back");
                        this.emit(this.events.EDITS_SENT);
                        this.emit(this.events.ALL_EDITS_SENT);
                        callback && callback(true,responses);
                    }.bind(this),
                    function(errors)
                    {
                        console.log("ERROR!!");
                        console.log(errors);
                        callback && callback(false,errors);
                    }.bind(this));
            } // hasPendingEdits()
            else
            {
                this.emit(this.events.ALL_EDITS_SENT);
                callback && callback(true, {});
            }
        }

    }); // declare
}); // define

/**
 * Creates a namespace for the non-AMD libraries in this directory
 */


if(typeof O != "undefined"){
    O.esri.Edit = {}
}
else{
    O = {};
    O.esri = {
        Edit: {}
    }
}

"use strict";

O.esri.Edit.EditStore = function(){

	/* private consts */
	var EDITS_QUEUE_KEY = "esriEditsQueue";
	var SEPARATOR = "|@|";

    //
    // public interface
    //

    // enum

    this.ADD = "add";
    this.UPDATE = "update";
    this.DELETE = "delete";

    // ERROR_DUPLICATE_EDIT: "Attempt to insert duplicated edit",
    this.ERROR_LOCALSTORAGE_FULL = "LocalStorage capacity exceeded";

    this.isSupported = function()
    {
        // http://stackoverflow.com/questions/11214404/how-to-detect-if-browser-supports-html5-local-storage
        var mod = "esriLocalStorageTest";
        try {
            window.localStorage.setItem(mod, mod);
            window.localStorage.removeItem(mod);
            return true;
        } catch(e) {
            return false;
        }
    };

    this.pushEdit = function(operation,layer,graphic)
    {
        var edit = {
            operation: operation,
            layer: layer,
            graphic: this._serialize(graphic)
        };

        var edits = this.retrieveEditsQueue();
        edits.push(edit);
        var success = this._storeEditsQueue(edits);
        return { success: success, error: success? undefined : {code: 1000, description:this.ERROR_LOCALSTORAGE_FULL} };
    };

    this.peekFirstEdit = function()
    {
        var edits = this.retrieveEditsQueue();
        var firstEdit;

        if( edits )
        {
            firstEdit = edits[0];
            firstEdit.graphic = this._deserialize(firstEdit.graphic);
            return firstEdit;
        }
        return null;
    };

    this.popFirstEdit = function()
    {
        var edits = this.retrieveEditsQueue();
        var firstEdit;

        if( edits )
        {
            firstEdit = edits.shift();
            this._storeEditsQueue(edits);
            firstEdit.graphic = this._deserialize(firstEdit.graphic);
            return firstEdit;
        }
        return null;
    };

    this.hasPendingEdits = function()
    {
        var storedValue = window.localStorage.getItem(EDITS_QUEUE_KEY) || "";
        return ( storedValue !== "" );
    };

    this.pendingEditsCount = function()
    {
        var storedValue = window.localStorage.getItem(EDITS_QUEUE_KEY) || "";

        if( storedValue === "" )
        {
            return 0;	// fast easy case
        }

        var editsArray = this._unpackArrayOfEdits(storedValue);
        return editsArray.length;
    };

    this.resetEditsQueue = function()
    {
        window.localStorage.setItem(EDITS_QUEUE_KEY, "");
    };

    this.retrieveEditsQueue = function()
    {
        var storedValue = window.localStorage.getItem(EDITS_QUEUE_KEY) || "";
        return this._unpackArrayOfEdits(storedValue);
    };

    this.getEditsStoreSizeBytes = function()
    {
        var editsQueueValue = window.localStorage.getItem(EDITS_QUEUE_KEY);

        return (editsQueueValue? EDITS_QUEUE_KEY.length + editsQueueValue.length : 0);
    }

    this.getLocalStorageSizeBytes = function()
    {
        var bytes = 0,
            key, value;

        for(key in window.localStorage )
        {
            if( window.localStorage.hasOwnProperty(key))
            {
                value = window.localStorage.getItem(key);
                bytes += key.length + value.length;
            }
        }
        return bytes;
    };

    //
    // internal methods
    //

    //
    // graphic serialization/deserialization
    //
    this._serialize = function(graphic)
    {
        // keep only attributes and geometry, that are the values that get sent to the server by applyEdits()
        // see http://resources.arcgis.com/en/help/arcgis-rest-api/index.html#/Apply_Edits_Feature_Service_Layer/02r3000000r6000000/
        // use graphic's built-in serializing method
        var json = graphic.toJson();
        var jsonClean =
        {
            attributes: json.attributes,
            geometry: json.geometry
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

    this._storeEditsQueue = function(edits)
    {
        try
        {
            var serializedEdits = this._packArrayOfEdits(edits);
            window.localStorage.setItem(EDITS_QUEUE_KEY, serializedEdits);
            return true;
        }
        catch(err)
        {
            return false;
        }
    };

    this._packArrayOfEdits = function(edits)
    {
        var serializedEdits = [];
        edits.forEach(function(edit)
        {
            serializedEdits.push( JSON.stringify(edit) );
        });
        return serializedEdits.join(SEPARATOR);
    };

    this._unpackArrayOfEdits = function(serializedEdits)
    {
        if( !serializedEdits )
        {
            return [];
        }

        var edits = [];
        serializedEdits.split(SEPARATOR).forEach( function(serializedEdit)
        {
            edits.push( JSON.parse(serializedEdit) );
        });

        return edits;
    };

    this._isEditDuplicated = function(newEdit,edits)
    {
        var i,
            edit;

        for(i=0; i<edits.length; i++)
        {
            edit = edits[i];
            if( edit.operation === newEdit.operation &&
                edit.layer     === newEdit.layer     &&
                edit.graphic   === newEdit.graphic )
            {
                return true;
            }
        }
        return false;
    }
};


/*global IDBKeyRange,indexedDB */

    "use strict";
O.esri.Edit.AttachmentsStore = function()
	{
        this._db = null;

        var DB_NAME = "attachments_store";
        var OBJECT_STORE_NAME = "attachments";

		this.isSupported = function()
		{
            if(!window.indexedDB){
                return false;
            }
            return true;
		};

		this.store = function(featureLayerUrl, attachmentId, objectId, attachmentFile, callback)
		{
            try
            {
                // first of all, read file content
                this._readFile(attachmentFile, function(fileContent)
                {
                    // now, store it in the db
                    var newAttachment = 
                    {
                        id: attachmentId,
                        objectId: objectId,
                        featureId: featureLayerUrl + "/" + objectId,
                        contentType: attachmentFile.type,
                        name: attachmentFile.name,
                        size: attachmentFile.size,
                        url: this._createLocalURL(attachmentFile),
                        content: fileContent
                    };

                    var transaction = this._db.transaction([OBJECT_STORE_NAME],"readwrite");

                    transaction.oncomplete = function(event) 
                    {
                        callback(true, newAttachment);
                    };

                    transaction.onerror = function(event) 
                    {
                        callback(false,event.target.error.message);
                    };

                    var objectStore = transaction.objectStore(OBJECT_STORE_NAME);
                    var request = objectStore.put(newAttachment);
                    request.onsuccess = function(event) 
                    {
                        //console.log("item added to db " + event.target.result);
                    };

                }.bind(this));
            }
            catch(err)
            {
                console.log("AttachmentsStore: " + err.stack);
                callback(false,err.stack);
            }
		};

		this.retrieve = function(attachmentId, callback)
		{
            console.assert(this._db !== null, "indexeddb not initialized");

            var objectStore = this._db.transaction([OBJECT_STORE_NAME]).objectStore(OBJECT_STORE_NAME);
            var request = objectStore.get(attachmentId);
            request.onsuccess = function(event)
            {
                var result = event.target.result;
                if(!result){
                    callback(false,"not found");
                }
                else{
                    callback(true,result);
                }
            };
            request.onerror = function(err)
            {
                console.log(err);
                callback(false,err);
            };
		};

		this.getAttachmentsByFeatureId = function(featureLayerUrl,objectId,callback)
		{
            console.assert(this._db !== null, "indexeddb not initialized");

			var featureId = featureLayerUrl + "/" + objectId;
			var attachments = [];

			var objectStore = this._db.transaction([OBJECT_STORE_NAME]).objectStore(OBJECT_STORE_NAME);
			var index = objectStore.index("featureId");
			var keyRange = IDBKeyRange.only(featureId);
			index.openCursor(keyRange).onsuccess = function(evt)
			{
				var cursor = evt.target.result;
				if(cursor)
				{
					attachments.push( cursor.value );
					cursor.continue();
				}
				else
				{
					callback(attachments);
				}
			};
		};

        this.getAttachmentsByFeatureLayer = function(featureLayerUrl,callback)
        {
            console.assert(this._db !== null, "indexeddb not initialized");

            var attachments = [];

            var objectStore = this._db.transaction([OBJECT_STORE_NAME]).objectStore(OBJECT_STORE_NAME);
            var index = objectStore.index("featureId");
            var keyRange = IDBKeyRange.bound(featureLayerUrl + "/", featureLayerUrl + "/A");
            index.openCursor(keyRange).onsuccess = function(evt)
            {
                var cursor = evt.target.result;
                if(cursor)
                {
                    attachments.push( cursor.value );
                    cursor.continue();
                }
                else
                {
                    callback(attachments);
                }
            };
        };

        this.getAllAttachments = function(callback)
        {
            console.assert(this._db !== null, "indexeddb not initialized");

            var attachments = [];

            var objectStore = this._db.transaction([OBJECT_STORE_NAME]).objectStore(OBJECT_STORE_NAME);
            objectStore.openCursor().onsuccess = function(evt)
            {
                var cursor = evt.target.result;
                if(cursor)
                {
                    attachments.push( cursor.value );
                    cursor.continue();
                }
                else
                {
                    callback(attachments);
                }
            };
        };

		this.deleteAttachmentsByFeatureId = function(featureLayerUrl,objectId,callback)
		{
            console.assert(this._db !== null, "indexeddb not initialized");

			var featureId = featureLayerUrl + "/" + objectId;

			var objectStore = this._db.transaction([OBJECT_STORE_NAME],"readwrite").objectStore(OBJECT_STORE_NAME);
			var index = objectStore.index("featureId");
			var keyRange = IDBKeyRange.only(featureId);
			var deletedCount = 0;
			index.openCursor(keyRange).onsuccess = function(evt)
			{
				var cursor = evt.target.result;
				if(cursor)
				{
                    var attachment = cursor.value;
                    this._revokeLocalURL(attachment);
					objectStore.delete(cursor.primaryKey);
					deletedCount++;
					cursor.continue();
				}
				else
				{
					setTimeout(function(){callback(deletedCount);},0);
				}
			}.bind(this);
		};

		this.delete = function(attachmentId, callback)
		{
            console.assert(this._db !== null, "indexeddb not initialized");

            // before deleting an attachment we must revoke the blob URL that it contains
            // in order to free memory in the browser
            this.retrieve(attachmentId, function(success, attachment)
            {
                if( !success )
                {
                    callback(false,"attachment " + attachmentId + " not found");
                    return;
                }

                this._revokeLocalURL(attachment);

                var request = this._db.transaction([OBJECT_STORE_NAME],"readwrite")
                    .objectStore(OBJECT_STORE_NAME)
                    .delete(attachmentId);
                request.onsuccess = function(event)
                {
                    setTimeout(function(){callback(true);},0);
                };
                request.onerror = function(err)
                {
                    callback(false,err);
                };
            }.bind(this));
		};

        this.deleteAll = function(callback)
        {
            console.assert(this._db !== null, "indexeddb not initialized");

            this.getAllAttachments(function(attachments)
            {
                attachments.forEach(function(attachment)
                {
                    this._revokeLocalURL(attachment);
                },this);

                var request = this._db.transaction([OBJECT_STORE_NAME],"readwrite")
                    .objectStore(OBJECT_STORE_NAME)
                    .clear();
                request.onsuccess = function(event)
                {
                    setTimeout(function(){callback(true);},0);
                };
                request.onerror = function(err)
                {
                    callback(false,err);
                };
            }.bind(this));
        };

        this.replaceFeatureId = function(featureLayerUrl, oldId, newId, callback)
        {
            console.assert(this._db !== null, "indexeddb not initialized");

            var featureId = featureLayerUrl + "/" + oldId;

            var objectStore = this._db.transaction([OBJECT_STORE_NAME],"readwrite").objectStore(OBJECT_STORE_NAME);
            var index = objectStore.index("featureId");
            var keyRange = IDBKeyRange.only(featureId);
            var replacedCount = 0;
            index.openCursor(keyRange).onsuccess = function(evt)
            {
                var cursor = evt.target.result;
                if(cursor)
                {
                    var newFeatureId = featureLayerUrl + "/" + newId;
                    var updated = cursor.value;
                    updated.featureId = newFeatureId;
                    updated.objectId = newId;
                    objectStore.put(updated);
                    replacedCount++;
                    cursor.continue();
                }
                else
                {
                    // allow time for all changes to persist...
                    setTimeout( function() { callback(replacedCount); }, 1 );
                }
            };
        };

        this.getUsage = function(callback)
        {
            console.assert(this._db !== null, "indexeddb not initialized");

            var usage = { sizeBytes: 0, attachmentCount: 0 };

            var transaction = this._db.transaction([OBJECT_STORE_NAME])
                .objectStore(OBJECT_STORE_NAME)
                .openCursor();

            console.log("dumping keys");

            transaction.onsuccess = function(event)
            {
                var cursor = event.target.result;
                if(cursor)
                {
                    console.log(cursor.value.id, cursor.value.featureId, cursor.value.objectId);
                    var storedObject = cursor.value;
                    var json = JSON.stringify(storedObject);
                    usage.sizeBytes += json.length;
                    usage.attachmentCount += 1;
                    cursor.continue();
                }
                else
                {                        
                    callback(usage,null);
                }
            }.bind(this);
            transaction.onerror = function(err)
            {
                callback(null,err);
            };
        };

        // internal methods

        this._readFile = function(attachmentFile, callback)
        {
            var reader = new FileReader();
            reader.onload = function(evt) 
            {
                callback(evt.target.result);
            };
            reader.readAsBinaryString(attachmentFile);
        };

        this._createLocalURL = function(attachmentFile)
        {
            return window.URL.createObjectURL(attachmentFile);
        };

        this._revokeLocalURL = function(attachment)
        {
            window.URL.revokeObjectURL(attachment.url);
        };

		this.init = function(callback)
		{
			console.log("init AttachmentStore");
			
            var request = indexedDB.open(DB_NAME, 11);
            callback = callback || function(success) { console.log("AttachmentsStore::init() success:", success); }.bind(this);

            request.onerror = function(event) 
            {
                console.log("indexedDB error: " + event.target.errorCode);
                callback(false,event.target.errorCode);
            }.bind(this);

            request.onupgradeneeded = function(event) 
            {
                var db = event.target.result;

                if( db.objectStoreNames.contains(OBJECT_STORE_NAME)) 
                {
                    db.deleteObjectStore(OBJECT_STORE_NAME);
                }            

                var objectStore = db.createObjectStore(OBJECT_STORE_NAME, { keyPath: "id" });
                objectStore.createIndex("featureId","featureId", {unique: false});
            }.bind(this);

            request.onsuccess = function(event)
            {
                this._db = event.target.result;
                console.log("database opened successfully");
                callback(true);
            }.bind(this);
        };
	};

