"use strict"

/**
 * Library for handling the storing of edit-related attachments in IndexedDB.
 *
 * Author: Andy Gup (@agup)
 * Contributor: Javier Abadia (@javierabadia)
 */
define([],function()
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
                DB_NAME : "offline_attach_store"
            }

            return values;
        });

        /**
         * Determines if indexedDB is supported
         * @returns {boolean}
         */
        this.isSupported = function(){

            if(!window.indexedDB){
                return false;
            }

            return true;
        }

        /**
         * Adds an object to the database
         * @param Object
         * @param callback callback(boolean, err)
         */
        this.add = function(Object,callback){
            try{
                //console.log("add()",urlDataPair);
                var transaction = this._db.transaction(["attachment"],"readwrite");

                transaction.oncomplete = function(event) {
                    callback(true);
                };

                transaction.onerror = function(event) {
                    callback(false,event.target.error.message)
                };

                var objectStore = transaction.objectStore("attachment");
                var request = objectStore.put(Object);
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
        this.get = function(/* String */ uid,callback){
            if(this._db != null){

                var objectStore = this._db.transaction(["attachment"]).objectStore("attachment");
                var request = objectStore.get(uid);
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
                var request = this._db.transaction(["attachment"],"readwrite")
                    .objectStore("attachment")
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
         * @param uid
         * @param callback callback(boolean, err)
         */
        this.delete = function(/* String */ uid,callback){
            if(this._db != null){
                var request = this._db.transaction(["attachment"],"readwrite")
                    .objectStore("attachment")
                    .delete(uid);
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
        this.getAllAttachments = function(callback){
            if(this._db != null){
                var transaction = this._db.transaction(["attachment"])
                    .objectStore("attachment")
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
         * Provides the size of database in bytes
         * @param callback callback(size, null) or callback(null, error)
         */
        this.size = function(callback){
            if(this._db != null){
                var usage = { sizeBytes: 0, tileCount: 0 };

                var transaction = this._db.transaction(["attachment"])
                    .objectStore("attachment")
                    .openCursor();

                transaction.onsuccess = function(event){
                    var cursor = event.target.result;
                    if(cursor){
                        var storedObject = cursor.value;
                        var json = JSON.stringify(storedObject);
                        usage.sizeBytes += this.stringBytes(json);
                        usage.tileCount += 1;
                        cursor.continue();
                    }
                    else{
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
            return str.length * 2 ;  //UTF-16!
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

                if( db.objectStoreNames.contains("attachment"))
                {
                    db.deleteObjectStore("attachment");
                }

                var objectStore = db.createObjectStore("attachment", { keyPath: "uid" });
            }.bind(this);

            request.onsuccess = function(event)
            {
                this._db = event.target.result;
                console.log("dbAttachmentStore database opened successfully");
                callback(true);
            }.bind(this);
        }
    }
    return DbStore;
});
