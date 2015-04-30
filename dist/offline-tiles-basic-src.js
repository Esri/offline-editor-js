/*! offline-editor-js - v2.7.1 - 2015-04-29
*   Copyright (c) 2015 Environmental Systems Research Institute, Inc.
*   Apache License*/
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


/**
 * Creates a namespace for the non-AMD libraries in this directory
 */

if(typeof O != "undefined"){
    O.esri.Tiles = {}
}
else{
    O = {};
    O.esri = {
        Tiles: {}
    }
}

"use strict";

O.esri.Tiles.Base64Utils={};
O.esri.Tiles.Base64Utils.outputTypes={
    //	summary:
    //		Enumeration for input and output encodings.
    Base64:0, Hex:1, String:2, Raw:3
};

	//	word-based addition
O.esri.Tiles.Base64Utils.addWords=function(/* word */a, /* word */b){
    //	summary:
    //		add a pair of words together with rollover
    var l=(a&0xFFFF)+(b&0xFFFF);
    var m=(a>>16)+(b>>16)+(l>>16);
    return (m<<16)|(l&0xFFFF);	//	word
};

O.esri.Tiles.Base64Utils.stringToWord=function(/* string */s){
    //	summary:
    //		convert a string to a word array


    //	word-based conversion method, for efficiency sake;
    //	most digests operate on words, and this should be faster
    //	than the encoding version (which works on bytes).
    var chrsz=8;	//	16 for Unicode
    var mask=(1<<chrsz)-1;

    var wa=[];
    for(var i=0, l=s.length*chrsz; i<l; i+=chrsz){
        wa[i>>5]|=(s.charCodeAt(i/chrsz)&mask)<<(i%32);
    }
    return wa;	//	word[]
};

O.esri.Tiles.Base64Utils.wordToString=function(/* word[] */wa){
    //	summary:
    //		convert an array of words to a string

    //	word-based conversion method, for efficiency sake;
    //	most digests operate on words, and this should be faster
    //	than the encoding version (which works on bytes).
    var chrsz=8;	//	16 for Unicode
    var mask=(1<<chrsz)-1;

    var s=[];
    for(var i=0, l=wa.length*32; i<l; i+=chrsz){
        s.push(String.fromCharCode((wa[i>>5]>>>(i%32))&mask));
    }
    return s.join("");	//	string
};

O.esri.Tiles.Base64Utils.wordToHex=function(/* word[] */wa){
    //	summary:
    //		convert an array of words to a hex tab
    var h="0123456789abcdef", s=[];
    for(var i=0, l=wa.length*4; i<l; i++){
        s.push(h.charAt((wa[i>>2]>>((i%4)*8+4))&0xF)+h.charAt((wa[i>>2]>>((i%4)*8))&0xF));
    }
    return s.join("");	//	string
};

O.esri.Tiles.Base64Utils.wordToBase64=function(/* word[] */wa){
    //	summary:
    //		convert an array of words to base64 encoding, should be more efficient
    //		than using dojox.encoding.base64
    var p="=", tab="ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/", s=[];
    for(var i=0, l=wa.length*4; i<l; i+=3){
        var t=(((wa[i>>2]>>8*(i%4))&0xFF)<<16)|(((wa[i+1>>2]>>8*((i+1)%4))&0xFF)<<8)|((wa[i+2>>2]>>8*((i+2)%4))&0xFF);
        for(var j=0; j<4; j++){
            if(i*8+j*6>wa.length*32){
                s.push(p);
            } else {
                s.push(tab.charAt((t>>6*(3-j))&0x3F));
            }
        }
    }
    return s.join("");	//	string
};


/* FileSaver.js
 * A saveAs() FileSaver implementation.
 * 2013-10-21
 *
 * By Eli Grey, http://eligrey.com
 * License: X11/MIT
 *   See LICENSE.md
 */

/*global self */
/*jslint bitwise: true, regexp: true, confusion: true, es5: true, vars: true, white: true,
 plusplus: true */

/*! @source http://purl.eligrey.com/github/FileSaver.js/blob/master/FileSaver.js */


