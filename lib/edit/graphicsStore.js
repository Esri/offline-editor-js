"use strict"

define(["esri/graphic"],function(Graphic)
{
	return {
		serialize: function(graphic)
		{
			var json = graphic.toJson();
			var jsonClean = // keep only attributes and geometry, that are the values that get sent to the server by applyEdits()
			{
				attributes: json.attributes,
				geometry: json.geometry
			}
			var str = JSON.stringify(jsonClean);
			return str;
		},

		deserialize: function(str)
		{	
			var json = JSON.parse(str);
			var graphic = new Graphic(json);
			return graphic;
		}
	}
});
