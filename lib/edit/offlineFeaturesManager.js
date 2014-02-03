"use strict";

define([
	"edit/editsStore", 
	"vendor/offline/offline.min",
	"dojo/Evented",
	"dojo/_base/Deferred",
	"dojo/_base/declare",
	"dojo/_base/lang",
	"esri/request"],
	function(editsStore,Offline,Evented,Deferred,declare,lang,esriRequest)
{
	return declare([Evented], 
	{
		_onlineStatus: "online",
		_featureLayers: {},

		ONLINE: "online",
		OFFLINE: "offline",
		RECONNECTING: "reconnecting",

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

		replayStoredEdits: function(callback)
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
			if(layer)
				readableGraphic += " [id=" + graphic.attributes[layer.objectIdField] + "]";
			return "o:" + edit.operation + ", l:" + edit.layer + ", g:" + readableGraphic;
		},

	}); // declare
}); // define
