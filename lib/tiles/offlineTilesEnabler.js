define([
    "dojo/query",
    "dojo/request",
    "esri/geometry/Polygon",
    "dojo/_base/declare"
    ], function(query, request, Polygon,declare)
    {
    "use strict";
    return declare("O.esri.Tiles.OfflineTilesEnabler",[],{
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
             * @param state Optional Recommended. Pre-sets whether or not the application is online or offline.
             * Specifically used for applications that need to protect against browser reload/restart while offline.
             * @returns {callback} callback(boolean, string)
             */
            extend: function(layer,callback,/* boolean */ state)
            {
                console.log("extending layer", layer.url);

                layer._tilesCore = new O.esri.Tiles.TilesCore();
                layer._lastTileUrl = "";
                layer._imageType = "";
                layer._minZoom = null;
                layer._maxZoom = null;

                /* we add some methods to the layer object */
                /* we don't want to extend the tiled layer class, as it is a capability that we want to add only to one instance */
                /* we also add some additional attributes inside an "offline" object */

                layer._getTileUrl = layer.getTileUrl;

                var isOnline = true;
                if(typeof state != "undefined"){
                    isOnline = state; console.log("STATE IS: " + state)
                }

                /**
                 * IMPORTANT! proxyPath is set to null by default since we assume Feature Service is CORS-enabled.
                 * All AGOL Feature Services are CORS-enabled.
                 *
                 * @type {{online: boolean, store: O.esri.Tiles.TilesStore, proxyPath: null}}
                 */
                layer.offline = {
                    online: isOnline,
                    store: new O.esri.Tiles.TilesStore(),
                    proxyPath: null
                };

                if( /*false &&*/ layer.offline.store.isSupported() )
                {
                    // Important: wait to load tiles until after database has initialized!
                    layer.offline.store.init(function(success){
                        if(success){
//                            callback(true);
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
                                console.log("LIBRARY ONLINE " + this.offline.online)
                                if( this.offline.online )
                                {
                                    if(layer._imageType == "")layer._imageType = this.tileInfo.format.toLowerCase();
                                    console.log("fetching url online: ", url);
                                    layer._lastTileUrl = url;
                                    return url;
                                }

                                url = url.split("?")[0];

                                /* temporary URL returned immediately, as we haven't retrieved the image from the indexeddb yet */
                                var tileid = "void:/"+level+"/"+row+"/"+col;

                                var img = null;

                                layer._tilesCore._getTiles(img,this._imageType,url,tileid,this.offline.store,query);

                                return tileid;
                            };

                            callback && callback(true);
                        }
                    }.bind(this));
                }
                else
                {
                    return callback(false, "indexedDB not supported");                    
                }

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
                    var tilingScheme = new O.esri.Tiles.TilingScheme(this);
                    var cellIds = tilingScheme.getAllCellIdsInExtent(extent,level);

                    var levelEstimation = {
                        level: level,
                        tileCount: cellIds.length,
                        sizeBytes: cellIds.length * tileSize
                    };

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
                    layer._tilesCore._createCellsForOffline(this,minLevel,maxLevel,extent,function(cells){
                        /* launch tile download */
                        this._doNextTile(0, cells, reportProgress);
                    }.bind(this));
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
                };

                /**
                 * Gets the size in bytes of the local tile cache.
                 * @param callback  callback(size, error)
                 */
                layer.getOfflineUsage = function(callback) // callback({size: <>, tileCount: <>}) or callback(null,error)
                {
                    var store = this.offline.store;
                    store.usedSpace(callback);
                };

                /**
                 * Gets polygons representing all cached cell ids within a particular
                 * zoom level and bounded by an extent.
                 * @param callback callback(polygon, error)
                 */
                layer.getTilePolygons = function(callback)	// callback(Polygon polygon) or callback(null, error)
                {
                    layer._tilesCore._getTilePolygons(this.offline.store,layer.url,this,callback);
                };

                /**
                 * Saves tile cache into a portable csv format.
                 * @param fileName
                 * @param callback callback( boolean, error)
                 */
                layer.saveToFile = function(fileName, callback) // callback(success, msg)
                {
                    layer._tilesCore._saveToFile(fileName,this.offline.store,callback);
                };

                /**
                 * Reads a csv file into local tile cache.
                 * @param file
                 * @param callback callback( boolean, error)
                 */
                layer.loadFromFile = function(file, callback) // callback(success,msg)
                {
                    console.log("reading",file);
                    layer._tilesCore._loadFromFile(file,this.offline.store,callback);
                };

                /**
                 * Returns the maximum zoom level for this layer
                 * @param callback number
                 */
                layer.getMaxZoom = function(callback){
                    // TO-DO make this a simple return rather than a callback
                    if(this._maxZoom == null){
                        this._maxZoom = layer.tileInfo.lods[layer.tileInfo.lods.length-1].level;
                    }
                    callback(this._maxZoom);
                },

                /**
                 * Returns the minimum zoom level for this layer
                 * @param callback number
                 */
                layer.getMinZoom = function(callback){
                    // TO-DO make this a simple return rather than a callback
                    if(this._minZoom == null){
                        this._minZoom = layer.tileInfo.lods[0].level;
                    }
                    callback(this._minZoom);
                };

                /**
                 * Utility method for bracketing above and below your current Level of Detail. Use
                 * this in conjunction with setting the minLevel and maxLevel in prepareForOffline().
                 * @param minZoomAdjust An Integer specifying how far above the current layer you want to retrieve tiles
                 * @param maxZoomAdjust An Integer specifying how far below (closer to earth) the current layer you want to retrieve tiles
                 */
                layer.getMinMaxLOD = function(minZoomAdjust,maxZoomAdjust){
                    var zoom = {};
                    var map = layer.getMap();
                    var min = map.getLevel() + minZoomAdjust;
                    var max = map.getLevel() + maxZoomAdjust;
                    if(this._maxZoom != null && this._minZoom != null){
                        zoom.max = Math.min(this._maxZoom, max);  //prevent errors by setting the tile layer floor
                        zoom.min = Math.max(this._minZoom, min);   //prevent errors by setting the tile layer ceiling
                    }
                    else{
                        layer.getMinZoom(function(result){
                            zoom.min = Math.max(result, min);   //prevent errors by setting the tile layer ceiling
                        });

                        layer.getMaxZoom(function(result){
                            zoom.max = Math.min(result, max);  //prevent errors by setting the tile layer floor
                        });
                    }

                    return zoom;

                };

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
                    layer._tilesCore._estimateTileSize(request,this._lastTileUrl,this.offline.proxyPath,callback);
                };

                /**
                 * Helper method that returns a new extent buffered by a given measurement that's based on map units.
                 * E.g. If you are using mercator then buffer would be in meters
                 * @param buffer
                 * @returns {Extent}
                 */
                layer.getExtentBuffer = function(/* int */ buffer, /* Extent */ extent){
                    extent.xmin -= buffer; extent.ymin -= buffer;
                    extent.xmax += buffer; extent.ymax += buffer;
                    return extent;
                };

                /**
                 * Helper method that returns an array of tile urls within a given extent and level
                 * @returns Array
                 */
                layer.getTileUrlsByExtent = function(extent,level){
                    var tilingScheme = new O.esri.Tiles.TilingScheme(layer);
                    var level_cell_ids = tilingScheme.getAllCellIdsInExtent(extent,level);
                    var cells = [];

                    level_cell_ids.forEach(function(cell_id)
                    {
                        cells.push(layer.url + "/" + level + "/" + cell_id[1] + "/" + cell_id[0]);
                    }.bind(this));

                    return cells;
                };

                layer._doNextTile = function(i, cells, reportProgress)
                {
                    var cell = cells[i];

                    var url = this._getTileUrl(cell.level,cell.row,cell.col);

                    layer._tilesCore._storeTile(url,this.offline.proxyPath,this.offline.store, function(success, error)
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
                };
            }
    }); // declare
}); // define

