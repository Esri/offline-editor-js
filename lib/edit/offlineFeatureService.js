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

			this._featureLayers[ layer.url ] = layer;

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
					self.emit('edits-enqueued',{});

					if(callback)
						callback({ adds: addResults, updates:updateResults, deletes:deleteResults });

					return deferred;
				}
			}; // layer.applyEdits()

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
		},

	}); // declare
}); // define