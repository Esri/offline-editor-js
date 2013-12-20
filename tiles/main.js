"use strict"

var map;
var basemapLayer;
var graphics;
var cancelRequested, startTime;
var showTiles = false;

require(["esri/map", 
	"esri/layers/GraphicsLayer", "esri/graphic", "esri/symbols/SimpleFillSymbol",
	"esri/dijit/Scalebar", "esri/arcgis/utils", "esri/geometry",
	"dojo/dom", "dojo/on", "dojo/query", 
	"../vendor/bootstrap-map-js/src/js/bootstrapmap.js",
	"esri/urlUtils", "esri/geometry/webMercatorUtils",
	"tiles/offlineEnabler",
	"dojo/dom-construct", "dojo/domReady!"], 
	function(Map, 
		GraphicsLayer, Graphic, SimpleFillSymbol, 
		Scalebar, esriUtils, geometry, 
		dom, on, query, 
		BootstrapMap, 
		urlUtils, webMercatorUtils, 
		offlineEnabler,
		domConstruct) 
	{
		var scalebar;
		var symbol;

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
				alert("Sorry, couldn't load webmap! " + dojo.toJson(error));
				console.log("Error loading webmap: ", dojo.toJson(error));           
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
			map.on('extent-change', updateTileCountEstimation );
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
					on(dojo.byId('prepare-for-offline-btn'),'click', prepareForOffline);
					on(dojo.byId('cancel-btn'),'click', cancel);
					on(dojo.byId('delete-all-tiles-btn'),'click', deleteAllTiles);
					on(dojo.byId('go-offline-btn'),'click', goOffline);
					on(dojo.byId('go-online-btn'),'click', goOnline);
					on(dojo.byId('update-offline-usage'),'click', updateOfflineUsage);
					on(dojo.byId('show-stored-tiles'),'click', toggleShowStoredTiles);
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
					dojo.byId('update-offline-usage').disabled = true;
					dojo.byId('show-stored-tiles').disabled = true;
					esri.hide(dojo.byId('downloading-ui'));
					/* JAMI: TODO add message telling that something failed while initing the indexedDB */	
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

			for(var level=minLevel; level<=maxLevel; level++)
			{
				var levelEstimation = basemapLayer.getLevelEstimation(map.extent,level);

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
		}

		function goOffline()
		{
			dojo.byId('go-offline-btn').disabled = true;
			dojo.byId('go-online-btn').disabled = undefined;

			basemapLayer.goOffline();
		}

		function goOnline()
		{
			dojo.byId('go-offline-btn').disabled = undefined;
			dojo.byId('go-online-btn').disabled = true;

			basemapLayer.goOnline();
		}

		function deleteAllTiles() 
		{
			basemapLayer.deleteAllTiles(function(success, err)
			{
				console.log("deleteAllTiles():", success,err);

				if( success )
					alert("All tiles deleted");
				else
					alert("Can't delete tiles: " + err);

				setTimeout(updateOfflineUsage,0); // request execution in the next turn of the event loop
			});
		}

		function prepareForOffline()
		{
			/* put UI in downloading mode */
			cancelRequested = false;
			reportProgress(0,1);
			esri.hide(dojo.byId('ready-to-download-ui'));
			esri.show(dojo.byId('downloading-ui'));
			startTime = new Date();

			/* launch offline preparation process */
			var minLevel = parseInt(dojo.byId('minLevel').value);
			var maxLevel = parseInt(dojo.byId('maxLevel').value);
			basemapLayer.prepareForOffline(minLevel, maxLevel, map.extent, reportProgress, finishedDownloading);
		}

		function cancel()
		{
			cancelRequested = true;
		}

		function reportProgress(countNow,countMax)
		{
			var pbar = query('#download-progress [role=progressbar]')[0];
			var percent = countMax? (countNow / countMax * 100) : 0;
			pbar.style.width = percent+"%";

			if( countNow > 5 )
			{
				var currentTime = new Date();
				var elapsedTime = currentTime - startTime;
				var remainingTime = (elapsedTime / countNow) * (countMax - countNow);
				var sec = 1 + Math.floor(remainingTime / 1000);
				var min = Math.floor(sec / 60);
				sec -= (min * 60);
				dojo.byId('remaining-time').innerHTML = ((min<10)? "0" + min : min) + ":" + ((sec<10)? "0" + sec : sec);
			}
			return cancelRequested;
		}

		function finishedDownloading(cancelled)
		{			
			setTimeout(function()
			{				
				esri.show(dojo.byId('ready-to-download-ui'));
				esri.hide(dojo.byId('downloading-ui'));
				updateOfflineUsage();
				showStoredTiles(showTiles);
			}, 1000);
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
	});
