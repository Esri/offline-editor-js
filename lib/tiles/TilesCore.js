/**
 * This library contains common core code between offlineTilesEnabler.js
 * and OfflineTilesEnablerLayer.js
 */
define([
    "dojo/query",
    "tiles/base64utils",
    ],
    function(query,Base64Utils){
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
        }

        return TilesCore;
    }
)
