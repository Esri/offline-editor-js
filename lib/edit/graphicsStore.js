"use strict"

define(["esri/graphic"],function(Graphic)
{
	/* private consts */
	var EDITS_QUEUE_KEY = "esriEditsQueue";
	var REDO_QUEUE_KEY  = "esriRedoQueue";
	var SEPARATOR = "|@|";

	return {

		//
		// edit queue management
		//

		ADD: "add",
		UPDATE: "update",
		DELETE:"delete",

		appendEdit: function(operation,layer,graphic)
		{
			var edit = {
				operation: operation,
				layer: layer,
				graphic: this._serialize(graphic)
			}

			var edits = this._retrieveEditsQueue();
			edits.push(edit);
			this._storeEditsQueue(edits);
		},

		pendingEditsCount: function()
		{
			var storedValue = window.localStorage.getItem(EDITS_QUEUE_KEY) || "";

			if( storedValue == "" )
				return 0;	// fast easy case

			var editsArray = this._unpackArrayOfEdits(storedValue);
			return editsArray.length;
		},

		resetEditsQueue: function()
		{
			window.localStorage.setItem(EDITS_QUEUE_KEY, "");
		},

		popFirstEdit: function()
		{
			throw("not implemented");
		},

		canUndoEdit: function()
		{
			var storedValue = window.localStorage.getItem(EDITS_QUEUE_KEY) || "";

			return (storedValue != "");
		},

		undoEdit: function()
		{
			throw("not implemented");

		},

		canRedoEdit: function()
		{
			throw("not implemented");

		},

		redoEdit: function()
		{
			throw("not implemented");

		},

		//
		// internal methods
		//

		//
		// graphic serialization/deserialization
		//
		_serialize: function(graphic)
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
			return jsonClean;
		},

		_deserialize: function(json)
		{	
			var graphic = new Graphic(json);
			return graphic;
		},

		_retrieveEditsQueue: function()
		{
			var storedValue = window.localStorage.getItem(EDITS_QUEUE_KEY) || "";
			return this._unpackArrayOfEdits(storedValue);
		},

		_storeEditsQueue: function(edits)
		{
			var serializedEdits = this._packArrayOfEdits(edits);
			window.localStorage.setItem(EDITS_QUEUE_KEY, serializedEdits);
		},

		_packArrayOfEdits: function(edits)
		{
			var serializedEdits = [];
			edits.forEach(function(edit)
			{
				serializedEdits.push( JSON.stringify(edit) );
			});
			return serializedEdits.join(SEPARATOR);
		},

		_unpackArrayOfEdits: function(serializedEdits)
		{
			if( !serializedEdits )
				return [];

			var edits = serializedEdits.split(SEPARATOR);
			return edits;
		}

	}
});
