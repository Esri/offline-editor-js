define([
	"dojo/query"
	], function(query)
	{
		console.log("offlineEnabler.js");

		return {
			getBasemapLayer: function(map)
			{
				var layerId = map.layerIds[0];
				return map.getLayer(layerId);
			},

			extend: function(layer,callback)
			{
				console.log("extending layer", layer.url);

				/* we add some methods to the layer object */
				/* we don't want to extend the tiled layer class, as it is a capability that we want to add only to one instance */
				/* we also add some additional attributes inside an "offline" object */

				layer._getTileUrl = layer.getTileUrl;				
				layer.offline = {
					online: true,
					store: new DbStore()
				};

				if( layer.offline.store.isSupported() )
					layer.offline.store.init(callback);
				else					
					return callback(false, "indexedDB not supported");

				layer.getTileUrl = function(level,row,col)
				{
					console.log("looking for tile",level,row,col);
					var url = this._getTileUrl(level,row,col);

					if( this.offline.online )
					{
						console.log("fetching url online: ", url);
						return url;
					}

					var tileid = "loading.php?"+level+"-"+row+"-"+col;

					this.offline.store.get(url, function(success, offlineTile)
					{
						var img = query("img[src="+tileid+"]")[0];
						if( success )
						{
							console.log("found tile offline", url);
							var imgURL =  "data:image;base64," + offlineTile.img;
							//console.log(imgURL);
							//var imgURL = URL.createObjectURL(offlineTile.img);

							// search for the img with src="|"+level+"|"+row+"|"+col+"|" and replace with actual url
							img.style.borderColor = "blue";
							img.src = imgURL;

							return "";	/* this result goes nowhere, seriously */
						}
						else
						{
							img.style.borderColor = "green";
							console.log("tile is not in the offline store", url);
							return "";	/* this result goes nowhere, seriously */
						}						
					});

					return tileid;
				};

				layer.goOffline = function()
				{
					this.offline.online = false;
				};

				layer.goOnline = function()
				{
					this.offline.online = true;
				};				

				layer.storeTile = function(level,row,col,callback)
				{
					function customBase64Encode (inputStr) 
					{
					    var
					        bbLen               = 3,
					        enCharLen           = 4,
					        inpLen              = inputStr.length,
					        inx                 = 0,
					        jnx,
					        keyStr              = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz"
					                            + "0123456789+/=",
					        output              = "",
					        paddingBytes        = 0;
					    var
					        bytebuffer          = new Array (bbLen),
					        encodedCharIndexes  = new Array (enCharLen);

					    while (inx < inpLen) {
					        for (jnx = 0;  jnx < bbLen;  ++jnx) {
					            /*--- Throw away high-order byte, as documented at:
					              https://developer.mozilla.org/En/Using_XMLHttpRequest#Handling_binary_data
					            */
					            if (inx < inpLen)
					                bytebuffer[jnx] = inputStr.charCodeAt (inx++) & 0xff;
					            else
					                bytebuffer[jnx] = 0;
					        }

					        /*--- Get each encoded character, 6 bits at a time.
					            index 0: first  6 bits
					            index 1: second 6 bits
					                        (2 least significant bits from inputStr byte 1
					                         + 4 most significant bits from byte 2)
					            index 2: third  6 bits
					                        (4 least significant bits from inputStr byte 2
					                         + 2 most significant bits from byte 3)
					            index 3: forth  6 bits (6 least significant bits from inputStr byte 3)
					        */
					        encodedCharIndexes[0] = bytebuffer[0] >> 2;
					        encodedCharIndexes[1] = ( (bytebuffer[0] & 0x3) << 4)   |  (bytebuffer[1] >> 4);
					        encodedCharIndexes[2] = ( (bytebuffer[1] & 0x0f) << 2)  |  (bytebuffer[2] >> 6);
					        encodedCharIndexes[3] = bytebuffer[2] & 0x3f;

					        //--- Determine whether padding happened, and adjust accordingly.
					        paddingBytes          = inx - (inpLen - 1);
					        switch (paddingBytes) {
					            case 1:
					                // Set last character to padding char
					                encodedCharIndexes[3] = 64;
					                break;
					            case 2:
					                // Set last 2 characters to padding char
					                encodedCharIndexes[3] = 64;
					                encodedCharIndexes[2] = 64;
					                break;
					            default:
					                break; // No padding - proceed
					        }

					        /*--- Now grab each appropriate character out of our keystring,
					            based on our index array and append it to the output string.
					        */
					        for (jnx = 0;  jnx < enCharLen;  ++jnx)
					            output += keyStr.charAt ( encodedCharIndexes[jnx] );
					    }
					    return output;
					}

					var url = this._getTileUrl(level,row,col);
					var store = this.offline.store;

					/* download the tile */
					var imgurl = "proxy.php?" + url;
					var req = new XMLHttpRequest();
					req.open("GET", imgurl, true);
					/* https://hacks.mozilla.org/2012/02/storing-images-and-files-in-indexeddb/ */
					//req.responseType == "blob";
					/**/
					req.overrideMimeType("text/plain; charset=x-user-defined"); // https://developer.mozilla.org/en-US/docs/Web/API/XMLHttpRequest/Using_XMLHttpRequest?redirectlocale=en-US&redirectslug=DOM%2FXMLHttpRequest%2FUsing_XMLHttpRequest#Handling_binary_data 
					//*/
					req.onload = function()
					{
						if( req.status == 200 )
						{							
							//var img = this.response;
							var img = customBase64Encode(this.responseText);

							var tile = {
								url: url,
								img: img
							}

							store.add(tile,callback);
						}
						else
						{
							console.log("xhr failed for ", imgurl);
							callback(false,req.status);
						}
					}
					req.onerror = function(e)
					{
						console.log("xhr failed for ", imgurl);
						callback(false, e);
					}
					req.send(null);
				};

				layer.deleteAllTiles = function(callback)
				{
					var store = this.offline.store;
					store.deleteAll(callback);			
				}

				layer.getOfflineUsage = function()
				{
					return {
						tileCount: 0,
						size: 0
					}
				};

			}
		}
	});

