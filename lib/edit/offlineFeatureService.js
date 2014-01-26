"use strict";

define([],
	function()
{
	return {
		extend: function(layer)
		{
			/* replace the applyEdits() method */
			layer._applyEdits = layer.applyEdits;
			layer.applyEdits = function(adds,updates,deletes,callback,errback)
			{
				console.log("intercept!");
				console.log(adds,updates,deletes,callback,errback);
				return layer._applyEdits(adds,updates,deletes,callback,errback);
			}
		}
	}
});