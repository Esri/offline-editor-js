
define([
    "edit/editsStore",
    "edit/attachmentsStore",

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
	function(editsStore, AttachmentsStore,
		Evented,Deferred,all,declare,array,domAttr,domStyle,query,
		esriConfig,GraphicsLayer,Graphic,SimpleMarkerSymbol,SimpleLineSymbol,SimpleFillSymbol,urlUtils)
{
    "use strict";
    return declare([Evented],
    {
        _onlineStatus: "online",
        _featureLayers: {},

        ONLINE: "online",				// all edits will directly go to the server
        OFFLINE: "offline",             // edits will be enqueued
        RECONNECTING: "reconnecting",   // sending stored edits to the server

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
                this.attachmentsStore = new AttachmentsStore();

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
            alert("The File APIs are not fully supported in this browser.");
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
                    var result = editsStore.pushEdit(editsStore.ADD, this.url, addEdit);
                    results.addResults.push({ success:result.success, error: result.error, objectId: objectId});
                    if(result.success)
                    {
                        var phantomAdd = new Graphic(
                            addEdit.geometry,
                            self._getPhantomSymbol(addEdit.geometry, editsStore.ADD),
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
                    var result = editsStore.pushEdit(editsStore.UPDATE, this.url, updateEdit);
                    results.updateResults.push({success:result.success, error: result.error, objectId: objectId});
                    updatesMap[ objectId ] = updateEdit;
                    if(result.success)
                    {
                        var phantomUpdate = new Graphic(
                            updateEdit.geometry,
                            self._getPhantomSymbol(updateEdit.geometry, editsStore.UPDATE),
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
                    var result = editsStore.pushEdit(editsStore.DELETE, this.url, deleteEdit);
                    results.deleteResults.push({success:result.success, error: result.error, objectId: objectId});
                    if(result.success)
                    {
                        var phantomDelete = new Graphic(
                            deleteEdit.geometry,
                            self._getPhantomSymbol(deleteEdit.geometry, editsStore.DELETE),
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
            console.log("going offline");
            this._onlineStatus = this.OFFLINE;
        },

        /**
         * Forces library to return to an online state. If there are pending edits,
         * an attempt will be made to sync them with the remote feature server
         * @param callback callback( boolean, errors )
         */
        goOnline: function(callback)
        {
            console.log("going online");
            this._onlineStatus = this.RECONNECTING;
            this._replayStoredEdits(function(success,responses)
            {
                var result = { features: { success:success, responses: responses} };
                if( this.attachmentsStore ) 
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
            var graphic = editsStore._deserialize(edit.graphic);
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
                this._phantomSymbols['point'][editsStore.ADD] = new SimpleMarkerSymbol({
                    "type": "esriSMS", "style": "esriSMSCross",
                    "xoffset": 10, "yoffset": 10,
                    "color": [255,255,255,0], "size": 15,
                    "outline": { "color": color, "width": width, "type": "esriSLS", "style": "esriSLSSolid" }
                });
                this._phantomSymbols['point'][editsStore.UPDATE] = new SimpleMarkerSymbol({
                    "type": "esriSMS", "style": "esriSMSCircle",
                    "xoffset": 0, "yoffset": 0,
                    "color": [255,255,255,0], "size": 15,
                    "outline": { "color": color, "width": width, "type": "esriSLS", "style": "esriSLSSolid" }
                });
                this._phantomSymbols['point'][editsStore.DELETE] = new SimpleMarkerSymbol({
                    "type": "esriSMS", "style": "esriSMSX",
                    "xoffset": 0, "yoffset": 0,
                    "color": [255,255,255,0], "size": 15,
                    "outline": { "color": color, "width": width, "type": "esriSLS", "style": "esriSLSSolid" }
                });
                this._phantomSymbols['multipoint'] = null;

                this._phantomSymbols['polyline'] = [];
                this._phantomSymbols['polyline'][editsStore.ADD] = new SimpleLineSymbol({
                    "type": "esriSLS", "style": "esriSLSSolid",
                    "color": color,"width": width
                });
                this._phantomSymbols['polyline'][editsStore.UPDATE] = new SimpleLineSymbol({
                    "type": "esriSLS", "style": "esriSLSSolid", 
                    "color": color,"width": width
                });
                this._phantomSymbols['polyline'][editsStore.DELETE] = new SimpleLineSymbol({
                    "type": "esriSLS", "style": "esriSLSSolid", 
                    "color": color,"width": width
                });

                this._phantomSymbols['polygon'] = [];
                this._phantomSymbols['polygon'][editsStore.ADD] = new SimpleFillSymbol({
                    "type": "esriSFS",
                    "style": "esriSFSSolid",
                    "color": [255,255,255,0],
                    "outline": { "type": "esriSLS", "style": "esriSLSSolid", "color": color, "width": width }
                });
                this._phantomSymbols['polygon'][editsStore.UPDATE] = new SimpleFillSymbol({
                    "type": "esriSFS",
                    "style": "esriSFSSolid",
                    "color": [255,255,255,0],
                    "outline": { "type": "esriSLS", "style": "esriSLSDash", "color": color, "width": width }
                });
                this._phantomSymbols['polygon'][editsStore.DELETE] = new SimpleFillSymbol({
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
            var proxy = esriConfig.defaults.io.proxyUrl || "";
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
                editCount = editsStore.pendingEditsCount(),
                optimizedCount = 0;

            var edit, layer;
            var layerEdits, objectId;

            while( editsStore.hasPendingEdits() )
            {
                edit = editsStore.popFirstEdit();
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
                        case editsStore.ADD:
                            /* impossible!! */
                            throw("can't add the same feature twice!");
                        case editsStore.UPDATE:
                            layerEdits[ objectId ].graphic = edit.graphic;
                            break;
                        case editsStore.DELETE:
                            if(objectId < 0)
                            {
                                delete layerEdits[ objectId ];
                                optimizedCount -= 1;
                            }
                            else
                            {
                                layerEdits[objectId].operation = editsStore.DELETE;                                
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
            if( editsStore.hasPendingEdits() )
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
                                    case editsStore.ADD:
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
                                    case editsStore.UPDATE:
                                        updates.push(edit.graphic);
                                        break;
                                    case editsStore.DELETE:
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
                                    if( layer.hasAttachments && tempObjectIds.length > 0)
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
