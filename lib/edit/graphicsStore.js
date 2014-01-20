"use strict"

define(["esri/graphic"],function(Graphic)
{
	return {
		serialize: function(graphic)
		{
			// keep only attributes and geometry, that are the values that get sent to the server by applyEdits() 
			// see http://resources.arcgis.com/en/help/arcgis-rest-api/index.html#/Apply_Edits_Feature_Service_Layer/02r3000000r6000000/
			// use graphic's built-in serializing method
			var json = graphic.toJson();
			var jsonClean = 
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
