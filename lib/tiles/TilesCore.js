/**
 * This library contains common core code between offlineTilesEnabler.js
 * and OfflineTilesEnablerLayer.js
 */
define([
    "dojo/query",
    "dojo/request",
    "esri/geometry/Point",
    "esri/geometry/Extent",
    "esri/SpatialReference",
    "esri/layers/TileInfo",
    "esri/layers/LOD",
    "tiles/base64utils",
    "tiles/tilingScheme"
    ],
    function(query,request,Point,Extent,SpatialReference,TileInfo,LOD,Base64Utils,TilingScheme){
        "use strict";
        var TilesCore = function(){

            this._storeTile= function(url,proxyPath,store,callback) // callback(success, msg)
            {
                url = url.split("?")[0];

                /* download the tile */
                var imgurl = proxyPath ? proxyPath + "?" + url : url;
                var req = new XMLHttpRequest();
                req.open("GET", imgurl, true);
                req.overrideMimeType("text/plain; charset=x-user-defined"); // https://developer.mozilla.org/en-US/docs/Web/API/XMLHttpRequest/Using_XMLHttpRequest?redirectlocale=en-US&redirectslug=DOM%2FXMLHttpRequest%2FUsing_XMLHttpRequest#Handling_binary_data

                req.onload = function () {
                    if (req.status === 200 && req.responseText !== "") {
                        var img = Base64Utils.wordToBase64(Base64Utils.stringToWord(this.responseText));

                        var tile = {
                            url: url,
                            img: img
                        };

                        store.store(tile, callback);
                    }
                    else {
                        console.log("xhr failed for", imgurl);
                        callback(false, req.status + " " + req.statusText + ": " + req.response + " when downloading " + imgurl);
                    }
                };
                req.onerror = function (e) {
                    console.log("xhr failed for", imgurl);
                    callback(false, e);
                };
                req.send(null);
            };

            /**
             * Makes a request to a tile url and uses that as a basis for the
             * the average tile size.
             * Future Iterations could call multiple tiles and do an actual average.
             * @param callback
             * @returns {Number} Returns NaN if there was a problem retrieving the tile
             */
            this._estimateTileSize = function(lastTileUrl,proxyPath,callback)
            {
                if(lastTileUrl)
                {
                    var url = proxyPath? proxyPath + "?" +  lastTileUrl : lastTileUrl;
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
            };

            /**
             * Loads a csv file into storage.
             * Format is "url,img\r\n somebase64image,http://esri.com"
             * @param file
             * @param store
             * @param callback
             * @private
             */
            this._loadFromFile = function(file,store,callback){
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

                        for(var i=1; i<tiles.length; i++)
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
            };

            /**
             * Gets polygons representing all cached cell ids within a particular
             * zoom level and bounded by an extent.
             * @param store local IndexedDB
             * @param layerUrl the URL of tile layer
             * @param context a reference to the layer
             * @param callback callback(polygon, error)
             */
            this._getTilePolygons = function(store,layerUrl,context,callback)	// callback(Polygon polygon) or callback(null, error)
            {
                var components, level, col, row, cellId, polygon;

                var tilingScheme = new TilingScheme(context);
                store.getAllTiles(function(url,img,err)
                {
                    if(url && url.indexOf(layerUrl) == 0)
                    {
                        if(url.indexOf("_alllayers") != -1)
                        {
                            // V101/LAYERS/_alllayers/L01/R0C18C0B10
                            components = url.split("/");
                            level = parseInt(components[ components.length - 2].slice(1),10);
                            col = parseInt( components[ components.length -1].substring(1,5), 16);
                            row = parseInt( components[ components.length -1].substring(6,10), 16);
                        }
                        else
                        {
                            components = url.split("/");
                            level = parseInt(components[ components.length - 3],10);
                            col = parseInt(components[ components.length - 2],10);
                            row = parseInt(components[ components.length - 1],10);
                        }
                        cellId = [row,col];
                        polygon = tilingScheme.getCellPolygonFromCellId(cellId, level);
                        callback(polygon);
                    }
                    else
                    {
                        if(!url)
                        {
                            callback(null,err);
                        }
                    }
                });
            };

            this._parseGetTileInfo = function(data,callback){

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
            }
        };

        return TilesCore;
    }
)
