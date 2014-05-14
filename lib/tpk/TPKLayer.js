/**
 * Library for reading an ArcGIS Tile Package (.tpk) file and displaying the tiles
 * as a map that can be used both online and offline.
 *
 * Note: you may have to rename your .tpk file to use .zip in order for it to be recognized.
 *
 * Author: Andy Gup
 * Credits: Mansour Raad for his ArcGIS API for Flex TPKLayer
 */
define([
    "dojo/_base/declare","esri/geometry/Extent","dojo/query","esri/SpatialReference","tpk/DataStream",
    "esri/layers/TileInfo","esri/layers/TiledMapServiceLayer","tiles/TilesStore","tiles/tilingScheme",
    "tpk/zip","tpk/xml2json","tpk/autoCenterMap","dojo/Evented"],
    function(declare,Extent,query,SpatialReference,DataStream,TileInfo,TiledMapServiceLayer,TilesStore,TilingScheme,zip,X2JS,autoCenter,Evented){
        return declare("esri.TPKLayer",[TiledMapServiceLayer,Evented],{
            MAX_DB_SIZE: 75,                        // Recommended maximum size in MBs
            TILE_PATH:"",                           // The absolute path to the root of bundle/bundleX files e.g. V101/YOSEMITE_MAP/
            RECENTER_DELAY: 350,                    // Millisecond delay before attempting to recent map after an orientation change
            VALIDATION_ERROR: "validationError",    // Library validation error.
            DATABASE_ERROR: "databaseError",        // An error thrown by the database.
            PARSING_ERROR: 'parsingError',          // An error was encountered while parsing a TPK file.
            PROGRESS_EVENT: "progress",             // Event dispatched while parsing a bundle file.
            PROGRESS_START: "start",
            PROGRESS_END: "end",

            //
            // Private properties
            //
            _maxDBSize: 75,                         // User configurable maximum size in MBs.
            _isDBWriteable: true,                   // Manually allow or stop writing to the database.
            _autoCenter: null,                      // Auto center the map
            _fileEntriesLength: 0,                  // Number of files in zip

            //
            // Public Properties
            //
            map: null,
            store: null,                            // Reference to the local database store and hooks to it's functionality

            constructor:function(){
                this._self = this;
                this._inMemTiles = [];
                this.store = new TilesStore();
                this._validate();
            },

            extend: function(files){
                this._fileEntriesLength = files.length;
                this.emit(this.PROGRESS_EVENT,this.PROGRESS_START);

                // Create a new array that contains an index of what is in the zip/tpk file. This provides
                // a highly optimized search pattern based on each tiles filename. We can then look up the
                // index first and then use that index to retrieve the exact tile without having to iterate
                // through a large in-memory Array.
                this._inMemTilesIndex = files.map(function(tile){
                    var name = tile.filename.toLocaleUpperCase();
                    var index = name.indexOf("_ALLLAYERS",0);
                    if(index != -1){
                        this.TILE_PATH = name.slice(0,index);
                    }
                    console.log("TPK filename " + name);
                    return name;
                }.bind(this));

                this._parseInMemFiles(files,function (buffer){
                    //Parse conf.xml and conf.cdi to get the required setup info
                    this._parseConfCdi(buffer,function(initExtent,result){
                        this.initialExtent = (this.fullExtent = initExtent);
                        this.tileInfo = new TileInfo(result);
                        this.spatialReference = new SpatialReference({wkid:this.tileInfo.spatialReference.wkid});
                        this.loaded = true;
                        this.onLoad(this);

                        this.emit(this.PROGRESS_EVENT,this.PROGRESS_END);
                    }.bind(this._self));
                }.bind(this._self));
            },

            /**
             * Overrides getTileUrl method
             * @param level
             * @param row
             * @param col
             * @returns {string}
             */
            getTileUrl:function(level,row,col){
                this.emit(this.PROGRESS_EVENT,this.PROGRESS_START);
                var layersDir = this._self.TILE_PATH + "_alllayers";
                var url = this._getCacheFilePath(layersDir,level,row,col);

                if(this._inMemTiles.length > 0) {
                    /* temporary URL returned immediately, as we haven't retrieved the image from the indexeddb yet */
                    var tileid = "void:/" + level + "/" + row + "/" + col;

                    if(this.map == null) this.map = this.getMap();
                    if(this._autoCenter == null) this._autoCenter = new autoCenter(this.map,this.RECENTER_DELAY);

                    var count = this._getUrlCountByExtent(this._self,this.map.extent,level);
                    //console.log("Layer tile count: " + count)

                    this._getInMemTiles(url,layersDir, level, row, col, count,function (result) {

                        var img = query("img[src=" + tileid + "]")[0];
                        if (typeof img == "undefined")img = new Image(); //create a blank place holder for undefined images
                        var imgURL;


                        if (result) {
                            console.log("found tile offline", url);
                            imgURL = "data:image/png;base64," + result;
                            img.style.borderColor = "blue";
                        }
                        else {
                            img.style.borderColor = "green";
                            console.log("tile is not in the offline store", url);
                            imgURL = "data:image/png;base64,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pmk0TROPj48Hn3l4eIimaSJN06O3A4NJwDMxm82ibdtXo4D5fB6r1Sp+//4dz8/Pw5H+6ekpdrtdJEkS8/n8S/9f713ie3vaceo9x557QAB451Sgfyin34HKshweunk5HzAej2MymXz5+f9nbjJyI9L39Wu5XP55+XQZ39uxR4Z3u90wSXjqEV0wAjhjx47oaZq63Me/ZhIQBAAQAEAAAAEABAAQAEAAAAEABAAQAEAAAAEABAAQAEAAAAEABAAQAEAAAAEABAAQAEAAAAEABAAQAEAAAAEABAAQAEAAAAEABAAQAEAAAAEAAbAJQAAAAQAEABAAQAAAAQAEABAAQAAAAQAEABAAQAAAAQAEABAAQAAAAQAEABAAQAAAAQAEABAAQAAAAQAEABAAQAAAAQAEABAAQAAAAQAEABAAEABAAAABAAQAEABAAAABAAQAEABAAAABAAQAEABAAAABAAQAEABAAAABAAQAEABAAAABAAQAEABAAAABAAQAEABAAAABAAQAEABAAAABAAQAEAAQAEAAAAEABAAQAEAAAAEABAAQAEAAAAEABAAQAEAAAAEAvqe/BwCeKjUweoA8pQAAAABJRU5ErkJggg==";
                        }
                        // when we return a nonexistent url to the image, the TiledMapServiceLayer::_tileErrorHandler() method
                        // sets img visibility to 'hidden', so we need to show the image back once we have put the data:image
                        img.style.visibility = "visible";
                        img.src = imgURL;
                        console.log("URL length " + imgURL.length + ", image: " + imgURL);
                        this.emit(this.PROGRESS_EVENT,this.PROGRESS_END);
                        return "";
                        /* this result goes nowhere, seriously */
                    }.bind(this._self))

                    return tileid;
                }
            },

            /**
             * Optional. Set the maximum database size. Recommended maximum for mobile devices is 100MBs.
             * Making the database too large can result in browser crashes and slow performance.
             * TPKs can contain a lot of data!
             * @param size
             */
            setMaxDBSize: function(size){
                //Make sure the entry is an integer.
                var testRegex = /^\d+$/;
                if(testRegex.test(size) && size <= this.MAX_DB_SIZE){
                    this._maxDBSize = size;
                }
                else{
                    console.log("setMaxDBSize Error: invalid entry. Integers only and less than " + this.MAX_DB_SIZE + "MBs");
                }
            },

            /**
             * Returns the size of the tiles database.
             * @param callback {size , error}. Note, size is in bytes.
             */
            getDBSize: function(callback){
                this.store.usedSpace(function(size,err){
                    callback(size,err);
                }.bind(this))
            },

            /**
             * Sets whether or not tiles can be written to the database. This function
             * can help you manage the size of the tiles database.
             * Use this in conjunction with getDBSize() on a map pan or zoom event listener.
             * @param value
             */
            isDBWriteable: function(/* Boolean */ value){
                this._isDBWriteable = value;
            },

            /**
             * Runs specific validation tasks. Reserved for future use.
             * Currently only throws console errors. Does not stop execution of the library!
             * @private
             */
            _validate: function(){
                //Verify if basic functionality is supported by the browser
                if(!window.File && !window.FileReader && !window.Blob && !window.btoa && !window.DataView){
                    console.error(new Error( "This library is not supported on your browser!").stack);
                    this.emit(this.VALIDATION_ERROR,{msg:"TPKLayer library is not supported", err : null});
                }

                //Verify if IndexedDB is supported and initializes properly
                if( /*false &&*/ this.store.isSupported() )
                {
                    this.store.init(function(result){
                        if(result == false){
                            console.error(new Error( "There was an error initializing the database.").stack);
                            this.emit(this.DATABASE_ERROR,{msg:"Unable to initialize the database.", err: null});
                        }
                        else{
                            this.store.usedSpace(function(size,err){
                                var mb = this._bytes2MBs(size.sizeBytes);
                                if(mb > this.MAX_DB_SIZE){
                                    console.error(new Error( "Database is full!").stack);
                                    this.emit(this.DATABASE_ERROR,{msg:"Database full! ",err : err});
                                }
                                console.log("DB size: " + mb + " MBs, Tile count: " + size.tileCount +  ", Error: " + err)
                            }.bind(this))
                        }
                    }.bind(this));
                }
                else
                {
                    console.error(new Error( "IndexedDB is not supported on your browser.").stack);
                    this.emit(this.VALIDATION_ERROR,{msg:"IndexedDB is not supported.", err : null});
                }
            },

            /**
             * Recursive function for pulling out individual files from the .tpk/zip and storing
             * them in an array as blobs.
             * @param files
             * @param callback
             * @private
             */
            _parseInMemFiles: function(files,callback){
                var that = this;
                var inMemTilesLength = this._inMemTiles.length;
                if(inMemTilesLength < this._fileEntriesLength){
                    files[0].getData(new zip.BlobWriter(),function(data){

                        var reader = new FileReader();
                        reader.onerror = function (event) {
                            console.error(new Error("_parseInMemFiles Error: " + event.target.error.code).stack);
                            this.emit(context.PARSING_ERROR, {msg: "Error parsing file: ", err: event.target.error});
                        }
                        reader.addEventListener("loadend", function (evt) {
                            that._inMemTiles.push(this.result);
                            files.shift();
                            that._parseInMemFiles(files,callback);
                        });
                        reader.readAsArrayBuffer(data); //open bundleX
                    }.bind(that));
                }
                if(inMemTilesLength == this._fileEntriesLength){
                    callback(this._inMemTiles);
                }
            },

            /**
             * Parse conf.cdi
             * @param tilesInfo
             * @param callback
             * @private
             */
            _parseConfCdi: function(tilesInfo,callback){
                var that = this._self;
                var m_conf_index = this._inMemTilesIndex.indexOf(this.TILE_PATH + "CONF.CDI");

                if(m_conf_index != -1){
                    var m_conf_i = this._inMemTiles[m_conf_index];

                    var result = m_conf_i;
                    var str = this._bin2String(result);

                    var x2js = new X2JS();

                    var jsonObj = x2js.xml_str2json( str );
                    var envelopeInfo = jsonObj.EnvelopeN;
                    var xmin = parseFloat(envelopeInfo.XMin);
                    var ymin = parseFloat(envelopeInfo.YMin);
                    var xmax = parseFloat(envelopeInfo.XMax);
                    var ymax = parseFloat(envelopeInfo.YMax);

                    var initExtent = new Extent(
                        xmin,ymin,xmax,ymax
                    );

                    that._parseConfXml(initExtent,function(initExtent,result){
                        callback(initExtent,result)
                    },that)
                }
            },

            /**
             * Parse conf.xml
             * @param callback
             * @param context
             * @private
             */
            _parseConfXml:function(initExtent,callback,context) {
                var m_conf_config = this._inMemTilesIndex.indexOf(this.TILE_PATH + "CONF.XML");
                if (m_conf_config != -1) {
                    var m_conf = this._inMemTiles[m_conf_config];

                    var result = m_conf;
                    var str = this._bin2String(result);

                    var x2js = new X2JS();

                    var jsonObj = x2js.xml_str2json(str);
                    var cacheInfo = jsonObj.CacheInfo;
                    var tileInfo = {};
                    tileInfo.rows = parseInt(cacheInfo.TileCacheInfo.TileRows);
                    tileInfo.cols = parseInt(cacheInfo.TileCacheInfo.TileCols);
                    tileInfo.dpi = parseInt(cacheInfo.TileCacheInfo.DPI);
                    tileInfo.format = cacheInfo.TileImageInfo.CacheTileFormat;
                    tileInfo.compressionQuality = parseInt(cacheInfo.TileImageInfo.CompressionQuality);
                    tileInfo.origin = {
                        x: parseInt(cacheInfo.TileCacheInfo.TileOrigin.X),
                        y: parseInt(cacheInfo.TileCacheInfo.TileOrigin.Y)
                    }
                    tileInfo.spatialReference = {
                        "wkid": parseInt(cacheInfo.TileCacheInfo.SpatialReference.WKID)
                    }

                    var lods = cacheInfo.TileCacheInfo.LODInfos.LODInfo;
                    var finalLods = [];
                    for (var i = 0; i < lods.length; i++) {
                        finalLods.push({
                            "level": parseFloat(lods[i].LevelID),
                            "resolution": parseFloat(lods[i].Resolution),
                            "scale": parseFloat(lods[i].Scale)})
                    }

                    tileInfo.lods = finalLods;
                    callback(initExtent,tileInfo);
                }
            },

            /**
             * Parses the in-memory tile cache and returns a base64 tile image
             * @param layersDir
             * @param level
             * @param row
             * @param col
             * @param tileCount - number of tiles in the Extent
             * @param callback
             * @private
             */
            _getInMemTiles: function(url,layersDir,level,row,col,tileCount,callback){

                var that = this._self;
                var url = url;
                var db = this.store;

                //First check in the database if the tile exists.
                //If not then we store the tile in the database later.
                this.store.retrieve(url, function(success, offlineTile){
                    if( success )
                    {
                        console.log("Tile found in indexedDB: " + url)
                        callback(offlineTile.img);
                    }
                    else {
                        var snappedRow = Math.floor(row / 128) * 128;
                        var snappedCol = Math.floor(col / 128) * 128;

                        var path = this._getCacheFilePath(layersDir, level, snappedRow, snappedCol).toLocaleUpperCase();

                        var offset;
                        var bundleIndex = this._inMemTilesIndex.indexOf(path + ".BUNDLE");
                        var bundleXIndex = this._inMemTilesIndex.indexOf(path + ".BUNDLX");

                        if (bundleIndex == -1 || bundleXIndex == -1) {
                            callback(null) //didn't find anything
                        }
                        else{

                            offset = this._getOffset(level, row, col, snappedRow, snappedCol);
                            var pointer = that._getPointer(this._inMemTiles[bundleXIndex], offset);
                            var str = that._bin2Base64(this._inMemTiles[bundleIndex],pointer);
                            if (that._isDBWriteable)that._storeTile(url, str, db);
                            callback(str);
                        }
                    }
                }.bind(that))
            },

            /**
             * Stores a tile in the local database.
             * @param url
             * @param base64Str
             * @param db
             * @private
             */
            _storeTile: function(url,base64Str,db){
                var tile = {
                    url: url,
                    img: base64Str
                };

                db.store(tile,function(success,err){
                    if(err){
                        console.error(new Error( "Error writing to database." + err).stack);
                        this.emit(this.DATABASE_ERROR,{msg:"Error writing to database. ", err : err});
                    }
                });
            },

            /**
             * Helper method that returns an array of tile urls within a given extent and level
             * @returns int
             */
            _getUrlCountByExtent: function(layer,extent,level){
                var tilingScheme = new TilingScheme(layer);
                var level_cell_ids = tilingScheme.getAllCellIdsInExtent(extent,level);
                var count = 0;

                level_cell_ids.forEach(function(cell_id)
                {
                    count++;
                }.bind(this));

                return count;
            },

            /**
             * Returns a pointer for reading a BUNDLE binary file as based on the given offset.
             * @param blob
             * @param offset
             * @returns {Uint8}
             * @private
             */
            _getPointer: function(/* Blob */ blob,offset){
                var snip = blob.slice(offset);
                var dv =  new DataView(snip,0,5);

                var nume1 = dv.getUint8(0,true);
                var nume2 = dv.getUint8(1,true);
                var nume3 = dv.getUint8(2,true);
                var nume4 = dv.getUint8(3,true);
                var nume5 = dv.getUint8(4,true);

                var value = nume5;
                value = value * 256 + nume4;
                value = value * 256 + nume3;
                value = value * 256 + nume2;
                value = value * 256 + nume1;

                return value;
            },

            /**
             * Converts a blob to a string
             * @param blob
             * @returns {string}
             * @private
             */
            _bin2String: function(/* Blob */ blob){
                var str = "";
                var arr = new Uint8Array(blob,0);
                var length = arr.length;
                for (var i = 0; i < length; i++) {
                    str += String.fromCharCode(arr[i])
                }
                return str;
            },

            /**
             * Given a blob and a position it will return a Base64 tile image
             * @param blob
             * @param position
             * @returns {string}
             * @private
             */
            _bin2Base64: function(/* Blob */blob,/* int */ position){
                var stream = new DataStream(blob, 0,
                    DataStream.LITTLE_ENDIAN);
                stream.seek(position);
                var chunk = stream.readInt32(true);
                var string = stream.readString(chunk);  //Notes: Range limits in Chrome: https://bugs.webkit.org/show_bug.cgi?id=80797
                return btoa(string);
            },

            /**
             * Converts an integer to hex
             * @param value
             * @returns {string}
             * @private
             */
            _int2HexString: function(/* int */ value){
                var text = value.toString(16).toUpperCase();
                if (text.length === 1)
                {
                    return "000" + text;
                }
                if (text.length === 2)
                {
                    return "00" + text;
                }
                if (text.length === 3)
                {
                    return "0" + text;
                }
                return text.substr(0, text.length);
            },

            /**
             * Determines where to start reading a BUNDLEX binary file
             * @param level
             * @param row
             * @param col
             * @param startRow
             * @param startCol
             * @returns {number}
             * @private
             */
            _getOffset: function(/* int */level, /* number */row,/* number */col, /* number */startRow, /* number */ startCol){
                var recordNumber = 128 * (col - startCol) + (row - startRow);
                return 16 + recordNumber * 5;
            },

            /**
             * Returns a hexadecimal representation of a cache file path
             * @param layerDir
             * @param level
             * @param row
             * @param col
             * @returns {string}
             * @private
             */
            _getCacheFilePath: function(/* String */ layerDir, /* int */level, /* int */row, /* int */ col){
                var arr = [];

                arr.push(layerDir);
                arr.push("/");
                arr.push("L");
                arr.push(level < 10 ? "0" + level : level);
                arr.push("/");
                arr.push("R");
                arr.push(this._int2HexString(row));
                arr.push("C");
                arr.push(this._int2HexString(col));

                return arr.join("");
            },

            /**
             * Returns database size in MBs.
             * @returns {string}
             * @private
             */
            _bytes2MBs: function(bytes){
                return (bytes >>> 20 ) + '.' + ( bytes & (2*0x3FF ) )
            }
        })
    }
)

