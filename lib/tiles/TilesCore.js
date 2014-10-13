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
                imgURL = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAQAAAAEACAYAAABccqhmAAAACXBIWXMAAAsTAAALEwEAmpwYAAAKT2lDQ1BQaG90b3Nob3AgSUNDIHByb2ZpbGUAAHjanVNnVFPpFj333vRCS4iAlEtvUhUIIFJCi4AUkSYqIQkQSoghodkVUcERRUUEG8igiAOOjoCMFVEsDIoK2AfkIaKOg6OIisr74Xuja9a89+bN/rXXPues852zzwfACAyWSDNRNYAMqUIeEeCDx8TG4eQuQIEKJHAAEAizZCFz/SMBAPh+PDwrIsAHvgABeNMLCADATZvAMByH/w/qQplcAYCEAcB0kThLCIAUAEB6jkKmAEBGAYCdmCZTAKAEAGDLY2LjAFAtAGAnf+bTAICd+Jl7AQBblCEVAaCRACATZYhEAGg7AKzPVopFAFgwABRmS8Q5ANgtADBJV2ZIALC3AMDOEAuyAAgMADBRiIUpAAR7AGDIIyN4AISZABRG8lc88SuuEOcqAAB4mbI8uSQ5RYFbCC1xB1dXLh4ozkkXKxQ2YQJhmkAuwnmZGTKBNA/g88wAAKCRFRHgg/P9eM4Ors7ONo62Dl8t6r8G/yJiYuP+5c+rcEAAAOF0ftH+LC+zGoA7BoBt/qIl7gRoXgugdfeLZrIPQLUAoOnaV/Nw+H48PEWhkLnZ2eXk5NhKxEJbYcpXff5nwl/AV/1s+X48/Pf14L7iJIEyXYFHBPjgwsz0TKUcz5IJhGLc5o9H/LcL//wd0yLESWK5WCoU41EScY5EmozzMqUiiUKSKcUl0v9k4t8s+wM+3zUAsGo+AXuRLahdYwP2SycQWHTA4vcAAPK7b8HUKAgDgGiD4c93/+8//UegJQCAZkmScQAAXkQkLlTKsz/HCAAARKCBKrBBG/TBGCzABhzBBdzBC/xgNoRCJMTCQhBCCmSAHHJgKayCQiiGzbAdKmAv1EAdNMBRaIaTcA4uwlW4Dj1wD/phCJ7BKLyBCQRByAgTYSHaiAFiilgjjggXmYX4IcFIBBKLJCDJiBRRIkuRNUgxUopUIFVIHfI9cgI5h1xGupE7yAAygvyGvEcxlIGyUT3UDLVDuag3GoRGogvQZHQxmo8WoJvQcrQaPYw2oefQq2gP2o8+Q8cwwOgYBzPEbDAuxsNCsTgsCZNjy7EirAyrxhqwVqwDu4n1Y8+xdwQSgUXACTYEd0IgYR5BSFhMWE7YSKggHCQ0EdoJNwkDhFHCJyKTqEu0JroR+cQYYjIxh1hILCPWEo8TLxB7iEPENyQSiUMyJ7mQAkmxpFTSEtJG0m5SI+ksqZs0SBojk8naZGuyBzmULCAryIXkneTD5DPkG+Qh8lsKnWJAcaT4U+IoUspqShnlEOU05QZlmDJBVaOaUt2ooVQRNY9aQq2htlKvUYeoEzR1mjnNgxZJS6WtopXTGmgXaPdpr+h0uhHdlR5Ol9BX0svpR+iX6AP0dwwNhhWDx4hnKBmbGAcYZxl3GK+YTKYZ04sZx1QwNzHrmOeZD5lvVVgqtip8FZHKCpVKlSaVGyovVKmqpqreqgtV81XLVI+pXlN9rkZVM1PjqQnUlqtVqp1Q61MbU2epO6iHqmeob1Q/pH5Z/YkGWcNMw09DpFGgsV/jvMYgC2MZs3gsIWsNq4Z1gTXEJrHN2Xx2KruY/R27iz2qqaE5QzNKM1ezUvOUZj8H45hx+Jx0TgnnKKeX836K3hTvKeIpG6Y0TLkxZVxrqpaXllirSKtRq0frvTau7aedpr1Fu1n7gQ5Bx0onXCdHZ4/OBZ3nU9lT3acKpxZNPTr1ri6qa6UbobtEd79up+6Ynr5egJ5Mb6feeb3n+hx9L/1U/W36p/VHDFgGswwkBtsMzhg8xTVxbzwdL8fb8VFDXcNAQ6VhlWGX4YSRudE8o9VGjUYPjGnGXOMk423GbcajJgYmISZLTepN7ppSTbmmKaY7TDtMx83MzaLN1pk1mz0x1zLnm+eb15vft2BaeFostqi2uGVJsuRaplnutrxuhVo5WaVYVVpds0atna0l1rutu6cRp7lOk06rntZnw7Dxtsm2qbcZsOXYBtuutm22fWFnYhdnt8Wuw+6TvZN9un2N/T0HDYfZDqsdWh1+c7RyFDpWOt6azpzuP33F9JbpL2dYzxDP2DPjthPLKcRpnVOb00dnF2e5c4PziIuJS4LLLpc+Lpsbxt3IveRKdPVxXeF60vWdm7Obwu2o26/uNu5p7ofcn8w0nymeWTNz0MPIQ+BR5dE/C5+VMGvfrH5PQ0+BZ7XnIy9jL5FXrdewt6V3qvdh7xc+9j5yn+M+4zw33jLeWV/MN8C3yLfLT8Nvnl+F30N/I/9k/3r/0QCngCUBZwOJgUGBWwL7+Hp8Ib+OPzrbZfay2e1BjKC5QRVBj4KtguXBrSFoyOyQrSH355jOkc5pDoVQfujW0Adh5mGLw34MJ4WHhVeGP45wiFga0TGXNXfR3ENz30T6RJZE3ptnMU85ry1KNSo+qi5qPNo3ujS6P8YuZlnM1VidWElsSxw5LiquNm5svt/87fOH4p3iC+N7F5gvyF1weaHOwvSFpxapLhIsOpZATIhOOJTwQRAqqBaMJfITdyWOCnnCHcJnIi/RNtGI2ENcKh5O8kgqTXqS7JG8NXkkxTOlLOW5hCepkLxMDUzdmzqeFpp2IG0yPTq9MYOSkZBxQqohTZO2Z+pn5mZ2y6xlhbL+xW6Lty8elQfJa7OQrAVZLQq2QqboVFoo1yoHsmdlV2a/zYnKOZarnivN7cyzytuQN5zvn//tEsIS4ZK2pYZLVy0dWOa9rGo5sjxxedsK4xUFK4ZWBqw8uIq2Km3VT6vtV5eufr0mek1rgV7ByoLBtQFr6wtVCuWFfevc1+1dT1gvWd+1YfqGnRs+FYmKrhTbF5cVf9go3HjlG4dvyr+Z3JS0qavEuWTPZtJm6ebeLZ5bDpaql+aXDm4N2dq0Dd9WtO319kXbL5fNKNu7g7ZDuaO/PLi8ZafJzs07P1SkVPRU+lQ27tLdtWHX+G7R7ht7vPY07NXbW7z3/T7JvttVAVVN1WbVZftJ+7P3P66Jqun4lvttXa1ObXHtxwPSA/0HIw6217nU1R3SPVRSj9Yr60cOxx++/p3vdy0NNg1VjZzG4iNwRHnk6fcJ3/ceDTradox7rOEH0x92HWcdL2pCmvKaRptTmvtbYlu6T8w+0dbq3nr8R9sfD5w0PFl5SvNUyWna6YLTk2fyz4ydlZ19fi753GDborZ752PO32oPb++6EHTh0kX/i+c7vDvOXPK4dPKy2+UTV7hXmq86X23qdOo8/pPTT8e7nLuarrlca7nuer21e2b36RueN87d9L158Rb/1tWeOT3dvfN6b/fF9/XfFt1+cif9zsu72Xcn7q28T7xf9EDtQdlD3YfVP1v+3Njv3H9qwHeg89HcR/cGhYPP/pH1jw9DBY+Zj8uGDYbrnjg+OTniP3L96fynQ89kzyaeF/6i/suuFxYvfvjV69fO0ZjRoZfyl5O/bXyl/erA6xmv28bCxh6+yXgzMV70VvvtwXfcdx3vo98PT+R8IH8o/2j5sfVT0Kf7kxmTk/8EA5jz/GMzLdsAAAAgY0hSTQAAeiUAAICDAAD5/wAAgOkAAHUwAADqYAAAOpgAABdvkl/FRgAABQdJREFUeNrs2yFv6mocwOH/ualYRUVJRrKKCRATCCZqJ/mOfKQJBGaiYkcguoSJigoQTc4VN222Mdhu7l0ysudJjqFAD13669u37a/lcvkngB8piYhYLBa2BPxAf9kEIACAAAACAAgAIACAAAACAAgAIACAAAACAAgAIACAAAACAAgAIACAAAACAAgAIACAAAACAAgAIACAAAACAAgAIACAAAACAAgAIACAAAACAAgACAAgAIAAAAIACAAgAIAAAAIACAAgAIAAAAIACAAgAIAAAAIACAAgAIAAAAIACAAgAIAAAAIACAAgAIAAAAIACAAgAIAAAAIACAAgAIAAAAIACAAIACAAgAAAAgAIACAAgAAAAgAIACAAgAAAAgAIACAAgAAAAgAIACAAgAAAAgAIACAAgAAAAgAIACAAgAAAAgAIACAAgAAAAgAIACAAgAAAAgAIAPxsiU3wfbRtG1mWnVzedV3kef7q9a7rYrvdxm63i4iILMtiNBpFkiQfftdnZFkWbdtGRAzr7j+fZdnR9Xy0jiRJTv5eBOBHqaoqsiyLm5ubo8ubponFYjG8Vtd1VFV1sKMlSRI3NzdRFMXJ7/qMsixjtVpFRAzr7j9fluVBkD67jjzPoyxLf3gBoLfZbGI8Hh/dqV6q6zoeHh4iSZKYTCYxGo0iImK73Q7Luq6L6+vrg88WRfFqHfv9Puq6jjRN4+rq6tV7Ly4u/tNvKori3e9I09QfXAB4a71ex93d3ckhfNd1UVXVcIR+OZTO8zyKooj7+/uoqiouLy8Pdra3I4OmaaKu67i4uIjpdPq//p63seH7MAn4DXVdF+v1+sOjf390f+88Osuy4ci/2WxsVATgXEwmk2ia5uSOu91uIyJiPB4ffU+/rJ/AA6cAZ2A6ncbz83NUVRV5nr97hO8n104Nrftln53s+ypVVR2czpj8MwLghPl8HkmSDBN556xt22ia5tU/jAA4IU3TmE6nUVVVVFUVs9nsbH/LqUuFGAFwxPX1deR5HnVdD+f8LwPx0fl9f2OQy20IwJm6vb0dTgX2+/3wej8vcCoA/VDb3XYIwLmeoyVJzGaz6LpuOKJHRFxeXkbEP5cDj+mX9e8FAThD4/H44HJfURSRpmk0TROPj48Hn3l4eIimaSJN06O3A4NJwDMxm82ibdtXo4D5fB6r1Sp+//4dz8/Pw5H+6ekpdrtdJEkS8/n8S/9f713ie3vaceo9x557QAB451Sgfyin34HKshweunk5HzAej2MymXz5+f9nbjJyI9L39Wu5XP55+XQZ39uxR4Z3u90wSXjqEV0wAjhjx47oaZq63Me/ZhIQBAAQAEAAAAEABAAQAEAAAAEABAAQAEAAAAEABAAQAEAAAAEABAAQAEAAAAEABAAQAEAAAAEABAAQAEAAAAEABAAQAEAAAAEABAAQAEAAAAEAAbAJQAAAAQAEABAAQAAAAQAEABAAQAAAAQAEABAAQAAAAQAEABAAQAAAAQAEABAAQAAAAQAEABAAQAAAAQAEABAAQAAAAQAEABAAQAAAAQAEABAAEABAAAABAAQAEABAAAABAAQAEABAAAABAAQAEABAAAABAAQAEABAAAABAAQAEABAAAABAAQAEABAAAABAAQAEABAAAABAAQAEABAAAABAAQAEAAQAEAAAAEABAAQAEAAAAEABAAQAEAAAAEABAAQAEAAAAEAvqe/BwCeKjUweoA8pQAAAABJRU5ErkJggg==";
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


