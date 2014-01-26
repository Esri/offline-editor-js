"use strict";

define([
	"edit/editsStore", 
	"vendor/offline/offline.min",
	"dojo/Evented",
	"dojo/Deferred",
	"dojo/_base/declare"],
	function(editsStore,Offline,Evented,Deferred,declare)
{
	return declare([Evented], {

		online: true,
		featureLayers: {},

		extend: function(layer)
		{
			var self = this;

			self.featureLayers[ layer.id ] = layer;

			// layer.on('before-apply-edits', function(){ console.log('before-apply-edits');});
			// layer.on('edits-complete', function(){ console.log('edits-complete');});

			/* replace the applyEdits() method */
			layer._applyEdits = layer.applyEdits;
			layer.applyEdits = function(adds,updates,deletes,callback,errback)
			{
				// inside this method, 'this' will be the FeatureLayer
				// and 'self' will be the offlineFeatureLayer object
				if( self.isOnline() )
				{
					self.emit('edits-sent',{});
					var def = layer._applyEdits(adds,updates,deletes,callback,errback);
					return def;
				}
				else
				{
					var deferred = new Deferred();
					var addResults = [],updateResults = [],deleteResults = [];

					this.emit('before-apply-edits', [adds,updates,deletes]);

					adds = adds || [];
					updates = updates || [];
					deletes = deletes || [];
					adds.forEach(function(addEdit)
					{
						var objectId = layer.getNextTempId();
						addEdit.attributes[ layer.objectIdField ] = objectId;
						editsStore.pushEdit(editsStore.ADD, layer.id, addEdit);
						addResults.push({success:true, objectId: objectId});
						layer.add(addEdit);
					});
					updates.forEach(function(updateEdit)
					{
						editsStore.pushEdit(editsStore.UPDATE, layer.id, updateEdit);
						updateResults.push({success:true, objectId: updateEdit.attributes[ layer.objectIdField ]});
					});
					deletes.forEach(function(deleteEdit)
					{
						editsStore.pushEdit(editsStore.DELETE, layer.id, deleteEdit);
						deleteResults.push({success:true, objectId: deleteEdit.attributes[ layer.objectIdField ]});
						layer.remove(deleteEdit);
					});

					// console.log([addResults,updateResults,deleteResults]);
					deferred.resolve([addResults,updateResults,deleteResults])

					this.emit('edits-complete', { adds: addResults, updates:updateResults, deletes:deleteResults });
					self.emit('edits-enqueued',{});

					if(callback)
						callback({ adds: addResults, updates:updateResults, deletes:deleteResults });

					return deferred;
				}
			}; // layer.applyEdits()

			layer.getNextTempId = function()
			{
				return this._nextTempId--;
			};

			layer._nextTempId = -1;

		}, // extend

		goOffline: function()
		{
			console.log('going offline');
			this.online = false;
		},

		goOnline: function()
		{
			console.log('going online');
			this.online = true;
			this.replayStoredEdits();
			//this.refresh();
		},

		isOnline: function()
		{
			return this.online;
		},

		replayStoredEdits: function()
		{
			if( editsStore.hasPendingEdits() )
			{
				var edit = editsStore.peekFirstEdit();
				var layer = this.featureLayers[ edit.layer ];

				var adds = [], updates = [], deletes = [];
				switch(edit.operation)
				{
					case editsStore.ADD:
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
				layer._applyEdits(adds,updates,deletes, //jabadia: avoid this to trigger events (or not?) it opens the infoWindow
					function()
					{
						editsStore.popFirstEdit();
						console.log("edits-sent");
						self.emit('edits-sent',{});
						self.replayStoredEdits();
					}
				);
			}
		}

	}); // declare
}); // define