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
			// console.log("edits:", editsStore._retrieveEditsQueue().map(function(e){return this.getReadableEdit(e)},this));
			var optimizedEdits = {};

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

			// console.log("optimized:",optimizedEdits);
			return optimizedEdits;
		},

		replayStoredEdits: function(callback)
		{
			if( editsStore.hasPendingEdits() )
			{
				//
				// flatten the queue into unique edits for each feature, grouped by FeatureLayer
				//
				var optimizedEdits = this.optimizeEditsQueue();
				var promises = [];

				//
				// send edits for each of the layers
				//
				for(var layerUrl in optimizedEdits)
				{
					var layer = this._featureLayers[ layerUrl ];

					layer.__onEditsComplete = layer["onEditsComplete"];
					layer["onEditsComplete"] = function() { console.log("intercepting events onEditsComplete");}
					layer.__onBeforeApplyEdits = layer["onBeforeApplyEdits"];
					layer["onBeforeApplyEdits"] = function() { console.log("intercepting events onBeforeApplyEdits");}

					var adds = [], updates = [], deletes = [];
					for(var objectId in optimizedEdits[layerUrl])
					{
						var edit = optimizedEdits[layerUrl][objectId];
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
					promises.push( layer._applyEdits(adds,updates,deletes, 
						function()
						{
							this["onEditsComplete"] = this.__onEditsComplete; delete this.__onEditsComplete;
							this["onBeforeApplyEdits"] = this.__onBeforeApplyEdits; delete this.__onBeforeApplyEdits;
							}.bind(layer),
						function(error)
						{
							this["onEditsComplete"] = this.__onEditsComplete; delete this.__onEditsComplete;
							this["onBeforeApplyEdits"] = this.__onBeforeApplyEdits; delete this.__onBeforeApplyEdits;
						}.bind(layer)) );
				}

				//
				// wait for all requests to finish
				//
				var allPromises = new all(promises);
				allPromises.then(
					function(responses)
					{
						console.log("all responses are back");
						// self.emit('edits-sent');
						this.emit('all-edits-sent',{});
						callback && callback();
					}.bind(this),
					function(errors)
					{
						console.log("ERROR!!");
						console.log(errors);
						callback && callback(errors);
					}.bind(this));
			} // hasPendingEdits()
			else
			{
				this.emit('all-edits-sent',{});
				callback && callback();
			}
		},

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