O.esri.Tiles.saveAs =
// IE 10 support, see Eli Grey's original source
//    || (typeof navigator !== 'undefined' && navigator.msSaveOrOpenBlob && navigator.msSaveOrOpenBlob.bind(navigator))
    function(view) {
    "use strict";
    var
        doc = view.document
    // only get URL when necessary in case BlobBuilder.js hasn't overridden it yet
        , get_URL = function() {
            return view.URL || view.webkitURL || view;
        }
        , URL = view.URL || view.webkitURL || view
        , save_link = doc.createElementNS("http://www.w3.org/1999/xhtml", "a")
        , can_use_save_link =  !view.externalHost && "download" in save_link
        , click = function(node) {
            var event = doc.createEvent("MouseEvents");
            event.initMouseEvent(
                "click", true, false, view, 0, 0, 0, 0, 0
                , false, false, false, false, 0, null
            );
            node.dispatchEvent(event);
        }
        , webkit_req_fs = view.webkitRequestFileSystem
        , req_fs = view.requestFileSystem || webkit_req_fs || view.mozRequestFileSystem
        , throw_outside = function (ex) {
            (view.setImmediate || view.setTimeout)(function() {
                throw ex;
            }, 0);
        }
        , force_saveable_type = "application/octet-stream"
        , fs_min_size = 0
        , deletion_queue = []
        , process_deletion_queue = function() {
            var i = deletion_queue.length;
            while (i--) {
                var file = deletion_queue[i];
                if (typeof file === "string") { // file is an object URL
                    URL.revokeObjectURL(file);
                } else { // file is a File
                    file.remove();
                }
            }
            deletion_queue.length = 0; // clear queue
        }
        , dispatch = function(filesaver, event_types, event) {
            event_types = [].concat(event_types);
            var i = event_types.length;
            while (i--) {
                var listener = filesaver["on" + event_types[i]];
                if (typeof listener === "function") {
                    try {
                        listener.call(filesaver, event || filesaver);
                    } catch (ex) {
                        throw_outside(ex);
                    }
                }
            }
        }
        , FileSaver = function(blob, name) {
            // First try a.download, then web filesystem, then object URLs
            var
                filesaver = this
                , type = blob.type
                , blob_changed = false
                , object_url
                , target_view
                , get_object_url = function() {
                    var object_url = get_URL().createObjectURL(blob);
                    deletion_queue.push(object_url);
                    return object_url;
                }
                , dispatch_all = function() {
                    dispatch(filesaver, "writestart progress write writeend".split(" "));
                }
            // on any filesys errors revert to saving with object URLs
                , fs_error = function() {
                    // don't create more object URLs than needed
                    if (blob_changed || !object_url) {
                        object_url = get_object_url(blob);
                    }
                    if (target_view) {
                        target_view.location.href = object_url;
                    } else {
                        window.open(object_url, "_blank");
                    }
                    filesaver.readyState = filesaver.DONE;
                    dispatch_all();
                }
                , abortable = function(func) {
                    return function() {
                        if (filesaver.readyState !== filesaver.DONE) {
                            return func.apply(this, arguments);
                        }
                    };
                }
                , create_if_not_found = {create: true, exclusive: false}
                , slice
                ;
            filesaver.readyState = filesaver.INIT;
            if (!name) {
                name = "download";
            }
            if (can_use_save_link) {
                object_url = get_object_url(blob);
                // FF for Android has a nasty garbage collection mechanism
                // that turns all objects that are not pure javascript into 'deadObject'
                // this means `doc` and `save_link` are unusable and need to be recreated
                // `view` is usable though:
                doc = view.document;
                save_link = doc.createElementNS("http://www.w3.org/1999/xhtml", "a");
                save_link.href = object_url;
                save_link.download = name;
                var event = doc.createEvent("MouseEvents");
                event.initMouseEvent(
                    "click", true, false, view, 0, 0, 0, 0, 0
                    , false, false, false, false, 0, null
                );
                save_link.dispatchEvent(event);
                filesaver.readyState = filesaver.DONE;
                dispatch_all();
                return;
            }
            // Object and web filesystem URLs have a problem saving in Google Chrome when
            // viewed in a tab, so I force save with application/octet-stream
            // http://code.google.com/p/chromium/issues/detail?id=91158
            if (view.chrome && type && type !== force_saveable_type) {
                slice = blob.slice || blob.webkitSlice;
                blob = slice.call(blob, 0, blob.size, force_saveable_type);
                blob_changed = true;
            }
            // Since I can't be sure that the guessed media type will trigger a download
            // in WebKit, I append .download to the filename.
            // https://bugs.webkit.org/show_bug.cgi?id=65440
            if (webkit_req_fs && name !== "download") {
                name += ".download";
            }
            if (type === force_saveable_type || webkit_req_fs) {
                target_view = view;
            }
            if (!req_fs) {
                fs_error();
                return;
            }
            fs_min_size += blob.size;
            req_fs(view.TEMPORARY, fs_min_size, abortable(function(fs) {
                fs.root.getDirectory("saved", create_if_not_found, abortable(function(dir) {
                    var save = function() {
                        dir.getFile(name, create_if_not_found, abortable(function(file) {
                            file.createWriter(abortable(function(writer) {
                                writer.onwriteend = function(event) {
                                    target_view.location.href = file.toURL();
                                    deletion_queue.push(file);
                                    filesaver.readyState = filesaver.DONE;
                                    dispatch(filesaver, "writeend", event);
                                };
                                writer.onerror = function() {
                                    var error = writer.error;
                                    if (error.code !== error.ABORT_ERR) {
                                        fs_error();
                                    }
                                };
                                "writestart progress write abort".split(" ").forEach(function(event) {
                                    writer["on" + event] = filesaver["on" + event];
                                });
                                writer.write(blob);
                                filesaver.abort = function() {
                                    writer.abort();
                                    filesaver.readyState = filesaver.DONE;
                                };
                                filesaver.readyState = filesaver.WRITING;
                            }), fs_error);
                        }), fs_error);
                    };
                    dir.getFile(name, {create: false}, abortable(function(file) {
                        // delete file if it already exists
                        file.remove();
                        save();
                    }), abortable(function(ex) {
                        if (ex.code === ex.NOT_FOUND_ERR) {
                            save();
                        } else {
                            fs_error();
                        }
                    }));
                }), fs_error);
            }), fs_error);
        }
        , FS_proto = FileSaver.prototype
        , saveAs = function(blob, name) {
            return new FileSaver(blob, name);
        }
        ;
    FS_proto.abort = function() {
        var filesaver = this;
        filesaver.readyState = filesaver.DONE;
        dispatch(filesaver, "abort");
    };
    FS_proto.readyState = FS_proto.INIT = 0;
    FS_proto.WRITING = 1;
    FS_proto.DONE = 2;

    FS_proto.error =
        FS_proto.onwritestart =
            FS_proto.onprogress =
                FS_proto.onwrite =
                    FS_proto.onabort =
                        FS_proto.onerror =
                            FS_proto.onwriteend =
                                null;

    view.addEventListener("unload", process_deletion_queue, false);
    return saveAs;

}(this.self || this.window || this.content);
// `self` is undefined in Firefox for Android content script context
// while `this` is nsIContentFrameMessageManager
// with an attribute `content` that corresponds to the window

