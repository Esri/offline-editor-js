"use strict";

define([
    "edit/editsStore",
    "edit/dbAttachmentStore",
    "dojo/Evented",
    "dojo/_base/Deferred",
    "dojo/promise/all",
    "dojo/_base/declare",
    "dojo/_base/lang",
    "esri/layers/GraphicsLayer",
    "esri/graphic",
    "esri/symbols/SimpleMarkerSymbol",
    "esri/symbols/SimpleLineSymbol",
    "esri/symbols/SimpleFillSymbol",
    "esri/request"],
    function(editsStore,DbAttachmentStore,Evented,
             Deferred,all,declare,lang,GraphicsLayer,Graphic,SimpleMarkerSymbol,SimpleLineSymbol,SimpleFillSymbol,esriRequest)
{
    return declare([Evented],
    {
        _onlineStatus: "online",
        _featureLayers: {},

        ONLINE: "online",				// all edits will directly go to the server
        OFFLINE: "offline", 			// edits will be enqueued
        RECONNECTING: "reconnecting", 	// sending stored edits to the server

        // manager emits event when...
        events: {
            EDITS_SENT: 'edits-sent', 			// ...whenever any edit is actually sent to the server
            EDITS_ENQUEUED: 'edits-enqueued', 	// ...when an edit is enqueued (and not sent to the server)
            ALL_EDITS_SENT: 'all-edits-sent', 	// ...after going online and there are no pending edits in the queue
            ATTACHMENTS_SENT: 'attachments-sent',
            ATTACHMENTS_INFO: 'attachments-info',
            ATTACHMENTS_ADD: 'attachments-add',
            ATTACHMENTS_DELETED: 'attachments-deleted'
        },

        /**
         * Overrides a feature layer.
         * @param layer
         * @returns deferred
         */
        extend: function(layer,callback)
        {
            var self = this;

            // we keep track of the FeatureLayer object
            this._featureLayers[ layer.url ] = layer;

            /* replace the applyEdits() method */
            layer._applyEdits = layer.applyEdits;
            layer._addAttachment = layer.addAttachment;
            layer._queryAttachmentInfos = layer.queryAttachmentInfos;

            try{
                layer.offline = {
                    online: true,
                    store: new DbAttachmentStore(),
//                    proxyPath: "../../lib/proxy.php"
                    proxyPath: "http://localhost/proxy/proxy.php"
                };

                if( /*false &&*/ layer.offline.store.isSupported() )
                    layer.offline.store.init(callback);
                else
                    return callback(false, "indexedDB not supported");
            }
            catch(err){
                console.log("problem!  " + err.toString())
            }

            layer.queryAttachmentInfos = function(objectId,callback,errback){
                if( self.getOnlineStatus() == self.ONLINE)
                {
                    var def = this._queryAttachmentInfos(objectId,
                        function()
                        {
                            self.emit(self.events.ATTACHMENTS_INFO,arguments);
                            callback && callback.apply(this,arguments);
                        },
                        errback);
                    return def;
                }
                else
                {
                    return {"attachmentInfos":[]};
                }
            }

            layer.addAttachment = function(objectId,formNode,callback,errback){
                if( self.getOnlineStatus() == self.ONLINE)
                {
                    return this._sendAttachment("add",objectId,formNode,
                        function(evt){
                            self.emit(self.events.ATTACHMENTS_SENT,arguments);
                            callback
                        },
                        function(err){
                            console.log("addAttachment: " + err)
                            errback
                        }
                    )
                }
                else
                {
                    if(typeof objectId !== "undefined" || objectId.length > 0 || objectId !== null){
                        //this._storeAttachment()
                    }
                }
            }

            layer.test = function (a,c,b,d,e){
                var f=this;
                return C({url:this._url.path+"/"+c+"/"+("add"===a?"addAttachment":"updateAttachment"),
                    form:b,content:q.mixin(this._url.query,{
                        f:"json",token:this._getToken()||void 0}),
                    callbackParamName:"callback.html",handleAs:"json"}).addCallback(function(b){
                        var e="add"===a?"onAddAttachmentComplete":"onUpdateAttachmentComplete";
                        b=new D(b["add"===a?"addAttachmentResult":"updateAttachmentResult"]);
                        b.attachmentId=b.objectId;b.objectId=c;
                        f._resolve([b],e,d);return b}).addErrback(
                            function(a){f._resolve([a],null,e,null,!0)})}

            layer.deleteAttachments = function(objectId,attachmentsIds,callback,errback){
                if( self.getOnlineStatus() == self.ONLINE)
                {
                    var def = this._addAttachment(objectId,attachmentsIds,
                        function()
                        {
                            self.emit(self.events.ATTACHMENTS_DELETED,arguments);
                            callback && callback.apply(this,arguments);
                        },
                        errback);
                    return def;
                }
                else
                {
                    if(typeof objectId !== "undefined" || objectId.length > 0 || objectId !== null){
                        //this._storeAttachment()
                    }
                }
            }

            layer._storeAttachment = function(object,callback){

            }

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

                if( self.getOnlineStatus() == self.ONLINE)
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
                else
                {
                    var deferred = new Deferred();
                    var results = {	addResults:[],updateResults:[], deleteResults:[] };
                    var updatesMap = {};

                    this.onBeforeApplyEdits(adds, updates, deletes);

                    adds = adds || [];
                    adds.forEach(function(addEdit)
                    {
                        var objectId = this.getNextTempId();
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
                        }
                    },this);

                    /* we already pushed the edits into the local store, now we let the FeatureLayer to do the local updating of the layer graphics */
                    setTimeout(function()
                    {
                        this._editHandler(results, adds, updatesMap, callback, errback, deferred);
                        self.emit(self.events.EDITS_ENQUEUED, results);
                    }.bind(this),0);
                    return deferred;
                }
            }; // layer.applyEdits()

            // we need to identify ADDs before sending them to the server
            // we assign temporary ids (using negative numbers to distinguish them from real ids)
            layer._nextTempId = -1;
            layer.getNextTempId = function()
            {
                return this._nextTempId--;
            };

            function _initPhantomLayer()
            {
                try{
                    layer._phantomLayer = new GraphicsLayer({opacity:0.8});
                    layer._phantomLayer.disableMouseEvents();
                    var index = layer.getMap().graphicsLayerIds.indexOf(layer.id);
                    layer._map.addLayer(layer._phantomLayer,index-1);
                }
                catch(err){
                    console.log("Unable to init PhantomLayer");
                }
            }
            _initPhantomLayer();

        }, // extend

        _phantomSymbols: [],

        _getPhantomSymbol: function(geometry, operation)
        {
            if( this._phantomSymbols.length == 0)
            {
                var color = [0,255,0,255];
                var width = 4;

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
                    "type": "esriSLS", "style": "esriSLSDash",
                    "color": color,"width": width
                });
                this._phantomSymbols['polyline'][editsStore.DELETE] = new SimpleLineSymbol({
                    "type": "esriSLS", "style": "esriSLSDot",
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

        /**
         * Forces library into an offline state. Any edits applied during this condition will be stored locally
         */
        goOffline: function()
        {
            console.log('going offline');
            this._onlineStatus = this.OFFLINE;
        },

        /**
         * Forces library to return to an online state. If there are pending edits,
         * an attempt will be made to sync them with the remote feature server
         * @param callback callback( boolean, errors )
         */
        goOnline: function(callback)
        {
            console.log('going online');
            this._onlineStatus = this.RECONNECTING;
            this._replayStoredEdits(function()
            {
                this._onlineStatus = this.ONLINE;
                callback && callback.apply(this,arguments);
            }.bind(this));
            //this.refresh();
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
            var layerId = edit.layer.substring(edit.layer.lastIndexOf('/')+1);
            if(layer)
                readableGraphic += " [id=" + graphic.attributes[layer.objectIdField] + "]";
            return "o:" + edit.operation + ", l:" + layerId + ", g:" + readableGraphic;
        },

        /* internal methods */

        _optimizeEditsQueue: function()
        {
            // console.log("edits:", editsStore._retrieveEditsQueue().map(function(e){return this.getReadableEdit(e)},this));
            var optimizedEdits = {};
            var editCount = editsStore.pendingEditsCount();
            var optimizedCount = 0;

            while( editsStore.hasPendingEdits() )
            {
                var edit = editsStore.popFirstEdit();
                var layer = this._featureLayers[ edit.layer ];

                if( ! (edit.layer in optimizedEdits) )
                    optimizedEdits[edit.layer] = {}

                var layerEdits = optimizedEdits[edit.layer];
                var objectId = edit.graphic.attributes[ layer.objectIdField ];

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
                            break;
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
                                layerEdits[objectId].operation = editsStore.DELETE;
                            break;
                    }
                }
                if( Object.keys(layerEdits).length == 0 )
                {
                    delete optimizedEdits[edit.layer]
                }
            }

            // console.log("optimized:",optimizedEdits);
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

                if( Object.keys(optimizedEdits).length == 0 )
                {
                    this.emit(this.events.ALL_EDITS_SENT);
                    callback && callback(true, {});
                    return;
                }

                //
                // send edits for each of the layers
                //
                for(var layerUrl in optimizedEdits)
                {
                    if(!optimizedEdits.hasOwnProperty(layerUrl))
                        continue;

                    var layer = this._featureLayers[ layerUrl ];
                    var layerEdits = optimizedEdits[layerUrl];

                    console.assert(Object.keys(layerEdits).length != 0)

                    layer.__onEditsComplete = layer["onEditsComplete"];
                    layer["onEditsComplete"] = function() { console.log("intercepting events onEditsComplete");}
                    layer.__onBeforeApplyEdits = layer["onBeforeApplyEdits"];
                    layer["onBeforeApplyEdits"] = function() { console.log("intercepting events onBeforeApplyEdits");}

                    var adds = [], updates = [], deletes = [];
                    for(var objectId in layerEdits)
                    {
                        if(!layerEdits.hasOwnProperty(objectId))
                            continue;

                        var edit = layerEdits[objectId];
                        switch(edit.operation)
                        {
                            case editsStore.ADD:
                                for(var i=0; i<layer.graphics.length; i++)
                                {
                                    var g = layer.graphics[i];
                                    if( g.attributes[layer.objectIdField] == edit.graphic.attributes[layer.objectIdField] )
                                    {
                                        layer.remove(g);
                                        break;
                                    }
                                };
                                delete edit.graphic.attributes[ layer.objectIdField ];
                                adds.push(edit.graphic);
                                break;
                            case editsStore.UPDATE:
                                updates.push(edit.graphic);
                                break;
                            case editsStore.DELETE:
                                deletes.push(edit.graphic)
                                break;
                        }
                    }

                    promises[layerUrl] = function(layer)
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
                                layer["onEditsComplete"] = layer.__onEditsComplete; delete layer.__onEditsComplete;
                                layer["onBeforeApplyEdits"] = layer.__onBeforeApplyEdits; delete layer.__onBeforeApplyEdits;
                                dfd.resolve({addResults:addResults,updateResults:updateResults,deleteResults:deleteResults}); // wrap three arguments in a single object
                            },
                            function(error)
                            {
                                layer["onEditsComplete"] = layer.__onEditsComplete; delete layer.__onEditsComplete;
                                layer["onBeforeApplyEdits"] = layer.__onBeforeApplyEdits; delete layer.__onBeforeApplyEdits;
                                dfd.reject(error);
                            }
                        );
                        return dfd;
                    }(layer);
                }

                //
                // wait for all requests to finish
                //
                var allPromises = new all(promises);
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
        },

    }); // declare
}); // define
