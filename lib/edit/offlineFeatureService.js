"use strict";

define([
	"edit/editsStore", 
	"vendor/offline/offline.min",
	"dojo/Evented",
	"dojo/Deferred",
	"dojo/_base/declare"],
	function(editsStore,Offline,Evented,Deferred,declare)
{
	return declare([Evented], 
	{
		_online: true,
		_featureLayers: {},

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
				if( self.isOnline() )
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
					var addResults = [],updateResults = [],deleteResults = [];

					this.emit('before-apply-edits', [adds,updates,deletes]);

					adds = adds || [];
					adds.forEach(function(addEdit)
					{
						var objectId = layer.getNextTempId();
						addEdit.attributes[ layer.objectIdField ] = objectId;
						var success = editsStore.pushEdit(editsStore.ADD, layer.url, addEdit);
						addResults.push({success:success, objectId: objectId});
						if(success)
							layer.add(addEdit);
					});

					updates = updates || [];
					updates.forEach(function(updateEdit)
					{
						var success = editsStore.pushEdit(editsStore.UPDATE, layer.url, updateEdit);
						updateResults.push({success:success, objectId: updateEdit.attributes[ layer.objectIdField ]});
					});

					deletes = deletes || [];
					deletes.forEach(function(deleteEdit)
					{
						var success = editsStore.pushEdit(editsStore.DELETE, layer.url, deleteEdit);
						deleteResults.push({success:success, objectId: deleteEdit.attributes[ layer.objectIdField ]});
						if( success )
							layer.remove(deleteEdit);
					});

					deferred.resolve([addResults,updateResults,deleteResults])

					this.emit('edits-complete', { adds: addResults, updates:updateResults, deletes:deleteResults });
					self.emit('edits-enqueued', { adds: addResults, updates:updateResults, deletes:deleteResults });
					
					callback && callback({ adds: addResults, updates:updateResults, deletes:deleteResults });

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
			this._online = false;
		},

		goOnline: function()
		{
			console.log('going online');
			this._online = true;
			this.replayStoredEdits();
			//this.refresh();
		},

		isOnline: function()
		{
			return this._online;
		},


		replayStoredEdits: function()
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
						// restore event handlers
						layer["onEditsComplete"] = onEditsComplete;
						layer["onBeforeApplyEdits"] = onBeforeApplyEdits;
						editsStore.popFirstEdit();
						if( addResults )
						{
							editsStore.replaceTempId(tempId, addResults[0].objectId);
						}
						self.emit('edits-sent',arguments);
						self.replayStoredEdits();
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
		}, // replayStoredEdits()

	}); // declare
}); // define
