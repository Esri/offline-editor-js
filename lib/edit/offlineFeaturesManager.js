"use strict";

define([
	"edit/editsStore", 
	"vendor/offline/offline.min",
	"dojo/Evented",
	"dojo/_base/Deferred",
	"dojo/promise/all",
	"dojo/_base/declare",
	"dojo/_base/lang",
	"esri/request"],
	function(editsStore,Offline,Evented,Deferred,all,declare,lang,esriRequest)
{
	return declare([Evented], 
	{
		_onlineStatus: "online",
		_featureLayers: {},

		ONLINE: "online",				// all edits will directly go to the server
		OFFLINE: "offline", 			// edits will be enqueued
		RECONNECTING: "reconnecting", 	// sending stored edits to the server

		extend: function(layer)
		{
			var self = this;

			// we keep track of the FeatureLayer object
			this._featureLayers[ layer.url ] = layer;

			/* replace the applyEdits() method */
			layer._applyEdits = layer.applyEdits;

			layer.applyEdits = function(adds,updates,deletes,callback,errback)
			{
				// inside this method, 'this' will be the FeatureLayer
				// and 'self' will be the offlineFeatureLayer object
				if( self.getOnlineStatus() == self.ONLINE)
				{
					var def = layer._applyEdits(adds,updates,deletes,
						function()
						{
							self.emit('edits-sent',arguments);
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
					//this.emit('before-apply-edits', [adds,updates,deletes]);

					adds = adds || [];
					adds.forEach(function(addEdit)
					{
						var objectId = this.getNextTempId();
						addEdit.attributes[ this.objectIdField ] = objectId;
						var success = editsStore.pushEdit(editsStore.ADD, this.url, addEdit);
						results.addResults.push({ success:success, objectId: objectId});
					},this);

					updates = updates || [];
					updates.forEach(function(updateEdit)
					{
						var objectId = updateEdit.attributes[ this.objectIdField ];
						var success = editsStore.pushEdit(editsStore.UPDATE, this.url, updateEdit);
						results.updateResults.push({success:success, objectId: objectId});
						updatesMap[ objectId ] = updateEdit;
					},this);

					deletes = deletes || [];
					deletes.forEach(function(deleteEdit)
					{
						var success = editsStore.pushEdit(editsStore.DELETE, this.url, deleteEdit);
						results.deleteResults.push({success:success, objectId: deleteEdit.attributes[ this.objectIdField ]});
					},this);

					/* we already pushed the edits into the local store, now we let the FeatureLayer to do the local updating of the layer graphics */
					this._editHandler(results, adds, updatesMap, callback, errback, deferred);
					self.emit('edits-enqueued', results);
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

		}, // extend


		goOffline: function()
		{
			console.log('going offline');
			this._onlineStatus = this.OFFLINE;
		},

		goOnline: function(callback)
		{
			console.log('going online');
			this._onlineStatus = this.RECONNECTING;
			this.replayStoredEdits(function()
			{
				this._onlineStatus = this.ONLINE;
				callback && callback();
			}.bind(this));
			//this.refresh();
		},

		getOnlineStatus: function()
		{
			return this._onlineStatus;
		},

		optimizeEditsQueue: function()
		{			
			console.log("edits:", editsStore._retrieveEditsQueue().map(function(e){return this.getReadableEdit(e)},this));

			var services = {};

			while( editsStore.hasPendingEdits() )
			{
				var edit = editsStore.popFirstEdit();
				var serviceUrl = edit.layer.substring(0,edit.layer.lastIndexOf('/'));
				var layerId = edit.layer.substring(edit.layer.lastIndexOf('/')+1);
				var layer = this._featureLayers[ edit.layer ];

				if( ! (serviceUrl in services) )
					services[serviceUrl] = {}

				var service = services[serviceUrl];

				if( ! (layerId in service) )
					service[layerId] = {}

				var layerEdits = service[layerId];
				var objectId = edit.graphic.attributes[ layer.objectIdField ];

				if( !( objectId in layerEdits) )
				{
					// first edit we see of this feature, no optimization to apply
					layerEdits[ objectId ] = edit;
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
								delete layerEdits[ objectId ];
							else
								layerEdits[objectId].operation = editsStore.DELETE;
							break;
					}
				}
			}

			console.log("optimized:",services);
			return services;
		},

		replayStoredEdits: function(callback)
		{
			if( editsStore.hasPendingEdits() )
			{
				/*
				var onEditsComplete = layer["onEditsComplete"];
				layer["onEditsComplete"] = function() { console.log("intercepting events onEditsComplete");}
				var onBeforeApplyEdits = layer["onBeforeApplyEdits"];
				layer["onBeforeApplyEdits"] = function() { console.log("intercepting events onBeforeApplyEdits");}
				*/

				var optimizedEdits = this.optimizeEditsQueue();
				var promises = [];

				for(var service in optimizedEdits)
				{
					// send all edits to this service at once
					// use esriRequest? 

					// OR

					// send edits using _applyEdits() for each layer
					for(var layerId in optimizedEdits[service])
					{
						console.log(service, layerId);
						var layerUrl = service + '/' + layerId;
						var layer = this._featureLayers[ layerUrl ];
						var adds = [], updates = [], deletes = [];
						for(var objectId in optimizedEdits[service][layerId])
						{
							var edit = optimizedEdits[service][layerId][objectId];
							switch(edit.operation)
							{
								case editsStore.ADD:									
									console.log( layer.layerId, layer.graphics.map(function(g){return g.attributes[layer.objectIdField]},this));
									for(var i=0; i<layer.graphics.length; i++)
									{
										var g = layer.graphics[i];
										if( g.attributes[layer.objectIdField] == edit.graphic.attributes[layer.objectIdField] )
										{
											layer.remove(g);
											break;
										}
									};
									console.log( layer.layerId, layer.graphics.map(function(g){return g.attributes[layer.objectIdField]},this));
									// layer.remove(edit.graphic);
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
						console.log( "sending edits", layerUrl,adds,updates,deletes);
						var context = {
							layer: layer,
							adds: adds,
						}
						promises.push( layer._applyEdits(adds,updates,deletes, function(addResults,updateResults,deleteResults)
							{
								/*
								for(var i=0; i<this.adds.length; i++)
								{
									this.adds[i].attributes[ this.layer.objectIdField ] = addResults[i].objectId;
								}
								console.log("edits applied!", addResults,updateResults,deleteResults);
								*/
								console.log( this.layer.layerId, this.layer.graphics.map(function(g){return g.attributes[this.layer.objectIdField]},this));
							}.bind(context)) );
					}
				}

				try{

				console.log(promises);
				var allPromises = new all(promises);
				allPromises.then(
					function(responses)
					{
						/*
						layer["onEditsComplete"] = onEditsComplete;
						layer["onBeforeApplyEdits"] = onBeforeApplyEdits;
						*/
						console.log("OOKK!!");
						// self.emit('edits-sent');
						// this.emit('all-edits-sent',{});
						callback && callback();
					},
					function(errors)
					{
						console.log("ERROR!!");
						console.log(errors);
						callback && callback(errors);
					})
				}
				catch(err)
				{
					console.log(err);
					callback && callback(err);
				}
			}
			else
			{
				this.emit('all-edits-sent',{});
				callback && callback();
			}
		},

		replayStoredEdits_old: function(callback)
		{
			if( editsStore.hasPendingEdits() )
			{
				var edit = editsStore.peekFirstEdit();
				var layer = this._featureLayers[ edit.layer ];
				var tempId = null;

				var adds = [], updates = [], deletes = [];
				switch(edit.operation)
				{
					case editsStore.ADD:
						tempId = edit.graphic.attributes[ layer.objectIdField ];
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

				var self = this;
				console.log("sending edits",adds,updates,deletes);

				// now, we remove the obBeforeApplyEdits && onEditsComplete handlers from the FeatureLayer
				// we already sent the events when the edit was kept in localStorage, and we don't want
				// to send them again. It causes some problems When using the esri/dijit/editing/Editor,
				// for instance opening the attributeEditor again after sending the edits
				var onEditsComplete = layer["onEditsComplete"];
				layer["onEditsComplete"] = function() { console.log("intercepting events onEditsComplete");}
				var onBeforeApplyEdits = layer["onBeforeApplyEdits"];
				layer["onBeforeApplyEdits"] = function() { console.log("intercepting events onBeforeApplyEdits");}

				layer._applyEdits(adds,updates,deletes,
					function(addResults,updateResults,deleteResults)	// success
					{						
						try
						{
							// restore event handlers
							layer["onEditsComplete"] = onEditsComplete;
							layer["onBeforeApplyEdits"] = onBeforeApplyEdits;
							editsStore.popFirstEdit();
							if( addResults && addResults.length > 0 )
							{
								for(var i=0; i<layer.graphics.length; i++)
								{
									var g = layer.graphics[i];
									if( g.attributes[layer.objectIdField] == tempId)
									{
										layer.remove(g);
										break;
									}
								};
								editsStore.replaceTempId(tempId, addResults[0].objectId, layer.objectIdField);
							}
							self.emit('edits-sent',arguments);
						}
						catch(err)
						{
							console.log(err);
						}
						self.replayStoredEdits(callback);
					},
					function(err)
					{
						// restore event handlers
						layer["onEditsComplete"] = onEditsComplete; 
						layer["onBeforeApplyEdits"] = onBeforeApplyEdits;
						console.log(err);
					}
				);
			}
			else
			{
				console.log("'finished!");
				this.emit('all-edits-sent',{});
				callback && callback();
			}
		}, // replayStoredEdits()

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

	}); // declare
}); // define
