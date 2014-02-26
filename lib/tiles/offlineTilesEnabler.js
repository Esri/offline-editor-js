"use strict"

define([
    "dojo/query",
    "dojo/request",
    "esri/geometry",
    "tiles/base64utils",
    "tiles/dbStore",
    "tiles/tilingScheme",
    "tiles/FileSaver"
    ], function(query, request, geometry,Base64Utils,DbStore,TilingScheme,FileSaver)
    {
        return {
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

            /**
             * Method that extends a layer object with the offline capability.
             * After extending one layer, you can call layer.goOffline() or layer.goOnline()
             * @param layer
             * @param callback
             * @returns {callback} callback(boolean, string)
             */
            extend: function(layer,callback)
            {
                console.log("extending layer", layer.url);

                layer._lastTileUrl = "";                

                /* we add some methods to the layer object */
                /* we don't want to extend the tiled layer class, as it is a capability that we want to add only to one instance */
                /* we also add some additional attributes inside an "offline" object */

                layer._getTileUrl = layer.getTileUrl;
                layer.offline = {
                    online: true,
                    store: new DbStore(),
                    proxyPath: "../lib/resource-proxy/proxy.php"
                };

                if( /*false &&*/ layer.offline.store.isSupported() )
                    layer.offline.store.init(callback);
                else
                    return callback(false, "indexedDB not supported");

                layer.resampling = false;

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
                layer.getTileUrl = function(level,row,col)
                {
                    console.assert(!isNaN(level) && !isNaN(row) && !isNaN(col), "bad tile requested");

                    console.log("looking for tile",level,row,col);
                    var url = this._getTileUrl(level,row,col);

                    if( this.offline.online )
                    {
                        console.log("fetching url online: ", url);
                        layer._lastTileUrl = url;
                        return url;
                    }

                    url = url.split('?')[0];

                    /* temporary URL returned immediately, as we haven't retrieved the image from the indexeddb yet */
                    var tileid = "void:/"+level+"/"+row+"/"+col;

                    this.offline.store.get(url, function(success, offlineTile)
                    {
                        /* when the .get() callback is called we replace the temporary URL originally returned by the data:image url */
                        var img = query("img[src="+tileid+"]")[0];

                        if( success )
                        {
                            console.log("found tile offline", url);
                            var imgURL = "data:image;base64," + offlineTile.img;

                            // search for the img with src="void:"+level+"-"+row+"-"+col and replace with actual url
                            img.style.borderColor = "blue";
                            // when we return a nonexistent url to the image, the TiledMapServiceLayer::_tileErrorHandler() method
                            // sets img visibility to 'hidden', so we need to show the image back once we have put the data:image
                            img.style.visibility = "visible";
                            img.src = imgURL;
                        }
                        else
                        {
                            img.style.borderColor = "green";
                            console.log("tile is not in the offline store", url);
                        }
                        return "";  /* this result goes nowhere, seriously */
                    });

                    return tileid;
                };

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
                layer.getLevelEstimation = function(extent, level, tileSize)
                {
                    var tilingScheme = new TilingScheme(this,geometry);
                    var cellIds = tilingScheme.getAllCellIdsInExtent(extent,level);

                    var levelEstimation = {
                        level: level,
                        tileCount: cellIds.length,
                        sizeBytes: cellIds.length * tileSize
                    }

                    return levelEstimation;
                };

                /**
                 * Retrieves tiles and stores them in the local cache.
                 * @param minLevel
                 * @param maxLevel
                 * @param extent
                 * @param reportProgress
                 */
                layer.prepareForOffline = function(minLevel, maxLevel, extent, reportProgress)
                {
                    /* create list of tiles to store */
                    var tilingScheme = new TilingScheme(this,geometry);
                    var cells = [];

                    for(var level=minLevel; level<=maxLevel; level++)
                    {
                        var level_cell_ids = tilingScheme.getAllCellIdsInExtent(extent,level);

                        level_cell_ids.forEach(function(cell_id)
                        {
                            cells.push({ level: level, row: cell_id[1], col: cell_id[0]});
                        });

                        // if the number of requested tiles is excessive, we just stop
                        if( cells.length > 5000 && level != maxLevel)
                        {
                            console.log("enough is enough!");
                            break;
                        }
                    }

                    /* launch tile download */
                    this._doNextTile(0, cells, reportProgress);
                };

                /**
                 * This method puts the layer in offline mode. When in offline mode,
                 * the layer will not fetch any tile from the remote server. It
                 * will look up the tiles in the indexed db database and display them in the layer.
                 * If the tile can't be found in the local database it will show up blank
                 * (even if there is actual connectivity). The pair of methods goOffline() and
                 * goOnline()allows the developer to manually control the behaviour of the layer.
                 * Used in conjunction with the offline dectection library, you can put the layer in
                 * the appropriate mode when the offline condition changes.
                 */
                layer.goOffline = function()
                {
                    this.offline.online = false;
                };

                /**
                 * This method puts the layer in online mode. When in online mode, the layer will
                 * behave as regular layers, fetching all tiles from the remote server.
                 * If there is no internet connectivity the tiles may appear thanks to the browsers cache,
                 * but no attempt will be made to look up tiles in the local database.
                 */
                layer.goOnline = function()
                {
                    this.offline.online = true;
                    this.refresh();
                };

                /**
                 * Determines if application is online or offline
                 * @returns {boolean}
                 */
                layer.isOnline = function()
                {
                    return this.offline.online;
                };

                /**
                 * Clears the local cache of tiles.
                 * @param callback callback(boolean, errors)
                 */
                layer.deleteAllTiles = function(callback) // callback(success) or callback(false, error)
                {
                    var store = this.offline.store;
                    store.deleteAll(callback);
                }

                /**
                 * Gets the size in bytes of the local tile cache.
                 * @param callback  callback(size, error)
                 */
                layer.getOfflineUsage = function(callback) // callback({size: <>, tileCount: <>}) or callback(null,error)
                {
                    var store = this.offline.store;
                    store.size(callback);
                };

                /**
                 * Gets polygons representing all cached cell ids within a particular
                 * zoom level and bounded by an extent.
                 * @param callback callback(polygon, error)
                 */
                layer.getTilePolygons = function(callback)	// callback(Polygon polygon) or callback(null, error)
                {
                    var store = this.offline.store;
                    var tilingScheme = new TilingScheme(this,geometry);
                    store.getAllTiles(function(url,img,err)
                    {
                        if(url)
                        {
                            var components = url.split("/");
                            var level = parseInt(components[ components.length - 3]);
                            var col = parseInt(components[ components.length - 2]);
                            var row = parseInt(components[ components.length - 1]);
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
                }

                /**
                 * Saves tile cache into a portable csv format.
                 * @param fileName
                 * @param callback callback( boolean, error)
                 */
                layer.saveToFile = function(fileName, callback) // callback(success, msg)
                {
                    var store = this.offline.store;
                    var csv = [];

                    csv.push("url,img");
                    store.getAllTiles(function(url,img,evt)
                    {
                        if(evt=="end")
                        {
                            var blob = new Blob([ csv.join("\r\n") ], {type:"text/plain;charset=utf-8"});
                            var saver = FileSaver.saveAs(blob, fileName);

                            if( saver.readyState == saver.DONE )
                            {
                                if( saver.error )
                                    return callback(false,"Error saving file " + fileName);
                                else
                                    return callback(true, "Saved " + (csv.length-1) + " tiles (" + Math.floor(blob.size / 1024 / 1024 * 100) / 100 + " Mb) into " + fileName);
                            }
                            else
                            {
                                saver.onerror = function(evt) {
                                    callback(false,"Error saving file " + fileName);
                                }
                                saver.onwriteend = function(evt)
                                {
                                    callback(true, "Saved " + (csv.length-1) + " tiles (" + Math.floor(blob.size / 1024 / 1024 * 100) / 100 + " Mb) into " + fileName);
                                }
                            }
                        }
                        else
                        {
                            csv.push(url+","+img);
                        }
                    })
                }

                /**
                 * Reads a csv file into local tile cache.
                 * @param file
                 * @param callback callback( boolean, error)
                 */
                layer.loadFromFile = function(file, callback) // callback(success,msg)
                {
                    console.log("reading",file);

                    var store = this.offline.store;
                    var layer = this;

                    if (window.File && window.FileReader && window.FileList && window.Blob)
                    {
                        // Great success! All the File APIs are supported.
                        var reader = new FileReader();
                        reader.onload = function(evt)
                        {
                            var csvContent = evt.target.result;
                            var tiles = csvContent.split("\r\n");
                            var tileCount = 0;

                            if(tiles[0] != "url,img")
                                return callback(false, "File " + file.name + " doesn't contain tiles that can be loaded");

                            for(var i=1; i<tiles.length; i++)
                            {
                                var pair = tiles[i].split(',');
                                var tile = {
                                    url: pair[0],
                                    img: pair[1]
                                }
                                console.log("read",tile.url);
                                store.add(tile,function(success)
                                {
                                    console.log(".");

                                    if( success )
                                        tileCount += 1;

                                    if( tileCount == tiles.length-1)
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
                        callback(false, 'The File APIs are not fully supported in this browser.');
                    }
                }

                /* internal methods */

                /**
                 * Makes a request to a tile url and uses that as a basis for the
                 * the average tile size.
                 * Future Iterations could call multiple tiles and do an actual average.
                 * @param callback
                 * @returns {Number} Returns NaN if there was a problem retrieving the tile
                 */
                layer.estimateTileSize = function(callback)
                {
                    if(layer._lastTileUrl){
                        var url = this.offline.proxyPath? this.offline.proxyPath + "?" +  layer._lastTileUrl : layer._lastTileUrl;
                        request.get(url,{
                            handleAs: "text/plain; charset=x-user-defined",
                            headers: {
                                "X-Requested-With": "" //bypasses a dojo xhr bug
                            },
                            timeout: 2000
                        }).then(function(response){
                                var img = Base64Utils.wordToBase64(Base64Utils.stringToWord(response));
                                callback(img.length + url.length);
                            });
                    }
                    else{
                        callback(NaN);
                    }
                };

                layer._doNextTile = function(i, cells, reportProgress)
                {
                    var cell = cells[i];
                    var error;

                    this._storeTile(cell.level,cell.row,cell.col, function(success, error)
                    {
                        if(!success)
                        {
                            console.log("error storing tile", cell, error);
                            error = { cell:cell, msg:error};
                        }

                        var cancelRequested = reportProgress({countNow:i, countMax:cells.length, error: error, finishedDownloading:false});

                        if( cancelRequested || i==cells.length-1 )
                            reportProgress({ finishedDownloading: true, cancelRequested: cancelRequested})
                        else
                            this._doNextTile(i+1, cells, reportProgress);

                    }.bind(this))
                }

                layer._storeTile = function(level,row,col,callback) // callback(success, msg)
                {
                    var store = this.offline.store;
                    var url = this._getTileUrl(level,row,col);
                    url = url.split('?')[0];

                    /* download the tile */
                    var imgurl = this.offline.proxyPath? this.offline.proxyPath + "?" + url : url; 
                    var req = new XMLHttpRequest();
                    req.open("GET", imgurl, true);
                    req.overrideMimeType("text/plain; charset=x-user-defined"); // https://developer.mozilla.org/en-US/docs/Web/API/XMLHttpRequest/Using_XMLHttpRequest?redirectlocale=en-US&redirectslug=DOM%2FXMLHttpRequest%2FUsing_XMLHttpRequest#Handling_binary_data

                    req.onload = function()
                    {
                        if( req.status == 200 && req.responseText != "")
                        {
                            var img = Base64Utils.wordToBase64(Base64Utils.stringToWord(this.responseText));

                            var tile = {
                                url: url,
                                img: img
                            }

                            store.add(tile,callback);
                        }
                        else
                        {
                            console.log("xhr failed for", imgurl);
                            callback(false, req.status + " " + req.statusText + ": " + req.response + " when downloading " + imgurl);
                        }
                    }
                    req.onerror = function(e)
                    {
                        console.log("xhr failed for", imgurl);
                        callback(false, e);
                    }
                    req.send(null);
                };
            }
        }
    });

