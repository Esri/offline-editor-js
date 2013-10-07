/**
 * Library for handling the storage of map tiles.
 * Can use localStorage or IndexedDB. Local storage is supported in
 * more browsers (caniuse.com) however it is significantly more
 * limited in size.
 * NOTE: Uses localStorage by default. Override with useIndexedDB property.
 * NOTE: if you use IndexedDB be sure to verify if its available for use.
 * @param map
 * @constructor
 *
 * Author: Andy Gup (@agup)
 */
var OfflineTileStore = function(/* Map */ map) {

    this.ioWorker = null;
    this.extend = null;
    this.storage = 0;
    this.map = map;
    this.dbStore = null //indexedDB
    this.useIndexedDB = false;

    /**
     * Provides control over allow/disallow values to be
     * written to storage. Can be used for testing as well.
     * @type {boolean}
     */
    this.allowCache = true;

    /**
     * Private Local ENUMs (Constants)
     * Contains required configuration info.
     * @type {Object}
     * @returns {*}
     * @private
     */
    this._localEnum = (function(){
        var values = {
            TIMEOUT : 20,                                      /* Seconds to wait for all tile requests to complete */
            LOCAL_STORAGE_MAX_LIMIT : 4.75, /* MB */           /* Most browsers offer default storage of ~5MB */
            LS_TILE_COUNT : "tile_count",
            WORKER_URL : "./src/ioWorker.js"                   /* child process for gathering tiles */
        }

        return values;
    });

    /**
     * Determines total storage used for this domain.
     * @returns Number MB's
     */
    this.getlocalStorageUsed = function(){
        var mb = 0;

        //IE hack
        if(window.localStorage.hasOwnProperty("remainingspace")){
            //http://msdn.microsoft.com/en-us/library/ie/cc197016(v=vs.85).aspx
            mb = window.localStorage.remainingSpace/1024/1024;
        }
        else{
            for(var x in localStorage){
                //Uncomment out console.log to see *all* items in local storage
                //console.log(x+"="+((localStorage[x].length * 2)/1024/1024).toFixed(2)+" MB");
                mb += localStorage[x].length
            }
        }

        return Math.round(((mb * 2)/1024/1024) * 100)/100;
    }

    /**
     * Refreshes base map and stores tiles.
     * If they are already in database they are ignored.
     */
    this.storeLayer = function(){
        this.tileCount = 0;
        this.extendLayer(function(/* boolean */ evt){
            var ids = map.layerIds;
            var layer = map.getLayer(ids[0]);
            layer.refresh();
        }.bind(this));
    }

    this.extendLayer = function(callback){
        if(this.extend == null){
            var count = 0;

            var allow = this.allowCache;
            var worker = this.ioWorker;
            var db = database;
            var indexDB = this._useIndexedDB;

            this.extend = dojo.extend(esri.layers.ArcGISTiledMapServiceLayer, {  //extend ArcGISTiledMapServiceLayer to use localStorage if available, else use worker to request tile and store in local storage.

                getTileUrl : function(level, row, col) {
                    this.tileCount++;
                    count++;   //count number of tiles
                    console.log("Count " + count);
                    localStorage.setItem("tile_count",count);

                    var url = this._url.path + "/tile/" + level + "/" + row + "/" + col;

                    if(indexDB == true){
                        database.get(url,function(event,result){
                            console.log("img: " + result.img + ", event.url: " + result.url);
                            if(event == true){
                                console.log("in indexed db storage");
                                return "data:image;base64," + result.img;
                            }
                            else{
                                console.log("not in indexed db storage, pass url and load tile", url);
                                worker.postMessage([url]);
                                return url;
                            }
                        }.bind(this))
                    }

                    else{
                        if(localStorage.getItem(url) !== null) {
                            console.log("in local storage");
                            return "data:image;base64," + localStorage.getItem(url);
                        }
                        else if(allow == true) {
                            console.log("not in local storage, pass url and load tile", url);
                            worker.postMessage([url]);
                            return url;
                        }
                    }
                }});
            callback(true);
        }
        else{
            callback(false);
        }
    }

    /**
     * Load src
     * TO-DO: Needs to be made AMD compliant!
     * @param urlArray
     * @param callback
     * @private
     */
    this._loadScripts = function(/* Array */ urlArray, callback)
    {
        count = 0;
        for(var i in urlArray){
            try{
                var head = document.getElementsByTagName('head')[0];
                var script = document.createElement('script');
                script.type = 'text/javascript';
                script.src = urlArray[i];
                script.onreadystatechange = function(){
                    count++;
                    console.log("Script loaded. " + this.src);
                    if(count == urlArray.length) callback();
                };
                script.onload = function(){
                    count++;
                    console.log("Script loaded. " + this.src);
                    if(count == urlArray.length) callback();
                };
                head.appendChild(script);
            }
            catch(err){
                console.log("_loadScripts: " + err.stack);
            }
        }
    }

    this.initLocalStorage = function() {
        var tempArray = [];
        var tempCount = 0;
        this.dbStore = new dbStore();
        this.ioWorker = new Worker(this._localEnum().WORKER_URL);
        this.ioWorker.onmessage = function(evt) {

            this.storage = this.getlocalStorageUsed();
            console.log("Worker to Parent: ", evt.data[0]);
            console.log("localStorage used: " + this.getlocalStorageUsed());

            try {
                localStorage.setItem(evt.data[0], evt.data[1]);
                tempCount++;
                tempArray.push({url:evt.data[0],img: evt.data[1]});
            } catch(error) {
                console.log('Problem adding tile to local storage. Storage might be full');
            }

            var count = parseFloat(localStorage.getItem(this._localEnum().LS_TILE_COUNT));
            if(tempCount == count){
                localStorage.setItem(this._localEnum().LS_TILE_COUNT,0);
                database.add(tempArray,function(evt,err){
                    evt == true ? console.log("Done") : console.log("init " + err);
                });
            }
        }.bind(this);
    }

    this._init = function(){
        this.initLocalStorage();
    }.bind(this)()

}