//if (typeof module !== 'undefined') module.exports = saveAs;


/**
 * This library contains common core code between offlineTilesEnabler.js
 * and OfflineTilesEnablerLayer.js
 */

O.esri.Tiles.TilesCore = function(){

    /**
     * Retrieves a tile from local store.
     * @param image a holder for the image that is retrieved from storage.
     * @param imageType
     * @param url the url of the tile
     * @param tileid a reference to the tile's unique level, row and column
     * @param store
     * @private
     */
    this._getTiles = function(image,imageType,url,tileid,store,query){
        store.retrieve(url, function(success, offlineTile)
        { console.log("TILE RETURN " + success + ", " + offlineTile.url)
            /* when the .getTileUrl() callback is triggered we replace the temporary URL originally returned by the data:image url */
            // search for the img with src="void:"+level+"-"+row+"-"+col and replace with actual url
            image = query("img[src="+tileid+"]")[0];
            var imgURL;

            console.assert(image !== "undefined", "undefined image detected");

            if( success )
            {
                image.style.borderColor = "blue";
                console.log("found tile offline", url);
                imgURL = "data:image/" + imageType +";base64," + offlineTile.img;
            }
            else
            {
                image.style.borderColor = "green";
                console.log("tile is not in the offline store", url);
                imgURL = "data:image/png;base64,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pmk0TROPj48Hn3l4eIimaSJN06O3A4NJwDMxm82ibdtXo4D5fB6r1Sp+//4dz8/Pw5H+6ekpdrtdJEkS8/n8S/9f713ie3vaceo9x557QAB451Sgfyin34HKshweunk5HzAej2MymXz5+f9nbjJyI9L39Wu5XP55+XQZ39uxR4Z3u90wSXjqEV0wAjhjx47oaZq63Me/ZhIQBAAQAEAAAAEABAAQAEAAAAEABAAQAEAAAAEABAAQAEAAAAEABAAQAEAAAAEABAAQAEAAAAEABAAQAEAAAAEABAAQAEAAAAEABAAQAEAAAAEAAbAJQAAAAQAEABAAQAAAAQAEABAAQAAAAQAEABAAQAAAAQAEABAAQAAAAQAEABAAQAAAAQAEABAAQAAAAQAEABAAQAAAAQAEABAAQAAAAQAEABAAEABAAAABAAQAEABAAAABAAQAEABAAAABAAQAEABAAAABAAQAEABAAAABAAQAEABAAAABAAQAEABAAAABAAQAEABAAAABAAQAEABAAAABAAQAEAAQAEAAAAEABAAQAEAAAAEABAAQAEAAAAEABAAQAEAAAAEAvqe/BwCeKjUweoA8pQAAAABJRU5ErkJggg==";
            }
            // when we return a nonexistent url to the image, the TiledMapServiceLayer::_tileErrorHandler() method
            // sets img visibility to 'hidden', so we need to show the image back once we have put the data:image
            image.style.visibility = "visible";
            image.src = imgURL;
            return "";  /* this result goes nowhere, seriously */
        });
    };

    /**
     * Retrieves an image from a tile url and then stores it locally.
     * @param url The image's url
     * @param proxyPath
     * @param store
     * @param callback
     * @private
     */
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
                var img = O.esri.Tiles.Base64Utils.wordToBase64(O.esri.Tiles.Base64Utils.stringToWord(this.responseText));

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
     * Retrieves all the cells within a certain extent
     * @param context Layer
     * @param minLevel minimum zoom level
     * @param maxLevel maximum zoom level
     * @param extent Esri.Extent
     * @param callback
     * @private
     */
    this._createCellsForOffline = function(context,minLevel,maxLevel,extent,callback){
        var tilingScheme = new O.esri.Tiles.TilingScheme(context);
        var cells = [];

        for(var level=minLevel; level<=maxLevel; level++)
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
        callback(cells);
    }

    /**
     * Saves locally stored tiles to a csv
     * @param fileName
     * @param store
     * @param callback
     * @private
     */
    this._saveToFile = function(fileName,store,callback){
        var csv = [];

        csv.push("url,img");
        store.getAllTiles(function(url,img,evt)
        {
            if(evt==="end")
            {
                var blob = new Blob([ csv.join("\r\n") ], {type:"text/plain;charset=utf-8"});
                var saver = O.esri.Tiles.saveAs(blob, fileName);

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
    };

    /**
     * Makes a request to a tile url and uses that as a basis for the
     * the average tile size.
     * Future Iterations could call multiple tiles and do an actual average.
     * @param request "dojo/request"
     * @param lastTileUrl FQDN of a tile location
     * @param proxyPath your local proxy
     * @param callback
     * @returns {Number} Returns NaN if there was a problem retrieving the tile
     */
    this._estimateTileSize = function(request,lastTileUrl,proxyPath,callback)
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
                    var img = O.esri.Tiles.Base64Utils.wordToBase64(O.esri.Tiles.Base64Utils.stringToWord(response));
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

        var tilingScheme = new O.esri.Tiles.TilingScheme(context);
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

    /**
     * Gets all the important bits out of the map services description page
     * @param data The http response via f=pjson
     * @param callback callback({initExtent,fullExtent,tileInfo,resultObj});
     * @private
     */
    this._parseGetTileInfo = function(data,callback){

        var fixedResponse = data.replace(/\\'/g, "'");
        var resultObj = JSON.parse(fixedResponse);

        require([
            "esri/SpatialReference",
            "esri/layers/LOD",
            "esri/geometry/Extent",
            "esri/layers/TileInfo",
            "esri/geometry/Point"],function(SpatialReference,LOD,Extent,TileInfo,Point){

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
        })
    }
};




/*global indexedDB */
/**
 * Library for handling the storing of map tiles in IndexedDB.
 *
 * Author: Andy Gup (@agup)
 * Contributor: Javier Abadia (@javierabadia)
 */

O.esri.Tiles.TilesStore = function(){
    /**
     * Internal reference to the local database
     * @type {null}
     * @private
     */
    this._db = null;

    var DB_NAME = "offline_tile_store";

    /**
     * Determines if indexedDB is supported
     * @returns {boolean}
     */
    this.isSupported = function(){

        if(!window.indexedDB && !window.openDatabase){
            return false;
        }

        return true;
    };

    /**
     * Adds an object to the database
     * @param urlDataPair
     * @param callback callback(boolean, err)
     */
    this.store = function(urlDataPair,callback)
    {
        try
        {
            var transaction = this._db.transaction(["tilepath"],"readwrite");

            transaction.oncomplete = function()
            {
                callback(true);
            };

            transaction.onerror = function(event)
            {
                callback(false,event.target.error.message);
            };

            var objectStore = transaction.objectStore("tilepath");
            var request = objectStore.put(urlDataPair);
            request.onsuccess = function()
            {
                //console.log("item added to db " + event.target.result);
            };
        }
        catch(err)
        {
            console.log("TilesStore: " + err.stack);
            callback(false, err.stack);
        }
    };

    /**
     * Retrieve a record.
     * @param url
     * @param callback
     */
    this.retrieve = function(/* String */ url,callback)
    {
        if(this._db !== null)
        {
            var objectStore = this._db.transaction(["tilepath"]).objectStore("tilepath");
            var request = objectStore.get(url);
            request.onsuccess = function(event)
            {
                var result = event.target.result;
                if(result == undefined)
                {
                    callback(false,"not found");
                }
                else
                {
                    callback(true,result);
                }
            };
            request.onerror = function(err)
            {
                console.log(err);
                callback(false, err);
            };
        }
    };

    /**
     * Deletes entire database
     * @param callback callback(boolean, err)
     */
    this.deleteAll = function(callback)
    {
        if(this._db !== null)
        {
            var request = this._db.transaction(["tilepath"],"readwrite")
                .objectStore("tilepath")
                .clear();
            request.onsuccess = function()
            {
                callback(true);
            };
            request.onerror = function(err)
            {
                callback(false, err);
            };
        }
        else
        {
            callback(false,null);
        }
    };

    /**
     * Delete an individual entry
     * @param url
     * @param callback callback(boolean, err)
     */
    this.delete = function(/* String */ url,callback)
    {
        if(this._db !== null)
        {
            var request = this._db.transaction(["tilepath"],"readwrite")
                .objectStore("tilepath")
                .delete(url);
            request.onsuccess = function()
            {
                callback(true);
            };
            request.onerror = function(err)
            {
                callback(false, err);
            };
        }
        else
        {
            callback(false,null);
        }
    };

    /**
     * Retrieve all tiles from indexeddb
     * @param callback callback(url, img, err)
     */
    this.getAllTiles = function(callback)
    {
        if(this._db !== null){
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
                else
                {
                    callback(null, null, "end");
                }
            }.bind(this);
            transaction.onerror = function(err)
            {
                callback(null, null, err);
            };
        }
        else
        {
            callback(null, null, "no db");
        }
    };

    /**
     * Provides the size of database in bytes
     * @param callback callback(size, null) or callback(null, error)
     */
    this.usedSpace = function(callback){
        if(this._db !== null){
            var usage = { sizeBytes: 0, tileCount: 0 };

            var transaction = this._db.transaction(["tilepath"])
                .objectStore("tilepath")
                .openCursor();

            transaction.onsuccess = function(event){
                var cursor = event.target.result;
                if(cursor){
                    var storedObject = cursor.value;
                    var json = JSON.stringify(storedObject);
                    usage.sizeBytes += this._stringBytes(json);
                    usage.tileCount += 1;
                    cursor.continue();
                }
                else
                {
                    callback(usage,null);
                }
            }.bind(this);
            transaction.onerror = function(err)
            {
                callback(null, err);
            };
        }
        else
        {
            callback(null,null);
        }
    };

    this._stringBytes = function(str) {
        return str.length /**2*/ ;
    };

    this.init = function(callback)
    {
        var request = indexedDB.open(DB_NAME, 4);
        callback = callback || function(success) { console.log("TilesStore::init() success:", success); }.bind(this);

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

            db.createObjectStore("tilepath", { keyPath: "url" });
        }.bind(this);

        request.onsuccess = function(event)
        {
            this._db = event.target.result;
            console.log("database opened successfully");
            callback(true);
        }.bind(this);
    };
};


O.esri.Tiles.TilingScheme = function (layer) {
    this.tileInfo = layer.tileInfo;
};

O.esri.Tiles.TilingScheme.prototype = {
    getCellIdFromXy: function (x, y, level) {
        var col = Math.floor((x - this.tileInfo.origin.x) / (this.tileInfo.cols * this.tileInfo.lods[level].resolution));
        var row = Math.floor((this.tileInfo.origin.y - y) / (this.tileInfo.rows * this.tileInfo.lods[level].resolution));
        return [col, row];
    },

    getCellPolygonFromCellId: function (cellId, level) {
        var col1 = cellId[0];
        var row1 = cellId[1];
        var col2 = col1 + 1;
        var row2 = row1 + 1;

        var x1 = this.tileInfo.origin.x + (col1 * this.tileInfo.cols * this.tileInfo.lods[level].resolution);
        var y1 = this.tileInfo.origin.y - (row1 * this.tileInfo.rows * this.tileInfo.lods[level].resolution);
        var x2 = this.tileInfo.origin.x + (col2 * this.tileInfo.cols * this.tileInfo.lods[level].resolution);
        var y2 = this.tileInfo.origin.y - (row2 * this.tileInfo.rows * this.tileInfo.lods[level].resolution);

        var polygon;
        var spatialReference = this.tileInfo.spatialReference;

        require(["esri/geometry/Polygon"],function(Polygon){
            polygon = new Polygon(spatialReference);
        })

        polygon.addRing([
            [x1, y1], // clockwise
            [x2, y1],
            [x2, y2],
            [x1, y2],
            [x1, y1]
        ]);
        return polygon;
    },

    getAllCellIdsInExtent: function (extent, gridLevel) {
        var cellId0 = this.getCellIdFromXy(extent.xmin, extent.ymin, gridLevel);
        var cellId1 = this.getCellIdFromXy(extent.xmax, extent.ymax, gridLevel);

        var i, j;
        var i0 = Math.max(Math.min(cellId0[0], cellId1[0]), this.tileInfo.lods[gridLevel].startTileCol);
        var i1 = Math.min(Math.max(cellId0[0], cellId1[0]), this.tileInfo.lods[gridLevel].endTileCol);
        var j0 = Math.max(Math.min(cellId0[1], cellId1[1]), this.tileInfo.lods[gridLevel].startTileRow);
        var j1 = Math.min(Math.max(cellId0[1], cellId1[1]), this.tileInfo.lods[gridLevel].endTileRow);

        var cellIds = [];

        for (i = i0; i <= i1; i++) {
            for (j = j0; j <= j1; j++) {
                cellIds.push([i, j]);
            }
        }
        return cellIds;
    }
};

