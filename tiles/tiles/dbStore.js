"use strict"

/**
 * Library for handling the storing of map tiles in IndexedDB.
 *
 * Author: Andy Gup (@agup)
 * Contributor: Javier Abadia (@javierabadia)
 */
define(["tiles/phoneGapConnector"],function(phonegap)
{
    var DbStore = function()
    {
        /**
         * Internal reference to the local database
         * @type {null}
         * @private
         */
        this._db = null;

        /**
         * Private Local ENUMs (Constants)
         * Contains required configuration info.
         * @type {Object}
         * @returns {*}
         * @private
         */
        this._localEnum = (function(){
            var values = {
                DB_NAME : "offline_tile_store"
            }

            return values;
        });

        /**
         * Determines if indexedDB is supported
         * @returns {boolean}
         */
        this.isSupported = function(){
            window.indexedDB = window.indexedDB || window.mozIndexedDB || window.webkitIndexedDB || window.msIndexedDB;

            if(!window.indexedDB){
                return false;
            }

            return true;
        }

        /**
         * Verifies if phonegap and SQlite support is available
         * @returns {boolean}
         */
        this.isDeviceStorageSupported = function(){
            if(phonegap.getDBVersion() != null){
                return true;
            }

            return false;
        }

        /**
         * Adds an object to the database
         * @param urlDataPair
         * @param callback callback(boolean, err)
         */
        this.add = function(urlDataPair,callback){
            try{
                //console.log("add()",urlDataPair);
                var transaction = this._db.transaction(["tilepath"],"readwrite");

                transaction.oncomplete = function(event) {
                    callback(true);
                };

                transaction.onerror = function(event) {
                    callback(false,event.target.error.message)
                };

                var objectStore = transaction.objectStore("tilepath");
                var request = objectStore.put(urlDataPair);
                request.onsuccess = function(event) {
                    //console.log("item added to db " + event.target.result);
                };
            }
            catch(err){
                console.log("dbstore: " + err.stack);
                callback(false,err.stack);
            }
        }

        /**
         * Retrieve a record.
         * @param url
         * @param callback
         */
        this.get = function(/* String */ url,callback){
            if(this._db != null){

                var objectStore = this._db.transaction(["tilepath"]).objectStore("tilepath");
                var request = objectStore.get(url);
                request.onsuccess = function(event)
                {
                    var result = event.target.result;
                    if(result == null){
                        callback(false,"not found");
                    }
                    else{
                        callback(true,result);
                    }
                }
                request.onerror = function(err){
                    callback(false,err);
                }
            }
        }

        /**
         * Deletes entire database
         * @param callback callback(boolean, err)
         */
        this.deleteAll = function(callback){
            if(this._db != null){
                var request = this._db.transaction(["tilepath"],"readwrite")
                    .objectStore("tilepath")
                    .clear();
                request.onsuccess = function(event){
                    callback(true);
                }
                request.onerror = function(err){
                    callback(false,err);
                }
            }
            else{
                callback(false,null);
            }
        }

        /**
         * Delete an individual entry
         * @param url
         * @param callback callback(boolean, err)
         */
        this.delete = function(/* String */ url,callback){
            if(this._db != null){
                var request = this._db.transaction(["tilepath"],"readwrite")
                    .objectStore("tilepath")
                    .delete(url);
                request.onsuccess = function(event){
                    callback(true);
                }
                request.onerror = function(err){
                    callback(false,err);
                }
            }
            else{
                callback(false,null);
            }
        }

        /**
         * Retrieve all tiles from indexeddb
         * @param callback callbakck(url, img, err)
         */
        this.getAllTiles = function(callback){
            if(this._db.hasOwnProperty("name"))
            {
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
                    else{
                        callback(null, null, "end");
                    }
                }.bind(this);
                transaction.onerror = function(err){
                    callback(null, null, err);
                }
            }
            else
            {
                callback(null, null, "no db");
            }     
        }

        /**
         * Provides a rough, approximate size of database in MBs.
         * @param callback callback(size, null) or callback(null, error)
         */
        this.size = function(callback){
            if(this._db != null){
                var usage = { size: 0, tileCount: 0 };

                var transaction = this._db.transaction(["tilepath"])
                    .objectStore("tilepath")
                    .openCursor();

                transaction.onsuccess = function(event){
                    var cursor = event.target.result;
                    if(cursor){
                        var storedObject = cursor.value;
                        var json = JSON.stringify(storedObject);
                        usage.size += this.stringBytes(json);
                        usage.tileCount += 1;
                        cursor.continue();
                    }
                    else{
                        usage.size = Math.round((usage.size/1024/1024) * 100)/100; /* JAMI: *2 */
                        callback(usage,null);
                    }
                }.bind(this);
                transaction.onerror = function(err){
                    callback(null,err);
                }
            }
            else{
                callback(null,null);
            }
        }

        this.stringBytes = function(str) {
            var b = str.match(/[^\x00-\xff]/g);
            return (str.length + (!b ? 0: b.length));
        }

        this.init = function(callback)
        {
            var request = indexedDB.open(this._localEnum().DB_NAME, 4);
            callback = callback? callback : function(success) { console.log("DbStore::init() success:", success)}.bind(this);

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

                var objectStore = db.createObjectStore("tilepath", { keyPath: "url" });
            }.bind(this);

            request.onsuccess = function(event)
            {
                this._db = event.target.result;
                console.log("database opened successfully");
                callback(true);
            }.bind(this);
        }
    }
    return DbStore;    
});
