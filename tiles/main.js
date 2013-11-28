"use strict"

var map;
var graphics;
var cancelRequested;

require(["esri/map", 
	"esri/layers/GraphicsLayer", "esri/graphic", "esri/symbols/SimpleFillSymbol",
	"esri/dijit/Scalebar", 
	"esri/arcgis/utils", 
	"esri/geometry",
	"dojo/dom", 
	"dojo/on", 
	"dojo/query", 
	"../vendor/bootstrap-map-js/src/js/bootstrapmap.js",
	"esri/urlUtils",
	"esri/geometry/webMercatorUtils",
	"dojo/dom-construct",
	"dojo/domReady!"], 
	function(Map, GraphicsLayer, Graphic, SimpleFillSymbol, Scalebar, esriUtils, geometry, dom, on, query, BootstrapMap, urlUtils, webMercatorUtils, domConstruct) 
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
			webmapid = webmapid || "f58996878ac24702afef792e52a07e55";
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

				// Add title
				dom.byId("mapTitle").innerHTML = response.itemInfo.item.title;

				if(map.loaded)
				{
					initMapParts();
					initEvents();
					updateTileSizeEstimation();
				}
				else
				{
					on(map,"load",function()
					{
						initMapParts();
						initEvents();
						updateTileSizeEstimation();
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
							"color": [255,0,0,20],
							"outline": {
								"type": "esriSLS",
								"style": "esriSLSSolid",
								"color": [0,0,0,25],
								"width": 1
							}
						});
		}

		function initEvents()
		{
			map.on('extent-change', updateTileSizeEstimation );
			on(dojo.byId('minLevel'),'change', updateTileSizeEstimation);
			on(dojo.byId('maxLevel'),'change', updateTileSizeEstimation);

			on(dojo.byId('prepare-for-offline-btn'),'click', prepareForOffline);
			on(dojo.byId('cancel-btn'),'click', cancel);
			esri.show(dojo.byId('ready-to-download-ui'));
			esri.hide(dojo.byId('downloading-ui'));

			var basemapLayer = map.getLayer( map.layerIds[0] );
			dojo.byId('minLevel').value = basemapLayer.tileInfo.lods[0].level;
			dojo.byId('maxLevel').value = basemapLayer.tileInfo.lods[basemapLayer.tileInfo.lods.length-1].level;
		}

		function estimateTileSize(tiledLayer)
		{
			var tileInfo = tiledLayer.tileInfo;

			return 5000; // TODO - come up with a more precise estimation method
		}

		function checkIfTileIsStored(layer,level,row,col)
		{
			/* TODO */
		}

		function updateTileSizeEstimation()
		{
			console.log('updating');
			var zoomLevel = map.getLevel();
			dojo.byId('currentLevel').value = zoomLevel;

			var minLevel = parseInt(dojo.byId('minLevel').value);
			var maxLevel = parseInt(dojo.byId('maxLevel').value);

			var basemapLayer = map.getLayer( map.layerIds[0] );
			var tileSize = estimateTileSize(basemapLayer);

			var tiling_scheme = new TilingScheme(basemapLayer,geometry);

			domConstruct.empty('tile-count-table-body');

			var totalEstimation = { tileCount:0, sizeBytes:0}
			
			for(var level=minLevel; level<=maxLevel; level++)
			{
				/*
				if( level > 10 )
				{
					console.log("algo raro...");
					break;
				}
				*/
					
				console.log("estimating tiles for level", level);
				var cell_ids = tiling_scheme.getAllCellIdsInExtent(map.extent,level);

				if( level == zoomLevel)
				{
					graphics.clear();
					cell_ids.forEach(function(cell_id)
					{
						var polygon = tiling_scheme.getCellPolygonFromCellId(cell_id, level);
						var graphic = new Graphic(polygon, symbol);
						graphics.add(graphic);
					});
				}


				var levelEstimation = { 
					level: level,
					scale: '-',
					tileCount: cell_ids.length,
					sizeBytes: cell_ids.length * tileSize
				}

				totalEstimation.tileCount += levelEstimation.tileCount;
				totalEstimation.sizeBytes += levelEstimation.sizeBytes;

				if( levelEstimation.tileCount > 1)
				{
					var rowContent = [levelEstimation.level, levelEstimation.scale, levelEstimation.tileCount, Math.floor(levelEstimation.sizeBytes / 1024 / 1024 * 100) / 100 + " Mb"]
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

			rowContent = ["Total", "-", totalEstimation.tileCount, Math.floor(totalEstimation.sizeBytes / 1024 / 1024 * 100)/100 + " Mb"];
			rowContent = "<td><b>" + rowContent.join("</b></td><td><b>") + "</b></td>";
			tr = domConstruct.place("<tr>", dojo.byId('tile-count-table-body'),'last')
			domConstruct.place(rowContent, tr,'last');			 
		}

		function prepareForOffline()
		{
			/* create list of tiles to store */
			var minLevel = parseInt(dojo.byId('minLevel').value);
			var maxLevel = parseInt(dojo.byId('maxLevel').value);
			var basemapLayer = map.getLayer( map.layerIds[0] );
			var tiling_scheme = new TilingScheme(basemapLayer,geometry);
			var cells = [];

			for(var level=minLevel; level<=maxLevel; level++)
			{
				var level_cell_ids = tiling_scheme.getAllCellIdsInExtent(map.extent,level);

				level_cell_ids.forEach(function(cell_id)
				{
					var url = basemapLayer.getTileUrl(level,cell_id[1],cell_id[0]);
					cells.push(url);
				});

				if( cells.length > 5000 && level != maxLevel)
				{
					console.log("me planto!");
					break;
				}
			}

			/* put UI in downloading mode */
			cancelRequested = false;
			reportProgress(0,cells.length);
			esri.hide(dojo.byId('ready-to-download-ui'));
			esri.show(dojo.byId('downloading-ui'));

			/* launch tile download */
			downloadTile(0, cells);

			/* register events to report to user */

		}

		function downloadTile(i,cells)
		{
			var cell = cells[i];
			reportProgress(i, cells.length);

			setTimeout( function() 
			{
				console.log("downloading", cells[i]);
				if( cancelRequested )
					finishedDownloading(true);
				else if ( i == cells.length-1)
					finishedDownloading(false);
				else
					downloadTile(i+1, cells); 
			}, 1);
		}

		function reportProgress(countNow,countMax)
		{
			var pbar = query('#download-progress [role=progressbar]')[0];
			var percent = countMax? (countNow / countMax * 100) : 0;
			pbar.style.width = percent+"%";
		}

		function cancel()
		{
			cancelRequested = true;
		}

		function finishedDownloading(cancelled)
		{
			setTimeout(function()
			{				
				esri.show(dojo.byId('ready-to-download-ui'));
				esri.hide(dojo.byId('downloading-ui'));
			}, 1000);
		}
	});
