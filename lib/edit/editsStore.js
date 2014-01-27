"use strict"

define(["esri/graphic"], function(Graphic)
{
	/* private consts */
	var EDITS_QUEUE_KEY = "esriEditsQueue";
	var REDO_STACK_KEY  = "esriRedoStack";
	var SEPARATOR = "|@|";

	return {

		//
		// public interface
		//

		// enum
		
		ADD: "add",
		UPDATE: "update",
		DELETE:"delete",

		isSupported: function() 
		{
			// http://stackoverflow.com/questions/11214404/how-to-detect-if-browser-supports-html5-local-storage
			var mod = 'esriLocalStorageTest';
			try {
				window.localStorage.setItem(mod, mod);
				window.localStorage.removeItem(mod);
				return true;
			} catch(e) {
				return false;
    		}
    	},

		pushEdit: function(operation,layer,graphic)
		{
			var edit = {
				operation: operation,
				layer: layer,
				graphic: this._serialize(graphic)
			}

			var edits = this._retrieveEditsQueue();
			if( this._isEditDuplicated(edit,edits) )
			{
				// I still think that we shouldn't be concerned with duplicates:
				// they just shouldn't exist, and if they do, then it is a bug in upper level code
				console.log("duplicated", edit);
				console.log("current store is", edits);
				return false; // fail
			}
			else
			{
				edits.push(edit);
				var success =
					this._storeRedoStack([]) && 
					this._storeEditsQueue(edits);
				return success;
			}
		},

		peekFirstEdit: function()
		{
			var edits = this._retrieveEditsQueue();

			if( edits )
			{
				var firstEdit = edits[0]
				firstEdit.graphic = this._deserialize(firstEdit.graphic);
				return firstEdit;			
			}
			else
				return null;			
		},

		popFirstEdit: function()
		{
			var edits = this._retrieveEditsQueue();

			if( edits )
			{
				var firstEdit = edits.shift();
				this._storeEditsQueue(edits);
				firstEdit.graphic = this._deserialize(firstEdit.graphic);
				return firstEdit;			
			}
			else
				return null;			
		},

		hasPendingEdits: function()
		{
			var storedValue = window.localStorage.getItem(EDITS_QUEUE_KEY) || "";
			return ( storedValue != "" )
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
			window.localStorage.setItem(REDO_STACK_KEY,"");
		},

		getReadableEdit: function(edit)
		{
			var graphic = this._deserialize(edit.graphic);
			var readableGraphic = "";
			switch(edit.operation)
			{
				case this.ADD:
					readableGraphic = graphic.geometry.type;
					break;
				case this.UPDATE:
				case this.DELETE:
					readableGraphic = graphic.geometry.type + " [id=" + graphic.attributes.objectid + "]";	// jabadia: objectid name hardcoded
					break;
					readableGraphic = graphic.geometry.type + " [id=" + graphic.attributes.objectid + "]";
					break;
			}
			return "o:" + edit.operation + ", l:" + edit.layer + ", g:" + readableGraphic;
		},

		// undo / redo

		canUndoEdit: function()
		{
			return this.hasPendingEdits();
		},

		undoEdit: function()
		{
			if(!this.canUndoEdit())
				return null;

			var edits = this._retrieveEditsQueue();
			var redoStack = this._retrieveRedoStack();
			var editToUndo = edits.pop();
			redoStack.push(editToUndo);
			this._storeEditsQueue(edits);
			this._storeRedoStack(redoStack);

			return editToUndo;
		},

		canRedoEdit: function()
		{
			var storedValue = window.localStorage.getItem(REDO_STACK_KEY) || "";
			return ( storedValue != "" )
		},

		redoEdit: function()
		{
			if(!this.canRedoEdit())
				return null;

			var edits = this._retrieveEditsQueue();
			var redoStack = this._retrieveRedoStack();
			var editToRedo = redoStack.pop();
			edits.push(editToRedo);
			this._storeRedoStack(redoStack);
			this._storeEditsQueue(edits);

			return editToRedo;
		},

		getEditsStoreSizeBytes: function()
		{
			return EDITS_QUEUE_KEY.length + window.localStorage.getItem(EDITS_QUEUE_KEY).length +
				REDO_STACK_KEY.length + window.localStorage.getItem(REDO_STACK_KEY).length; 

		},

		getLocalStorageSizeBytes: function()
		{
			var bytes = 0;
			for( var key in window.localStorage )
			{
				var value = window.localStorage.getItem(key);
				bytes += key.length + value.length;
			}
			return bytes;
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
			return JSON.stringify(jsonClean);
		},

		_deserialize: function(json)
		{	
			var graphic = new Graphic(JSON.parse(json));
			return graphic;
		},

		_retrieveEditsQueue: function()
		{
			var storedValue = window.localStorage.getItem(EDITS_QUEUE_KEY) || "";
			return this._unpackArrayOfEdits(storedValue);
		},

		_storeEditsQueue: function(edits)
		{
			try 
			{
				var serializedEdits = this._packArrayOfEdits(edits);
				window.localStorage.setItem(EDITS_QUEUE_KEY, serializedEdits);
				return true;
			}
			catch(err)
			{
				return false;
			}
		},

		_retrieveRedoStack: function()
		{
			var storedValue = window.localStorage.getItem(REDO_STACK_KEY) || "";
			return this._unpackArrayOfEdits(storedValue);
		},

		_storeRedoStack: function(edits)
		{
			try
			{
				var serializedEdits = this._packArrayOfEdits(edits);
				window.localStorage.setItem(REDO_STACK_KEY, serializedEdits);
				return true;
			}
			catch(err)
			{
				return false;
			}
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

			var edits = [];
			serializedEdits.split(SEPARATOR).forEach( function(serializedEdit)
			{
				edits.push( JSON.parse(serializedEdit) );
			});

			return edits;
		},

		_isEditDuplicated: function(newEdit,edits)
		{
			for(var i=0; i<edits.length; i++)
			{	
				var edit = edits[i];
				if( edit.operation == newEdit.operation &&
					edit.layer     == newEdit.layer     &&
					edit.graphic   == newEdit.graphic )
				{
					return true;
				}
			}
			return false;
		}
	}
});
