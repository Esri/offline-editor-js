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

			self.featureLayers[ layer.layerId ] = layer;
	
			/* replace the applyEdits() method */
			layer._applyEdits = layer.applyEdits;
			layer.applyEdits = function(adds,updates,deletes,callback,errback)
			{
				// inside this method, 'this' will be the FeatureLayer
				// and 'self' will be the offlineFeatureLayer object
				if( self.isOnline() )
				{
					self.emit('edits-sent',{});
					return layer._applyEdits(adds,updates,deletes,callback,errback);
				}
				else
				{
					var deferred = new Deferred();

					adds = adds || [];
					updates = updates || [];
					deletes = deletes || []; 
					adds.forEach(function(addEdit)
					{
						editsStore.pushEdit(editsStore.ADD, layer.layerId, addEdit);
					});
					updates.forEach(function(updateEdit)
					{
						editsStore.pushEdit(editsStore.UPDATE, layer.layerId, updateEdit);
					});
					deletes.forEach(function(deleteEdit)
					{
						editsStore.pushEdit(editsStore.DELETE, layer.layerId, deleteEdit);
					});

					deferred.resolve();

					self.emit('edits-enqueued',{});

					if(callback)
						callback();

					return deferred;
				}
			}; // layer.applyEdits()
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
				var adds = [], updates = [], deletes = [];
				switch(edit.operation)
				{
					case editsStore.ADD: 
						adds.push(edit.graphic);
						break;
					case editsStore.UPDATE: 
						updates.push(edit.graphic);
						break;
					case editsStore.DELETE: 
						deletes.push(edit.graphic);
						break;
				}

				var layer = this.featureLayers[ edit.layer ];
				var self = this;
				console.log("sending edits",adds,updates,deletes);
				layer._applyEdits(adds,updates,deletes, 
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