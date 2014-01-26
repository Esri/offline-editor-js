"use strict";

define(["edit/editsStore", "dojo/Evented","dojo/_base/declare"],
	function(editsStore,Evented,declare)
{
	return declare([Evented], {
		extend: function(layer)
		{
			/* replace the applyEdits() method */
			layer._applyEdits = layer.applyEdits;
			layer.applyEdits = function(adds,updates,deletes,callback,errback)
			{
				console.log("intercept!");
				console.log(layer);
				console.log(adds,updates,deletes,callback,errback);
				if( adds )
				{	
					adds.forEach(function(addEdit)
					{
						editsStore.pushEdit(editsStore.ADD, layer.layerId, addEdit);
					})				
				}
				if( updates )
				{	
					updates.forEach(function(updateEdit)
					{
						editsStore.pushEdit(editsStore.UPDATE, layer.layerId, updateEdit);
					})				
				}
				if( deletes )
				{	
					deletes.forEach(function(deleteEdit)
					{
						editsStore.pushEdit(editsStore.DELETE, layer.layerId, deleteEdit);
					})				
				}
				this.emit('edit-enqueued',{});
				return layer._applyEdits(adds,updates,deletes,callback,errback);
			}
		}
	});
});