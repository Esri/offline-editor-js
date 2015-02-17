O.esri.Edit.EditStore = function(){

	/* private consts */
	var EDITS_QUEUE_KEY = "esriEditsQueue";
	var SEPARATOR = "|@|";

    //
    // public interface
    //

    // enum

    this.ADD = "add";
    this.UPDATE = "update";
    this.DELETE = "delete";

    // ERROR_DUPLICATE_EDIT: "Attempt to insert duplicated edit",
    this.ERROR_LOCALSTORAGE_FULL = "LocalStorage capacity exceeded";

    this.isSupported = function()
    {
        // http://stackoverflow.com/questions/11214404/how-to-detect-if-browser-supports-html5-local-storage
        var mod = "esriLocalStorageTest";
        try {
            window.localStorage.setItem(mod, mod);
            window.localStorage.removeItem(mod);
            return true;
        } catch(e) {
            return false;
        }
    };

    this.pushEdit = function(operation,layer,graphic)
    {
        var edit = {
            operation: operation,
            layer: layer,
            graphic: this._serialize(graphic)
        };

        var edits = this.retrieveEditsQueue();
        edits.push(edit);
        var success = this._storeEditsQueue(edits);
        return { success: success, error: success? undefined : {code: 1000, description:this.ERROR_LOCALSTORAGE_FULL} };
    };

    this.peekFirstEdit = function()
    {
        var edits = this.retrieveEditsQueue();
        var firstEdit;

        if( edits )
        {
            firstEdit = edits[0];
            firstEdit.graphic = this._deserialize(firstEdit.graphic);
            return firstEdit;
        }
        return null;
    };

    this.popFirstEdit = function()
    {
        var edits = this.retrieveEditsQueue();
        var firstEdit;

        if( edits )
        {
            firstEdit = edits.shift();
            this._storeEditsQueue(edits);
            firstEdit.graphic = this._deserialize(firstEdit.graphic);
            return firstEdit;
        }
        return null;
    };

    this.hasPendingEdits = function()
    {
        var storedValue = window.localStorage.getItem(EDITS_QUEUE_KEY) || "";
        return ( storedValue !== "" );
    };

    this.pendingEditsCount = function()
    {
        var storedValue = window.localStorage.getItem(EDITS_QUEUE_KEY) || "";

        if( storedValue === "" )
        {
            return 0;	// fast easy case
        }

        var editsArray = this._unpackArrayOfEdits(storedValue);
        return editsArray.length;
    };

    this.resetEditsQueue = function()
    {
        window.localStorage.setItem(EDITS_QUEUE_KEY, "");
    };

    this.retrieveEditsQueue = function()
    {
        var storedValue = window.localStorage.getItem(EDITS_QUEUE_KEY) || "";
        return this._unpackArrayOfEdits(storedValue);
    };

    this.getEditsStoreSizeBytes = function()
    {
        var editsQueueValue = window.localStorage.getItem(EDITS_QUEUE_KEY);

        return (editsQueueValue? EDITS_QUEUE_KEY.length + editsQueueValue.length : 0);
    }

    this.getLocalStorageSizeBytes = function()
    {
        var bytes = 0,
            key, value;

        for(key in window.localStorage )
        {
            if( window.localStorage.hasOwnProperty(key))
            {
                value = window.localStorage.getItem(key);
                bytes += key.length + value.length;
            }
        }
        return bytes;
    };

    //
    // internal methods
    //

    //
    // graphic serialization/deserialization
    //
    this._serialize = function(graphic)
    {
        // keep only attributes and geometry, that are the values that get sent to the server by applyEdits()
        // see http://resources.arcgis.com/en/help/arcgis-rest-api/index.html#/Apply_Edits_Feature_Service_Layer/02r3000000r6000000/
        // use graphic's built-in serializing method
        var json = graphic.toJson();
        var jsonClean =
        {
            attributes: json.attributes,
            geometry: json.geometry
        };
        return JSON.stringify(jsonClean);
    };

    this._deserialize = function(json)
    {
        var graphic;

        require(["esri/graphic"],function(Graphic){
            graphic = new Graphic(JSON.parse(json));
        });

        return graphic;
    };

    this._storeEditsQueue = function(edits)
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
    };

    this._packArrayOfEdits = function(edits)
    {
        var serializedEdits = [];
        edits.forEach(function(edit)
        {
            serializedEdits.push( JSON.stringify(edit) );
        });
        return serializedEdits.join(SEPARATOR);
    };

    this._unpackArrayOfEdits = function(serializedEdits)
    {
        if( !serializedEdits )
        {
            return [];
        }

        var edits = [];
        serializedEdits.split(SEPARATOR).forEach( function(serializedEdit)
        {
            edits.push( JSON.parse(serializedEdit) );
        });

        return edits;
    };

    this._isEditDuplicated = function(newEdit,edits)
    {
        var i,
            edit;

        for(i=0; i<edits.length; i++)
        {
            edit = edits[i];
            if( edit.operation === newEdit.operation &&
                edit.layer     === newEdit.layer     &&
                edit.graphic   === newEdit.graphic )
            {
                return true;
            }
        }
        return false;
    }
};

