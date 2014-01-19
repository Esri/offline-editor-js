"use strict"

define(["esri/graphic"],function(Graphic)
{
	return {
		serialize: function(graphic)
		{
			var json = graphic.toJson();
			var str = JSON.stringify(json);
			console.log("graphic",graphic);
			// console.log("json", json);
			// console.log("str", str);
			return str;
		},

		deserialize: function(str)
		{	
			var json = JSON.parse(str);
			var graphic = new Graphic(json);
			// console.log("str", str);
			// console.log("json",json);
			console.log("graphic",graphic);
			return graphic;
		}
	}
});
