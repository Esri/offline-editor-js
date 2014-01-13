"use strict"

define([
	"dojo/query",
	"esri/geometry",
	"tiles/base64utils",
	"tiles/dbStore",
	"tiles/tilingScheme",
	"tiles/FileSaver"
	], function(query, geometry,Base64Utils,DbStore,TilingScheme,FileSaver)
	{
		return {
			/*
			 * utility method to get the basemap layer reference
			 */
			getBasemapLayer: function(map)
			{
				var layerId = map.layerIds[0];
				return map.getLayer(layerId);
			},

			/*
			 * method that extends a layer object with the offline capability
			 * 
			 * after extending one layer, you can call layer.goOffline() or layer.goOnline()
			 */
			extend: function(layer,callback)
			{
				console.log("extending layer", layer.url);

				/* we add some methods to the layer object */
				/* we don't want to extend the tiled layer class, as it is a capability that we want to add only to one instance */
				/* we also add some additional attributes inside an "offline" object */

				layer._getTileUrl = layer.getTileUrl;				
				layer.offline = {
					online: true,
					store: new DbStore(),
					proxyPath: "../lib/proxy.php"					
				};

				if( /*false &&*/ layer.offline.store.isSupported() )
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

					url = url.split('?')[0];

					/* temporary URL returned immediately, as we haven't retrieved the image from the indexeddb yet */
					var tileid = "void:"+level+"-"+row+"-"+col; 

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

				layer.getLevelEstimation = function(extent, level)
				{
					var tilingScheme = new TilingScheme(this,geometry);
				 	var cellIds = tilingScheme.getAllCellIdsInExtent(extent,level);
					var tileSize = this.estimateTileSize();

					var levelEstimation = { 
						level: level,
						tileCount: cellIds.length,
						sizeBytes: cellIds.length * tileSize
					}

					return levelEstimation;
				};

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

						if( cells.length > 5000 && level != maxLevel)
						{
							console.log("me planto!");
							break;
						}
					}

					/* launch tile download */
					this.doNextTile(0, cells, reportProgress);
				};

				layer.goOffline = function()
				{
					this.offline.online = false;
				};

				layer.goOnline = function()
				{
					this.offline.online = true;
					this.refresh();
				};				

				layer.deleteAllTiles = function(callback)
				{
					var store = this.offline.store;
					store.deleteAll(callback);			
				}

				layer.getOfflineUsage = function(callback)
				{
					var store = this.offline.store;
					store.size(callback);
				};

				layer.getTilePolygons = function(callback)
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

				layer.saveToFile = function(fileName, callback)
				{
					var store = this.offline.store;
					var csv = [];

					csv.push("url,img");
					store.getAllTiles(function(url,img,evt)
					{
						if(evt=="end")
						{
							var blob = new Blob([ csv.join("\r\n") ], {type:"text/plain;charset=utf-8"});
							FileSaver.saveAs(blob, fileName);
							callback(true, "Saved " + (csv.length-1) + " tiles (" + Math.floor(blob.size / 1024 / 1024 * 100) / 100 + " Mb) into " + fileName);
						}
						else
						{
							csv.push(url+","+img);
						}
					})
				}

				layer.loadFromFile = function(file, callback)
				{
					var store = this.offline.store;

					if (window.File && window.FileReader && window.FileList && window.Blob) 
					{
						// Great success! All the File APIs are supported.
						var reader = new FileReader();
						reader.onload = function(evt)
						{
							var csvContent = evt.target.result;
							var tiles = csvContent.split("\r\n");
							var tileCount = 0;
							for(var i=1; i<tiles.length; i++)
							{
								var pair = tiles[i].split(',');
								var tile = {
									url: pair[0],
									img: pair[1]
								}
								store.add(tile,function(success)
								{
									if( success )
										tileCount += 1;

									if( tileCount == tiles.length-1)
										callback(true, tileCount + " tiles loaded from " + file.name);
								});
							}
						}
						reader.readAsText(file);
					} 
					else 
					{
						callback(false, 'The File APIs are not fully supported in this browser.');
					}					
				}

				/* internal methods */

				layer.estimateTileSize = function()
				{
					var tileInfo = this.tileInfo;

					return 14000; // TODO - come up with a more precise estimation method
				};

				layer.doNextTile = function(i,cells, reportProgress)
				{
					var cell = cells[i];
					var error;

					this.storeTile(cell.level,cell.row,cell.col, function(success, error)
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
							this.doNextTile(i+1, cells, reportProgress);
						
					}.bind(this))
				}

				layer.storeTile = function(level,row,col,callback)
				{
					var store = this.offline.store;					
					var url = this._getTileUrl(level,row,col);
					url = url.split('?')[0];

					/* download the tile */
					var imgurl = this.offline.proxyPath + "?" + url;
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

