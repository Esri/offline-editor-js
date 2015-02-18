/*global IDBKeyRange,indexedDB */

"use strict";
O.esri.Edit.EditStore = function()
{
    this._db = null;

    // Public properties

    var dbName = "features_store";
    var objectStoreName = "features";
    var dbIndex = "featureId";

    // ENUMs

    this.ADD = "add";
    this.UPDATE = "update";
    this.DELETE = "delete";

    this.isSupported = function()
    {
        if(!window.indexedDB){
            return false;
        }
        return true;
    };

    /**
     * Commit an edit to the database
     * @param operation add, update or delete
     * @param layer the URL of the feature layer
     * @param graphic esri/graphic. The method will serialize to JSON
     * @param callback {true, edit} or {false, error}
     */
    this.pushEdit = function(operation,layer,graphic, callback)
    {
        try
        {
            var edit = {
                    id: graphic.attributes.objectid,
                    operation: operation,
                    layer: layer,
                    graphic: graphic.toJson()
                };

            var transaction = this._db.transaction([objectStoreName],"readwrite");

            transaction.oncomplete = function(event){
                callback(true);
            };

            transaction.onerror = function(event){
                callback(false,event.target.error.message);
            };

            var objectStore = transaction.objectStore(objectStoreName);
            var request = objectStore.put(edit);
            request.onsuccess = function(event){
                //console.log("item added to db " + event.target.result);
            };


        }
        catch(err)
        {
            console.log("AttachmentsStore: " + err.stack);
            callback(false,err.stack);
        }
    };

    /**
     * Update an edit already exists in the database
     * @param operation add, update or delete
     * @param layer the URL of the feature layer
     * @param graphic esri/graphic. The method will serialize to JSON
     * @param callback {true, edit} or {false, error}
     */
    this.updateExistingEdit = function(operation,layer,graphic, callback){

        console.assert(this._db !== null, "indexeddb not initialized");

        var objectStore = this._db.transaction([objectStoreName],"readwrite").objectStore(objectStoreName);

        //Let's get the entry associated with the graphic
        var objectStoreGraphicRequest = objectStore.get(graphic.attributes.objectid);
        objectStoreGraphicRequest.onsuccess = function() {

            //Grab the data object returned as a result
            var data = objectStoreGraphicRequest.result;

            //Create a new update object
            var update = {
                id: graphic.attributes.objectid,
                operation: operation,
                layer: layer,
                graphic: graphic.toJson()
            };

            // Insert the update into the database
            var updateGraphicRequest = objectStore.put(update);

            updateGraphicRequest.onsuccess = function(){
                callback(true);
            }

            updateGraphicRequest.onerror = function(err){
                callback(false,err);
            };
        }
    };

    this.resetEditsQueue = function(callback)
    {
        console.assert(this._db !== null, "indexeddb not initialized");

        var request = this._db.transaction([objectStoreName],"readwrite")
            .objectStore(objectStoreName)
            .clear();
        request.onsuccess = function(event){
            setTimeout(function(){callback(true);},0);
        };
        request.onerror = function(err){
            callback(false,err);
        };
    };

    this.pendingEditsCount = function(callback)
    {
        console.assert(this._db !== null, "indexeddb not initialized");

        var count = 0;

        var objectStore = this._db.transaction([objectStoreName]).objectStore(objectStoreName);
        objectStore.openCursor().onsuccess = function(evt)
        {
            var cursor = evt.target.result;
            if(cursor)
            {
                count++;
                cursor.continue();
            }
            else
            {
                callback(count);
            }
        };
    };

    this.hasPendingEdits = function()
    {
       // DEPRECATED!
    };

    this.getUsage = function(callback)
    {
        console.assert(this._db !== null, "indexeddb not initialized");

        var usage = { sizeBytes: 0, attachmentCount: 0 };

        var transaction = this._db.transaction([objectStoreName])
            .objectStore(objectStoreName)
            .openCursor();

        console.log("dumping keys");

        transaction.onsuccess = function(event)
        {
            var cursor = event.target.result;
            if(cursor)
            {
                console.log(cursor.value.id, cursor.value.featureId, cursor.value.objectId);
                var storedObject = cursor.value;
                var json = JSON.stringify(storedObject);
                usage.sizeBytes += json.length;
                usage.attachmentCount += 1;
                cursor.continue();
            }
            else
            {
                callback(usage,null);
            }
        }.bind(this);
        transaction.onerror = function(err)
        {
            callback(null,err);
        };
    };

    // internal methods

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

    this.init = function(callback)
    {
        console.log("init editsStore.js");

        var request = indexedDB.open(dbName, 11);
        callback = callback || function(success) { console.log("EditsStore::init() success:", success); }.bind(this);

        request.onerror = function(event)
        {
            console.log("indexedDB error: " + event.target.errorCode);
            callback(false,event.target.errorCode);
        }.bind(this);

        request.onupgradeneeded = function(event)
        {
            var db = event.target.result;

            if( db.objectStoreNames.contains(objectStoreName))
            {
                db.deleteObjectStore(objectStoreName);
            }

            var objectStore = db.createObjectStore(objectStoreName, { keyPath: "id" });
            objectStore.createIndex(dbIndex,dbIndex, {unique: false});
        }.bind(this);

        request.onsuccess = function(event)
        {
            this._db = event.target.result;
            console.log("database opened successfully");
            callback(true);
        }.bind(this);
    };
};


