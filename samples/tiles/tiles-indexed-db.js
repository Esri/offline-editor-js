"use strict"

var map;
var basemapLayer;
var graphics;
var cancelRequested, startTime, errorList;
var showTiles = false;

require(["esri/map",
	"esri/layers/GraphicsLayer", "esri/graphic", "esri/symbols/SimpleFillSymbol",
	"esri/dijit/Scalebar", "esri/arcgis/utils", "esri/geometry",
	"dojo/dom", "dojo/on", "dojo/query",
	"vendor/bootstrap-map-js/src/js/bootstrapmap",
	"esri/urlUtils", "esri/geometry/webMercatorUtils",
	"tiles/offlineEnabler","utils/debouncer",
	"dojo/dom-construct", "dojo/domReady!"],
	function(Map,
		GraphicsLayer, Graphic, SimpleFillSymbol,
		Scalebar, esriUtils, geometry,
		dom, on, query,
		BootstrapMap,
		urlUtils, webMercatorUtils,
		offlineEnabler,debouncer,
		domConstruct)
	{
		var scalebar;
		var symbol;
        var orientationChange = false;

		// Load web map when page loads
		var urlObject = urlUtils.urlToObject(window.location.href);
		var webmapid;
		if( urlObject.query && urlObject.query.webmap)
			webmapid = urlObject.query.webmap;

		loadWebmap(webmapid);

		function loadWebmap(webmapid)
		{
			webmapid = webmapid || "bbc1a04a3eca4430be144d7a08b43a17";
			// Get new webmap and extract map and map parts
			var mapDeferred = esriUtils.createMap(webmapid, "mapDiv", {
				mapOptions: {
					slider: true,
					nav:false,
					smartNavigation:false
				}
			});

			mapDeferred.then(function(response)
			{
				map = response.map;

				// Bind to map
				BootstrapMap.bindTo(map);

				// Add title and description
				dom.byId("mapTitle").innerHTML = response.itemInfo.item.title;
				dom.byId("mapDescription").innerHTML = response.itemInfo.item.snippet;

				if(map.loaded)
				{
					basemapLayer = map.getLayer( map.layerIds[0] );
					initMapParts();
					initEvents();
					initOffline();
				}
				else
				{
					on(map,"load",function()
					{
						basemapLayer = map.getLayer( map.layerIds[0] );
						initMapParts();
						initEvents();
						initOffline();
					});
				}

			},function(error){
				showAlert('alert-danger',"Sorry, couldn't load webmap: " + error.message);
				console.log("Error loading webmap:",error);
			});
		}

	  	function initMapParts()
	  	{
			scalebar = new Scalebar({
				map:map,
				scalebarUnit: 'metric'
			});

			graphics = new GraphicsLayer();
			map.addLayer( graphics );

			symbol = new SimpleFillSymbol({
							"type": "esriSFS",
							"style": "esriSFSSolid",
							"color": [255,0,0,5],
							"outline": {
								"type": "esriSLS",
								"style": "esriSLSSolid",
								"color": [0,0,0,100],
								"width": 0.5
							}
						});
		}

		function initEvents()
		{
			map.on('extent-change',debouncer.debounceMap(function(){
                updateTileCountEstimation();
            },250));

            debouncer.setOrientationListener(250,function(){
                console.log("orientation"); orientationChange = true;
                //updateTileCountEstimation();
            })

			on(dojo.byId('minLevel'),'change', updateTileCountEstimation);
			on(dojo.byId('maxLevel'),'change', updateTileCountEstimation);

			dojo.byId('minLevel').value = basemapLayer.minLevel = basemapLayer.tileInfo.lods[0].level;
			dojo.byId('maxLevel').value = basemapLayer.maxLevel = basemapLayer.tileInfo.lods[basemapLayer.tileInfo.lods.length-1].level;
		}

		function initOffline()
		{
			console.log("extending");

			offlineEnabler.extend(basemapLayer,function(success)
			{
				if(success)
				{
					basemapLayer.offline.proxyPath = window.proxyPath || "../../lib/proxy.php";
					on(dojo.byId('prepare-for-offline-btn'),'click', prepareForOffline);
					on(dojo.byId('cancel-btn'),'click', cancel);
					on(dojo.byId('delete-all-tiles-btn'),'click', deleteAllTiles);
					on(dojo.byId('go-offline-btn'),'click', goOffline);
					on(dojo.byId('go-online-btn'),'click', goOnline);
					on(dojo.byId('update-offline-usage'),'click', updateOfflineUsage);
					on(dojo.byId('show-stored-tiles'),'click', toggleShowStoredTiles);
					on(dojo.byId('save-file'),'click', saveToFile);
					on(dojo.byId('file-select'),'change', loadFromFile);
					dojo.byId('go-online-btn').style.display = "none";
					esri.show(dojo.byId('ready-to-download-ui'));
					esri.hide(dojo.byId('downloading-ui'));
					updateOfflineUsage();
					updateTileCountEstimation();
				}
				else
				{
					dojo.byId('prepare-for-offline-btn').disabled = true;
					dojo.byId('delete-all-tiles-btn').disabled = true;
					dojo.byId('go-offline-btn').disabled = true;
					dojo.byId('go-online-btn').disabled = true;
					esri.hide(dojo.byId('go-online-btn'));
					dojo.byId('update-offline-usage').disabled = true;
					dojo.byId('show-stored-tiles').disabled = true;
					esri.hide(dojo.byId('downloading-ui'));

					showAlert("alert-danger","Failed initializing storage, probably your browser doesn't support <a href='http://caniuse.com/#feat=indexeddb'>IndexedDB</a> nor <a href='http://caniuse.com/#feat=sql-storage'>WebSQL</a>");
				}
            });

			Offline.on('up', goOnline );
			Offline.on('down', goOffline );
		}

		function updateOfflineUsage()
		{
			dojo.byId('offline-usage').innerHTML = "updating...";
			basemapLayer.getOfflineUsage(function(usage)
			{
				console.log(usage);
				console.log("Avg tile size:", Math.round(usage.size * 1024 / usage.tileCount * 100) / 100, "Kb");
				var usageStr = usage.size + " Mb (" + usage.tileCount + " tiles)";
				dojo.byId('offline-usage').innerHTML = usageStr;
			});
		}

		function updateTileCountEstimation()
		{
			console.log('updating');
			var zoomLevel = map.getLevel();
            dojo.byId('currentLevel').value = zoomLevel;

            var minLevel = parseInt(dojo.byId('minLevel').value);
            var maxLevel = parseInt(dojo.byId('maxLevel').value);

            if( maxLevel > zoomLevel + 3 || maxLevel > basemapLayer.maxLevel)
            {
                maxLevel = Math.min(basemapLayer.maxLevel, zoomLevel + 3);
                dojo.byId('maxLevel').value = maxLevel;
            }

			var totalEstimation = { tileCount:0, sizeBytes:0 }

			domConstruct.empty('tile-count-table-body');

            basemapLayer.estimateTileSize(function(tileSize){
                for(var level=minLevel; level<=maxLevel; level++)
                {
                    var levelEstimation = basemapLayer.getLevelEstimation(map.extent,level,tileSize);

                    totalEstimation.tileCount += levelEstimation.tileCount;
                    totalEstimation.sizeBytes += levelEstimation.sizeBytes;

                    if( levelEstimation.tileCount > 1)
                    {
                        var rowContent = [levelEstimation.level, levelEstimation.tileCount, Math.round(levelEstimation.sizeBytes / 1024 / 1024 * 100) / 100 + " Mb"]
                        rowContent = "<td>" + rowContent.join("</td><td>") + "</td>";
                        var tr = domConstruct.place("<tr>", dojo.byId('tile-count-table-body'),'last')
                        domConstruct.place(rowContent, tr,'last');
                    }

                    if( totalEstimation.tileCount > 5000 )
                    {
                        var tr = domConstruct.place("<tr>", dojo.byId('tile-count-table-body'),'last')
                        domConstruct.place("<td colspan=4>...</td>", tr,'last');
                        break;
                    }
                }

                rowContent = ["Total", totalEstimation.tileCount, Math.floor(totalEstimation.sizeBytes / 1024 / 1024 * 100)/100 + " Mb"];
                rowContent = "<td><b>" + rowContent.join("</b></td><td><b>") + "</b></td>";
                tr = domConstruct.place("<tr>", dojo.byId('tile-count-table-body'),'last')
                domConstruct.place(rowContent, tr,'last');
            })

//                    for(var level=minLevel; level<=maxLevel; level++)
//                    {
//                        totalEstimation.tileCount += levelEstimation.tileCount;
//                        totalEstimation.sizeBytes += levelEstimation.sizeBytes;
//
//                        if( levelEstimation.tileCount > 1 && levelEstimation.tileCount < 5000)
//                        {
//                            var rowContent = [level, levelEstimation.tileCount, Math.round(levelEstimation.sizeBytes / 1024 / 1024 * 100) / 100 + " Mb"]
//                            rowContent = "<td>" + rowContent.join("</td><td>") + "</td>";
//                            var tr = domConstruct.place("<tr>", dojo.byId('tile-count-table-body'),'last')
//                            domConstruct.place(rowContent, tr,'last');
//                        }
//
//                        if( totalEstimation.tileCount > 5000 )
//                        {
//                            var tr = domConstruct.place("<tr>", dojo.byId('tile-count-table-body'),'last')
//                            domConstruct.place("<td colspan=4>...</td>", tr,'last');
//                            break;
//                        }
//                    }
//
//                    rowContent = ["Total", totalEstimation.tileCount, Math.floor(totalEstimation.sizeBytes / 1024 / 1024 * 100)/100 + " Mb"];
//                    rowContent = "<td><b>" + rowContent.join("</b></td><td><b>") + "</b></td>";
//                    tr = domConstruct.place("<tr>", dojo.byId('tile-count-table-body'),'last')
//                    domConstruct.place(rowContent, tr,'last');
//                });
//            })
		}

		function goOffline()
		{
			dojo.byId('go-offline-btn').disabled = true;
			dojo.byId('go-online-btn').disabled = undefined;
			dojo.byId('go-offline-btn').style.display = "none";
			dojo.byId('go-online-btn').style.display = "";

			basemapLayer.goOffline();
		}

		function goOnline()
		{
			dojo.byId('go-offline-btn').disabled = undefined;
			dojo.byId('go-online-btn').disabled = true;
			dojo.byId('go-offline-btn').style.display = "";
			dojo.byId('go-online-btn').style.display = "none";

			basemapLayer.goOnline();
		}

		function deleteAllTiles()
		{
			basemapLayer.deleteAllTiles(function(success, err)
			{
				console.log("deleteAllTiles():", success,err);

				if( success )
					showAlert("alert-success", "All tiles deleted");
				else
					showAlert("alert-danger", "Can't delete tiles: " + err);

				setTimeout(function()
				{
					updateOfflineUsage();
					showStoredTiles(showTiles);
				},0); // request execution in the next turn of the event loop
			});
		}

		function prepareForOffline()
		{
			/* put UI in downloading mode */
			cancelRequested = false;
			errorList = [];
			query('#download-progress [role=progressbar]')
				.removeClass('progress-bar-warning')
				.addClass('progress-bar-success');
			hideAlert();
			reportProgress({countNow:0,countMax:1});
			esri.hide(dojo.byId('ready-to-download-ui'));
			esri.show(dojo.byId('downloading-ui'));
			startTime = new Date();

			/* launch offline preparation process */
			var minLevel = parseInt(dojo.byId('minLevel').value);
            var maxLevel = map.getLevel();  //current zoom level sets max extent
			basemapLayer.prepareForOffline(minLevel, maxLevel, map.extent, reportProgress);
		}

		function cancel()
		{
			cancelRequested = true;
		}

		function reportProgress(progress)
		{
			if( progress.finishedDownloading )
			{
				if( progress.cancelRequested )
					showAlert('alert-warning', 'Cancelled');
				else if (errorList.length == 0)
					showAlert('alert-success', 'All tiles downloaded and stored');
				else
					showAlert('alert-warning', "Finished downloading tiles, " + errorList.length + " tiles couldn't be downloaded");

				setTimeout(function()
				{
					esri.show(dojo.byId('ready-to-download-ui'));
					esri.hide(dojo.byId('downloading-ui'));
					updateOfflineUsage();
					showStoredTiles(showTiles);
				}, 1000);
			}
			else
			{
				// progress bar
				var pbar = query('#download-progress [role=progressbar]')[0];
				var percent = progress.countMax? (progress.countNow / progress.countMax * 100) : 0;
				pbar.style.width = percent+"%";

				// any errors?
				if( progress.error )
				{
					query('#download-progress [role=progressbar]')
						.removeClass('progress-bar-success')
						.addClass('progress-bar-warning');

					errorList.push(progress.error.msg);

					showAlert('alert-warning', progress.error.msg);
				}

				// remaining time
				if( progress.countNow > 5 )
				{
					var currentTime = new Date();
					var elapsedTime = currentTime - startTime;
					var remainingTime = (elapsedTime / progress.countNow) * (progress.countMax - progress.countNow);
					var sec = 1 + Math.floor(remainingTime / 1000);
					var min = Math.floor(sec / 60);
					sec -= (min * 60);
					dojo.byId('remaining-time').innerHTML = ((min<10)? "0" + min : min) + ":" + ((sec<10)? "0" + sec : sec);
				}

				return cancelRequested;
			}
		}

		function toggleShowStoredTiles()
		{
			showTiles = !showTiles;
			dojo.byId('show-stored-tiles-caption').innerHTML = showTiles? "Hide Stored Tiles" : "Show Stored Tiles";
			showStoredTiles(showTiles);
		}

		function showStoredTiles(showTiles)
		{
			graphics.clear();

			if( showTiles )
			{
				basemapLayer.getTilePolygons(function(polygon,err)
				{
					if(polygon)
					{
						var graphic = new Graphic(polygon, symbol);
						graphics.add(graphic);
					}
					else
					{
						console.log("showStoredTiles: ", err);
					}
				}.bind(this));
			}
		}

		function saveToFile()
		{
			basemapLayer.saveToFile("tiles.csv", function(success,msg)
			{
				if(success)
					showAlert('alert-success',msg);
				else
					showAlert('alert-danger',msg);
			});
		}

		function loadFromFile()
		{
			var selectedFile = dojo.byId('file-select').files[0];

			// clear input.files variable, so that next time it is empty again
			// otherwise selecting the same file twice will not trigger the 'change' event the second time
			var form = domConstruct.create('form');
			domConstruct.place(dojo.byId('file-select'), form, "before");
			form.reset();

			if( !selectedFile )
			{
				showAlert('alert-warning',"Please, select one file");
				return;
			}

			basemapLayer.loadFromFile(selectedFile, function(success,msg)
			{
				if(success)
					showAlert('alert-success',msg);
				else
					showAlert('alert-danger',msg);

				updateOfflineUsage();
				showStoredTiles(showTiles);
			});
		}

		function showAlert(type, msg)
		{
			var icon = "";
			switch(type)
			{
				case 'alert-success': icon = "fa-check"; break;
				case 'alert-info':    icon = "fa-info-circle"; break;
				case 'alert-warning': icon = "fa-warning"; break;
				case 'alert-danger':  icon = "fa-ban"; break;
			}
			dojo.byId('error-msg').innerHTML = msg;
			dojo.query('#error-div .close').onclick(hideAlert);
			dojo.query('#error-div .alert')
				.removeClass('alert-success')
				.removeClass('alert-info')
				.removeClass('alert-warning')
				.removeClass('alert-danger')
				.addClass(type);
			dojo.query('#error-div .fa')
				.removeClass('fa-info-circle')
				.addClass(icon);
			esri.show(dojo.byId('error-div'));
		}

		function hideAlert()
		{
			esri.hide(dojo.byId('error-div'));
		}
	});
