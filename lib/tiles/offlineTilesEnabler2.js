define([
    "dojo/query",
    "dojo/request",
    "dojo/_base/declare",
    "tiles/base64utils",
    "tiles/TilesStore",
    "tiles/tilingScheme",
    "tiles/FileSaver",
    "esri/layers/LOD",
    "esri/geometry/Point",
    "esri/geometry/Extent",
    "esri/layers/TileInfo",
    "esri/SpatialReference",
    "esri/layers/TiledMapServiceLayer"
], function(query, request, declare,Base64Utils,TilesStore,TilingScheme,
            FileSaver,LOD,Point,Extent,TileInfo,SpatialReference,TiledMapServerLayer)
{
    "use strict";
    return declare("OfflineTileEnablerLayer",[TiledMapServerLayer],{

        tileInfo: null,
        _imageType:"",

        /**
         * Utility method to get the basemap layer reference
         * @param map
         * @returns {Number} layerId
         */
        getBasemapLayer: function(map)
        {
            var layerId = map.layerIds[0];
            return map.getLayer(layerId);
        },

        constructor:function(url,callback,state){

            this._self = this;
            this._lastTileUrl = "";
            this._imageType = "";

            /* we add some methods to the layer object */
            /* we don't want to extend the tiled layer class, as it is a capability that we want to add only to one instance */
            /* we also add some additional attributes inside an "offline" object */

            this._getTileUrl = this.getTileUrl;http://web.local/offline-editor-js/samples/test.html

            var isOnline = true;
            if(typeof state != "undefined"){
                isOnline = state; console.log("STATE IS: " + state)
            }

            this.offline = {
                online: isOnline,
                store: new TilesStore(),
                proxyPath: "../lib/resource-proxy/proxy.php"
            };

            if( /*false &&*/ this.offline.store.isSupported() )
            {
                this.offline.store.init(function(success){
                    if(success){
                        this._getTileInfoPrivate(url,function(result){
                            this.parseGetTileInfo(result,function(result){
                                this.layerInfos = result.resultObj.layers;
//                                this.version = result.resultObj.currentVersion;
//                                this.visibleAtMapScale = false;
//                                this.tileServers = [url];
//                                this.resampling = false;
//                                this._displayLevels = null;
//                                this._resamplingTolerance = null;
//                                this._patchIE = false;
//                                this._hasMin = true;
//                                this._hasMax = true;
//                                this.visibleLayer = [];
//                                this._tileH = result.tileInfo.rows;
//                                this._tileW = result.tileInfo.cols;
//                                this.resourceInfo = JSON.stringify(result.resultObjj);

//                                var t = this;
//                                for (var attrname in result.resultObj) { t[attrname] = result.resultObj[attrname]; }

//                                var scales = [];
//                                for (var i = 0; i < result.tileInfo.lods.length; i++){
//                                    scales.push(result.tileInfo.lods[i].scale);
//                                }
//
//                                this.scales = scales;

                                this.minScale = result.resultObj.minScale;
                                this.maxScale = result.resultObj.maxScale;
                                this.tileInfo = result.tileInfo;
                                this._imageType = this.tileInfo.format.toLowerCase();
                                this.fullExtent = result.fullExtent;

                                this.initialExtent = result.initExtent;
                                this.loaded = true;
                                this.onLoad(this);
                                callback(true);
                            }.bind(this._self));
                        }.bind(this._self))
                    }
                }.bind(this._self));
            }
            else
            {
                return callback(false, "indexedDB not supported");
            }
        },

        /**
         * Internal method that overrides the getTileUrl() method.
         * If application is offline then tiles are written to local storage.
         * Retrieves tiles as requested by the ArcGIS API for JavaScript.
         * If a tile is in cache it is returned.
         * If it is not in cache then one is retrieved over the internet.
         * @param level
         * @param row
         * @param col
         * @returns {String} URL
         */
        getTileUrl: function(level,row,col)
        {
            console.assert(!isNaN(level) && !isNaN(row) && !isNaN(col), "bad tile requested");
            console.log("looking for tile",level,row,col);

            var url = this.url + "/tile/" + level + "/" + row + "/" + col;
            console.log("LIBRARY ONLINE " + this.offline.online)
            if( this.offline.online )
            {
                console.log("fetching url online: ", url);
                this._lastTileUrl = url;
                return url;
            }

            url = url.split("?")[0];

            /* temporary URL returned immediately, as we haven't retrieved the image from the indexeddb yet */
            var tileid = "void:/"+level+"/"+row+"/"+col;

            this.offline.store.retrieve(url, function(success, offlineTile)
            { console.log("TILE RETURN " + success + ", " + offlineTile)
                /* when the .get() callback is called we replace the temporary URL originally returned by the data:image url */
                // search for the img with src="void:"+level+"-"+row+"-"+col and replace with actual url
                var img = query("img[src="+tileid+"]")[0];
                var imgURL;

                console.assert(img !== "undefined", "undefined image detected");

                if( success )
                {
                    img.style.borderColor = "blue";
                    console.log("found tile offline", url);
                    imgURL = "data:image/" + this._imageType +";base64," + offlineTile.img;
                }
                else
                {
                    img.style.borderColor = "green";
                    console.log("tile is not in the offline store", url);
                    imgURL = "data:image/png;base64,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pmk0TROPj48Hn3l4eIimaSJN06O3A4NJwDMxm82ibdtXo4D5fB6r1Sp+//4dz8/Pw5H+6ekpdrtdJEkS8/n8S/9f713ie3vaceo9x557QAB451Sgfyin34HKshweunk5HzAej2MymXz5+f9nbjJyI9L39Wu5XP55+XQZ39uxR4Z3u90wSXjqEV0wAjhjx47oaZq63Me/ZhIQBAAQAEAAAAEABAAQAEAAAAEABAAQAEAAAAEABAAQAEAAAAEABAAQAEAAAAEABAAQAEAAAAEABAAQAEAAAAEABAAQAEAAAAEABAAQAEAAAAEAAbAJQAAAAQAEABAAQAAAAQAEABAAQAAAAQAEABAAQAAAAQAEABAAQAAAAQAEABAAQAAAAQAEABAAQAAAAQAEABAAQAAAAQAEABAAQAAAAQAEABAAEABAAAABAAQAEABAAAABAAQAEABAAAABAAQAEABAAAABAAQAEABAAAABAAQAEABAAAABAAQAEABAAAABAAQAEABAAAABAAQAEABAAAABAAQAEAAQAEAAAAEABAAQAEAAAAEABAAQAEAAAAEABAAQAEAAAAEAvqe/BwCeKjUweoA8pQAAAABJRU5ErkJggg==";
                }
                // when we return a nonexistent url to the image, the TiledMapServiceLayer::_tileErrorHandler() method
                // sets img visibility to 'hidden', so we need to show the image back once we have put the data:image
                img.style.visibility = "visible";
                img.src = imgURL;
                return "";  /* this result goes nowhere, seriously */
            }.bind(this));

            return tileid;
        },

            /**
             * Returns an object that contains the number of tiles that would need to be downloaded
             * for the specified extent and zoom level, and the estimated byte size of such tiles.
             * This method is useful to give the user an indication of the required time and space
             * before launching the actual download operation. The byte size estimation is very rough.
             * @param extent
             * @param level
             * @param tileSize
             * @returns {{level: *, tileCount: Number, sizeBytes: number}}
             */
            getLevelEstimation: function(extent, level, tileSize)
            {
                var tilingScheme = new TilingScheme(this);
                var cellIds = tilingScheme.getAllCellIdsInExtent(extent,level);

                var levelEstimation = {
                    level: level,
                    tileCount: cellIds.length,
                    sizeBytes: cellIds.length * tileSize
                };

                return levelEstimation;
            },

            /**
             * Retrieves tiles and stores them in the local cache.
             * @param minLevel
             * @param maxLevel
             * @param extent
             * @param reportProgress
             */
            prepareForOffline : function(minLevel, maxLevel, extent, reportProgress)
            {
                /* create list of tiles to store */
                var tilingScheme = new TilingScheme(this);
                var cells = [];
                var level;

                for(level=minLevel; level<=maxLevel; level++)
                {
                    var level_cell_ids = tilingScheme.getAllCellIdsInExtent(extent,level);

                    level_cell_ids.forEach(function(cell_id)
                    {
                        cells.push({ level: level, row: cell_id[1], col: cell_id[0]});
                    });

                    // if the number of requested tiles is excessive, we just stop
                    if( cells.length > 5000 && level !== maxLevel)
                    {
                        console.log("enough is enough!");
                        break;
                    }
                }

                /* launch tile download */
                this._doNextTile(0, cells, reportProgress);
            },

            /**
             * This method puts the layer in offline mode. When in offline mode,
             * the layer will not fetch any tile from the remote server. It
             * will look up the tiles in the indexed db database and display them in the 
             * If the tile can't be found in the local database it will show up blank
             * (even if there is actual connectivity). The pair of methods goOffline() and
             * goOnline()allows the developer to manually control the behaviour of the 
             * Used in conjunction with the offline dectection library, you can put the layer in
             * the appropriate mode when the offline condition changes.
             */
            goOffline : function()
            {
                this.offline.online = false;
            },

            /**
             * This method puts the layer in online mode. When in online mode, the layer will
             * behave as regular layers, fetching all tiles from the remote server.
             * If there is no internet connectivity the tiles may appear thanks to the browsers cache,
             * but no attempt will be made to look up tiles in the local database.
             */
            goOnline : function()
            {
                this.offline.online = true;
                this.refresh();
            },

            /**
             * Determines if application is online or offline
             * @returns {boolean}
             */
            isOnline : function()
            {
                return this.offline.online;
            },

            /**
             * Clears the local cache of tiles.
             * @param callback callback(boolean, errors)
             */
            deleteAllTiles : function(callback) // callback(success) or callback(false, error)
            {
                var store = this.offline.store;
                store.deleteAll(callback);
            },

            /**
             * Gets the size in bytes of the local tile cache.
             * @param callback  callback(size, error)
             */
            getOfflineUsage : function(callback) // callback({size: <>, tileCount: <>}) or callback(null,error)
            {
                var store = this.offline.store;
                store.usedSpace(callback);
            },

            /**
             * Gets polygons representing all cached cell ids within a particular
             * zoom level and bounded by an extent.
             * @param callback callback(polygon, error)
             */
            getTilePolygons : function(callback)	// callback(Polygon polygon) or callback(null, error)
            {
                var store = this.offline.store;
                var tilingScheme = new TilingScheme(this);
                store.getAllTiles(function(url,img,err)
                {
                    if(url)
                    {
                        var components = url.split("/");
                        var level = parseInt(components[ components.length - 3],10);
                        var col = parseInt(components[ components.length - 2],10);
                        var row = parseInt(components[ components.length - 1],10);
                        var cellId = [row,col];
                        var polygon = tilingScheme.getCellPolygonFromCellId(cellId, level);
                        //if( level == 15)
                        callback(polygon);
                    }
                    else
                    {
                        callback(null,err);
                    }
                });
            },

            /**
             * Saves tile cache into a portable csv format.
             * @param fileName
             * @param callback callback( boolean, error)
             */
            saveToFile : function(fileName, callback) // callback(success, msg)
            {
                var store = this.offline.store;
                var csv = [];

                csv.push("url,img");
                store.getAllTiles(function(url,img,evt)
                {
                    if(evt==="end")
                    {
                        var blob = new Blob([ csv.join("\r\n") ], {type:"text/plain;charset=utf-8"});
                        var saver = FileSaver.saveAs(blob, fileName);

                        if( saver.readyState === saver.DONE )
                        {
                            if( saver.error )
                            {
                                return callback(false,"Error saving file " + fileName);
                            }
                            return callback(true, "Saved " + (csv.length-1) + " tiles (" + Math.floor(blob.size / 1024 / 1024 * 100) / 100 + " Mb) into " + fileName);
                        }
                        saver.onerror = function() {
                            callback(false,"Error saving file " + fileName);
                        };
                        saver.onwriteend = function()
                        {
                            callback(true, "Saved " + (csv.length-1) + " tiles (" + Math.floor(blob.size / 1024 / 1024 * 100) / 100 + " Mb) into " + fileName);
                        };
                    }
                    else
                    {
                        csv.push(url+","+img);
                    }
                });
            },

            /**
             * Reads a csv file into local tile cache.
             * @param file
             * @param callback callback( boolean, error)
             */
            loadFromFile : function(file, callback) // callback(success,msg)
            {
                console.log("reading",file);

                var store = this.offline.store;
                var i;

                if (window.File && window.FileReader && window.FileList && window.Blob)
                {
                    // Great success! All the File APIs are supported.
                    var reader = new FileReader();
                    reader.onload = function(evt)
                    {
                        var csvContent = evt.target.result;
                        var tiles = csvContent.split("\r\n");
                        var tileCount = 0;
                        var pair, tile;

                        if(tiles[0] !== "url,img")
                        {
                            return callback(false, "File " + file.name + " doesn't contain tiles that can be loaded");
                        }

                        for(i=1; i<tiles.length; i++)
                        {
                            pair = tiles[i].split(",");
                            tile = {
                                url: pair[0],
                                img: pair[1]
                            };
                            console.log("read",tile.url);
                            store.store(tile,function(success)
                            {
                                console.log(".");

                                if( success )
                                {
                                    tileCount += 1;
                                }

                                if( tileCount === tiles.length-1)
                                {
                                    console.log("finished!");
                                    window.setTimeout(function() { /* refresh layer by zooming in and out, or some way that really refreshes the layer */ }, 1000);
                                    callback(true, tileCount + " tiles loaded from " + file.name);
                                }
                            });
                        }
                    };
                    reader.readAsText(file);
                }
                else
                {
                    callback(false, "The File APIs are not fully supported in this browser.");
                }
            },

            /* internal methods */

            /**
             * Makes a request to a tile url and uses that as a basis for the
             * the average tile size.
             * Future Iterations could call multiple tiles and do an actual average.
             * @param callback
             * @returns {Number} Returns NaN if there was a problem retrieving the tile
             */
            estimateTileSize : function(callback)
            {
                if(_lastTileUrl)
                {
                    var url = this.offline.proxyPath? this.offline.proxyPath + "?" +  _lastTileUrl : _lastTileUrl;
                    request.get(url,{
                        handleAs: "text/plain; charset=x-user-defined",
                        headers: {
                            "X-Requested-With": "" //bypasses a dojo xhr bug
                        },
                        timeout: 2000
                    }).then(function(response){
                            var img = Base64Utils.wordToBase64(Base64Utils.stringToWord(response));
                            callback(img.length + url.length,null);
                        },
                        function(err){
                            callback(null,err);
                        });
                }
                else{
                    callback(NaN);
                }
            },

            /**
             * Helper method that returns a new extent buffered by a given measurement that's based on map units.
             * E.g. If you are using mercator then buffer would be in meters
             * @param buffer
             * @returns {Extent}
             */
            getExtentBuffer : function(/* int */ buffer, /* Extent */ extent){
                extent.xmin -= buffer; extent.ymin -= buffer;
                extent.xmax += buffer; extent.ymax += buffer;
                return extent;
            },

            /**
             * Helper method that returns an array of tile urls within a given extent and level
             * @returns Array
             */
            getTileUrlsByExtent : function(extent,level){
                var tilingScheme = new TilingScheme(layer);
                var level_cell_ids = tilingScheme.getAllCellIdsInExtent(extent,level);
                var cells = [];

                level_cell_ids.forEach(function(cell_id)
                {
                    cells.push(url + "/" + level + "/" + cell_id[1] + "/" + cell_id[0]);
                }.bind(this));

                return cells;
            },

            _doNextTile : function(i, cells, reportProgress)
            {
                var cell = cells[i];

                this._storeTile(cell.level,cell.row,cell.col, function(success, error)
                {
                    if(!success)
                    {
                        console.log("error storing tile", cell, error);
                        error = { cell:cell, msg:error};
                    }

                    var cancelRequested = reportProgress({countNow:i, countMax:cells.length, cell: cell, error: error, finishedDownloading:false});

                    if( cancelRequested || i === cells.length-1 )
                    {
                        reportProgress({ finishedDownloading: true, cancelRequested: cancelRequested});
                    }
                    else
                    {
                        this._doNextTile(i+1, cells, reportProgress);
                    }

                }.bind(this));
            },

            _storeTile : function(level,row,col,callback) // callback(success, msg)
            {
                var store = this.offline.store;
                var url = this._getTileUrl(level,row,col);
                url = url.split("?")[0];

                /* download the tile */
                var imgurl = this.offline.proxyPath? this.offline.proxyPath + "?" + url : url;
                var req = new XMLHttpRequest();
                req.open("GET", imgurl, true);
                req.overrideMimeType("text/plain; charset=x-user-defined"); // https://developer.mozilla.org/en-US/docs/Web/API/XMLHttpRequest/Using_XMLHttpRequest?redirectlocale=en-US&redirectslug=DOM%2FXMLHttpRequest%2FUsing_XMLHttpRequest#Handling_binary_data

                req.onload = function()
                {
                    if( req.status === 200 && req.responseText !== "")
                    {
                        var img = Base64Utils.wordToBase64(Base64Utils.stringToWord(this.responseText));

                        var tile = {
                            url: url,
                            img: img
                        };

                        store.store(tile,callback);
                    }
                    else
                    {
                        console.log("xhr failed for", imgurl);
                        callback(false, req.status + " " + req.statusText + ": " + req.response + " when downloading " + imgurl);
                    }
                };
                req.onerror = function(e)
                {
                    console.log("xhr failed for", imgurl);
                    callback(false, e);
                };
                req.send(null);
            },

            parseGetTileInfo: function(data,callback){

                var fixedResponse = data.replace(/\\'/g, "'");
                var resultObj = JSON.parse(fixedResponse);
                var spatialRef = new SpatialReference({wkid:resultObj.spatialReference.wkid});

                var lods = [];

                var lodsObj = JSON.parse(data,function(key,value){
                    if(((typeof key == 'number') || (key % 1 == 0)) &&  (typeof value === "object")){
                        var l = new LOD();
                        l.level = value.level;
                        l.resolution = value.resolution;
                        l.scale = value.scale;

                        if(value.hasOwnProperty("level")) lods.push(l);
                        return value;
                    }
                    else{
                        return value;
                    }
                });

                var initialExtent = new Extent(
                    parseFloat(resultObj.initialExtent.xmin),
                    parseFloat(resultObj.initialExtent.ymin),
                    parseFloat(resultObj.initialExtent.xmax),
                    parseFloat(resultObj.initialExtent.ymax),
                    spatialRef
                );

                var fullExtent = new Extent(
                    parseFloat(resultObj.fullExtent.xmin),
                    parseFloat(resultObj.fullExtent.ymin),
                    parseFloat(resultObj.fullExtent.xmax),
                    parseFloat(resultObj.fullExtent.ymax),
                    spatialRef
                );

                var tileInfo = new TileInfo(resultObj.tileInfo);
                var origin = new Point(tileInfo.origin.x,tileInfo.origin.y,spatialRef)
                tileInfo.origin = origin;
                tileInfo.lods = lods;

                callback({initExtent:initialExtent,fullExtent:fullExtent,tileInfo:tileInfo,resultObj:resultObj});
            },

            /**
             * Attempts an http request to verify if app is online or offline.
             * Use this in conjunction with the offline checker library: offline.min.js
             * @param callback
             */
            _getTileInfoPrivate: function(url, callback){
                var req = new XMLHttpRequest();
                var urlTag = "?" + url + "?f=pjson";
                var url = this.offline.proxyPath? this.offline.proxyPath + urlTag : urlTag;
                req.open("GET", url, true);
                req.onload = function()
                {
                    if( req.status === 200 && req.responseText !== "")
                    {
                        callback(this.response);
                    }
                    else
                    {
                        console.log("_getTileInfoPrivate failed");
                        callback(false);
                    }
                };
                req.onerror = function(e)
                {
                    console.log("_getTileInfoPrivate failed: " + e);
                    callback(false);
                };
                req.send(null);
            }
//        }
    }); // declare
}); // define