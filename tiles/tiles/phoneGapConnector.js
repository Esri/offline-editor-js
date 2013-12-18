var PhoneGapConnector = function(){

    this.__db = null; //local reference to database

    /**
     * Size of the database in bytes
     * @type {number}
     */
    this._dbSize = 0;
    this._dbVersion = null;

    /**
     * Public ENUMs. Immutable reference values.
     * @type {Object}
     * @returns {Object}
     * @private
     */
    this.enum = (function(){
        var values = {
            DATABASE_NAME : "TileDB",
            SQL_ERROR_EVENT: "SQL error. See actual message for details"
        }

        return values;
    });

    /**
     * Deletes the database table
     * @param callback (true, event) or (false, SQLError)
     */
    this.deleteDB = function(callback){
        this.__db.transaction(function(tx){
                tx.executeSql('DROP TABLE IF EXISTS TILES');
            },
            function(err){
                callback(false,err);
            },
            function(evt){
                callback(true,evt);
            }.bind(this))
    }

    /**
     * Sets a url and it's associated base64 tile in the database
     * @param url
     * @param tile
     * @param callback (false, SQLError, url) or (true,null,null)
     */
    this.setUrl = function(/* String */ url, /* String */ tile,callback){
        this.__db.transaction(function(tx){
                tx.executeSql("INSERT INTO TILES (url,tile) VALUES ('" + url + "','" + tile + "')");
            },
            function(err){
                callback(false,err,url);
            },
            callback(true,null,null))
    }

    /**
     * Get a tile via a url.
     * @param url
     * @param callback (null, tile) or (err, null)
     */
    this.getTile = function(url,callback){
        this.__db.transaction(function(tx){
                tx.executeSql("SELECT tile FROM TILES WHERE url ='"+ url + "'",[],
                function(tx,results){
                    var length = results.rows.length;
                    if(length != 0){
                        var tile = results.rows.item(0).tile;
                        callback(null,tile);
                    }
                    else if(length == 0){
                        callback(null,null);
                    }
                },
                function(err){
                    callback(err,null);
                })
            },

            function(err){
                callback(err,null);
            });
    }

    /**
     * Returns the database size in bytes that was during init()
     * @param size
     * @returns {number}
     */
    this.getDBSize = function(/* int */ size){
        return this._dbSize;
    }

    /**
     * Returns the database version or returns null.
     * If this returns null then the database may have not been created yet.
     * @returns {*}
     */
    this.getDBVersion = function(){      console.log("HAHAHA " + typeof this.__db)
        if(this.__db != null){
            if(this.__db.hasOwnProperty("version") == true ){
                return this.__db.version;
            }
        }

        return null;
    }

    /**
     * Returns a row count
     * @param callback (count, null) or (null,err)
     */
    this.getDBCount = function(callback){
        this.__db.transaction(function(tx){
                console.log("starting...")
                tx.executeSql("SELECT count(*) from TILES",[],
                    function(tx,results){
                        var length = results.rows.length;
                        if(length != 0){
                            var data = results.rows.item(0);
                            var key = Object.keys(data)[0];
                            callback(data[key],null);
                        }
                        else if(length == 0){
                            callback(0,null);
                        }
                    },
                    function(err){
                        callback(null,"Check that the query is properly formed");
                    })
            },

            function(err){
                callback(null,this._SQLEvtToTxt(err));
            });
    }

    /**
     * Parses a SQLError Event message and returns a code safe string.
     * If no message is detected the function will return null
     * @param evt
     * @returns {string}
     * @constructor
     */
    this.SQLEvtToTxt = function(evt){
        if(typeof evt == "undefined"){
            return "null";
        }
        else{
            return evt.code + ", " + evt.message;
        }
    }

    //////////////////////////
    ///
    /// PRIVATE METHODS
    ///
    //////////////////////////

    this._createDB = function(tx){
        tx.executeSql('CREATE TABLE IF NOT EXISTS TILES (url TEXT UNIQUE, tile TEXT)');
    }

    /**
     * Custom event dispatcher
     * @param msg
     * @param event
     * @private
     */
    this._sendEvent = function(msg,event){
        //this.preventDefault();

        if (msg && window.CustomEvent) {
            var event = new CustomEvent(event, {
                detail: {
                    message: msg,
                    time: new Date()
                },
                bubbles: true,
                cancelable: true
            });

            document.dispatchEvent(event);
        }
    }

    /**
     * Initialize the database for use
     * @param dbSize
     * @param callback (true, event) or (false, SQLError)
     */
    this.init = function(/* int */ dbSize,callback) {
        this._dbSize = dbSize;

        this.__db = window.openDatabase(this.enum().DATABASE_NAME, "1.0", "Tile Database", dbSize);
        if(this.__db != null){
            this.__db.transaction(this._createDB,
                function(err){
                    callback(false,err);
                },
                function(evt){
                callback(true,evt);
                }.bind(this))
        }
        else{
            console.log("Init: unknown problem");
            callback(false,null)
        }

    };

    /**
     * NOTES:
     * Cordova Storage docs: http://cordova.apache.org/docs/en/3.1.0/cordova_storage_storage.md.html#Database
     * SQLite data types: http://www.sqlite.org/datatype3.html
     * Copy database to sdcard: http://stackoverflow.com/questions/4935388/ddms-file-explorer-cant-access-data-data-htc-desire-hd
     */

}
