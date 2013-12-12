var PhoneGapConnector = function(){

    this.__db = null; //local reference to database

    /**
     * Public ENUMs. Immutable reference values.
     * @type {Object}
     * @returns {Object}
     * @private
     */
    this.enum = (function(){
        var values = {
            DATABASE_NAME : "TileDB",
            SQL_DELETE_EVENT: "Database deleted",
            SQL_CREATED_EVENT: "Database created",
            SQL_ERROR_EVENT: "SQL error. See actual message for details"
        }

        return values;
    });

    this.deleteDB = function(){
        this.__db.transaction(function(tx){
                tx.executeSql('DROP TABLE IF EXISTS TILES');
            },
            this._fail,
            function(evt){
                this._sendEvent(true,this.enum().SQL_DELETE_EVENT);
            }.bind(this))
    }

    this.setItem = function(/* String */ url, /* String */ tile){
        this.__db.transaction(function(tx){
                tx.executeSql("INSERT INTO TILES (url,tile) VALUES ('" + url + "','" + tile + "')");
            },
            this._fail,
            console.log("url added: " + url))
    }

    this.getDBInfo = function(){

    }


    //////////////////////////
    ///
    /// PRIVATE METHODS
    ///
    //////////////////////////

    /**
     * SQL Errors. Some of these are not very helpful.
     * @type {*}
     * @private
     */
    this._fail = function(err) {
        console.log("SQL error code: " + err.code + ": " + err.message);
        switch(err.code){
            case 1:
                console.log("Phonegap SQL: unknown error.");
                this._sendEvent("unknown error",this.enum().SQL_ERROR_EVENT);
                break;
            case 2:
                console.log("Phonegap SQL: database error");
                this._sendEvent("database error",this.enum().SQL_ERROR_EVENT);
                break;
            case 3:
                console.log("Phonegap SQL: version error");
                this._sendEvent("version error",this.enum().SQL_ERROR_EVENT);
                break;
            case 4:
                console.log("Phonegap SQL: too large error");
                this._sendEvent("too large error",this.enum().SQL_ERROR_EVENT);
                break;
            case 5:
                console.log("Phonegap SQL: quota error");
                this._sendEvent("quota error",this.enum().SQL_ERROR_EVENT);
                break;
            case 6:
                console.log("Phonegap SQL: syntax error");
                this._sendEvent("syntax error",this.enum().SQL_ERROR_EVENT);
                break;
            case 7:
                console.log("Phonegap SQL: constraint error");
                this._sendEvent("contraint error",this.enum().SQL_ERROR_EVENT);
                break;
            case 8:
                console.log("Phonegap SQL: timeout error");
                this._sendEvent("timeout error",this.enum().SQL_ERROR_EVENT);
                break;
        }
    }.bind(this)

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

    this.init = function(/* int */ dbSize) {
        document.addEventListener("load",
            function(evt){console.log("loaded: ")},
            false)
        this.__db = window.openDatabase(this.enum().DATABASE_NAME, "1.0", "Tile Database", dbSize);
        if(this.__db != null){
            this.__db.transaction(this._createDB, this._fail,function(evt){
                this._sendEvent(true,this.enum().SQL_CREATED_EVENT);
            }.bind(this))
        }
        else{
            this._fail(1);
        }

    }.bind(this);

    /**
     * NOTES:
     * Cordova Storage docs: http://cordova.apache.org/docs/en/3.1.0/cordova_storage_storage.md.html#Database
     * SQLite data types: http://www.sqlite.org/datatype3.html
     * Copy database to sdcard: http://stackoverflow.com/questions/4935388/ddms-file-explorer-cant-access-data-data-htc-desire-hd
     */

}
