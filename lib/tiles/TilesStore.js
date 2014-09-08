
/*global indexedDB */
/**
 * Library for handling the storing of map tiles in IndexedDB.
 *
 * Author: Andy Gup (@agup)
 * Contributor: Javier Abadia (@javierabadia)
 */

O.esri.Tiles.TilesStore = function(){
    /**
     * Internal reference to the local database
     * @type {null}
     * @private
     */
    this._db = null;

    var DB_NAME = "offline_tile_store";

    /**
     * Determines if indexedDB is supported
     * @returns {boolean}
     */
    this.isSupported = function(){

        if(!window.indexedDB && !window.openDatabase){
            return false;
        }

        return true;
    };

    /**
     * Adds an object to the database
     * @param urlDataPair
     * @param callback callback(boolean, err)
     */
    this.store = function(urlDataPair,callback)
    {
        try
        {
            var transaction = this._db.transaction(["tilepath"],"readwrite");

            transaction.oncomplete = function()
            {
                callback(true);
            };

            transaction.onerror = function(event)
            {
                callback(false,event.target.error.message);
            };

            var objectStore = transaction.objectStore("tilepath");
            var request = objectStore.put(urlDataPair);
            request.onsuccess = function()
            {
                //console.log("item added to db " + event.target.result);
            };
        }
        catch(err)
        {
            console.log("TilesStore: " + err.stack);
            callback(false, err.stack);
        }
    };

    /**
     * Retrieve a record.
     * @param url
     * @param callback
     */
    this.retrieve = function(/* String */ url,callback)
    {
        if(this._db !== null)
        {
            var objectStore = this._db.transaction(["tilepath"]).objectStore("tilepath");
            var request = objectStore.get(url);
            request.onsuccess = function(event)
            {
                var result = event.target.result;
                if(result == undefined)
                {
                    callback(false,"not found");
                }
                else
                {
                    callback(true,result);
                }
            };
            request.onerror = function(err)
            {
                console.log(err);
                callback(false, err);
            };
        }
    };

    /**
     * Deletes entire database
     * @param callback callback(boolean, err)
     */
    this.deleteAll = function(callback)
    {
        if(this._db !== null)
        {
            var request = this._db.transaction(["tilepath"],"readwrite")
                .objectStore("tilepath")
                .clear();
            request.onsuccess = function()
            {
                callback(true);
            };
            request.onerror = function(err)
            {
                callback(false, err);
            };
        }
        else
        {
            callback(false,null);
        }
    };

    /**
     * Delete an individual entry
     * @param url
     * @param callback callback(boolean, err)
     */
    this.delete = function(/* String */ url,callback)
    {
        if(this._db !== null)
        {
            var request = this._db.transaction(["tilepath"],"readwrite")
                .objectStore("tilepath")
                .delete(url);
            request.onsuccess = function()
            {
                callback(true);
            };
            request.onerror = function(err)
            {
                callback(false, err);
            };
        }
        else
        {
            callback(false,null);
        }
    };

    /**
     * Retrieve all tiles from indexeddb
     * @param callback callback(url, img, err)
     */
    this.getAllTiles = function(callback)
    {
        if(this._db !== null){
            var transaction = this._db.transaction(["tilepath"])
                .objectStore("tilepath")
                .openCursor();

            transaction.onsuccess = function(event)
            {
                var cursor = event.target.result;
                if(cursor){
                    var url = cursor.value.url;
                    var img = cursor.value.img;
                    callback(url,img,null);
                    cursor.continue();
                }
                else
                {
                    callback(null, null, "end");
                }
            }.bind(this);
            transaction.onerror = function(err)
            {
                callback(null, null, err);
            };
        }
        else
        {
            callback(null, null, "no db");
        }
    };

    /**
     * Provides the size of database in bytes
     * @param callback callback(size, null) or callback(null, error)
     */
    this.usedSpace = function(callback){
        if(this._db !== null){
            var usage = { sizeBytes: 0, tileCount: 0 };

            var transaction = this._db.transaction(["tilepath"])
                .objectStore("tilepath")
                .openCursor();

            transaction.onsuccess = function(event){
                var cursor = event.target.result;
                if(cursor){
                    var storedObject = cursor.value;
                    var json = JSON.stringify(storedObject);
                    usage.sizeBytes += this._stringBytes(json);
                    usage.tileCount += 1;
                    cursor.continue();
                }
                else
                {
                    callback(usage,null);
                }
            }.bind(this);
            transaction.onerror = function(err)
            {
                callback(null, err);
            };
        }
        else
        {
            callback(null,null);
        }
    };

    this._stringBytes = function(str) {
        return str.length /**2*/ ;
    };

    this.init = function(callback)
    {
        var request = indexedDB.open(DB_NAME, 4);
        callback = callback || function(success) { console.log("TilesStore::init() success:", success); }.bind(this);

        request.onerror = function(event)
        {
            console.log("indexedDB error: " + event.target.errorCode);
            callback(false,event.target.errorCode);
        }.bind(this);

        request.onupgradeneeded = function(event)
        {
            var db = event.target.result;

            if( db.objectStoreNames.contains("tilepath"))
            {
                db.deleteObjectStore("tilepath");
            }

            db.createObjectStore("tilepath", { keyPath: "url" });
        }.bind(this);

        request.onsuccess = function(event)
        {
            this._db = event.target.result;
            console.log("database opened successfully");
            callback(true);
        }.bind(this);
    };
};

