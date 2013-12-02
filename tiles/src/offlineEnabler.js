define([
	], function()
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

					var offlineTile = this.offline.store.get(url);
					if( offlineTile )
					{
						console.log("found tile offline");
						//return "data:image;base64," + offlineTile.img;
						var imgURL = URL.createObjectURL(offlineTile.img);
						return imgURL;
					}
					else
					{
						console.log("tile is not in the offline store");
						return "";
					}
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
					var url = this._getTileUrl(level,row,col);
					var store = this.offline.store;

					/* download the tile */
					var imgurl = "proxy.php?" + url;
					var req = new XMLHttpRequest();
					req.open("GET", imgurl, true);
					/* https://hacks.mozilla.org/2012/02/storing-images-and-files-in-indexeddb/ */
					req.responseType == "blob";
					/*
					req.overrideMimeType("text/plain; charset=x-user-defined"); // https://developer.mozilla.org/en-US/docs/Web/API/XMLHttpRequest/Using_XMLHttpRequest?redirectlocale=en-US&redirectslug=DOM%2FXMLHttpRequest%2FUsing_XMLHttpRequest#Handling_binary_data 
					*/
					req.onload = function()
					{
						if( req.status == 200 )
						{							
							var img = this.response;

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

