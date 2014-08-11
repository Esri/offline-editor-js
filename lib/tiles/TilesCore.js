/**
 * This library contains common core code between offlineTilesEnabler.js
 * and OfflineTilesEnablerLayer.js
 */
define([
    "dojo/query",
    "esri/geometry/Point",
    "esri/geometry/Extent",
    "esri/SpatialReference",
    "esri/layers/TileInfo",
    "esri/layers/LOD",
    "tiles/base64utils",
    ],
    function(query,Point,Extent,SpatialReference,TileInfo,LOD,Base64Utils){
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
            }

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
        }

        return TilesCore;
    }
)
