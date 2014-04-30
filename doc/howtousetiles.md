How to use the tiles library
============================

##`tiles` library


The `tiles` library allows a developer to extend a tiled layer with offline support.

**Step 1** Configure paths for dojo loader to find the tiles and vendor modules (you need to set paths relative to the location of your html document), before loading ArcGIS JavaScript API

```html
	<script>
		// configure paths BEFORE loading arcgis or dojo libs
		var locationPath = location.pathname.replace(/\/[^/]+$/, "");
		var dojoConfig = {
			paths: { 
				tiles: locationPath  + "/../../lib/tiles",
				vendor: locationPath + "/../../vendor"
			}
		}
	</script>
	<script src="//js.arcgis.com/3.7compact"></script>

```

**Step 2** Include the `tiles/offlineTilesEnabler` library in your app.

```js
	require([
		"esri/map", 
		"tiles/offlineTilesEnabler"], 
		function(Map,OfflineTilesEnabler)
	{
		...
	});
```
**Step 3** Once your map is created (either using new Map() or using esriUtils.createMap(webmapid,...), you extend the basemap layer with the offline functionality

```js
	var basemapLayer = map.getLayer( map.layerIds[0] );
	var offlineTilesEnabler = new OfflineTilesEnabler();
	offlineTilesEnabler.extend(basemapLayer, function(success)
	{
		if(success)	{
			// Now we can use offline functionality on this layer 
		} else {
			alert('indexed db is not supported in this browser');
		}
	});
```
**Step 4** Use the new offline methods on the layer to prepare for offline mode while still online:

####basemap.getLevelEstimation(extent, level, tileSize)
Returns an object that contains the number of tiles that would need to be downloaded for the specified extent and zoom level, and the estimated byte size of such tiles. This method is useful to give the user an indication of the required time and space before launching the actual download operation:

```js
	{
		level: /* level number */
		tileCount: /* count of tiles */
		sizeBytes: /* total size of tiles */	
	}
	
**NOTE**: The byte size estimation is very rough.
```
####basemap.prepareForOffline(minLevel,maxLevel,extent,reportProgress)

* Integer	minLevel
* Integer	maxLevel
* Extent	extent
* callback	reportProgress(Object progress)

This method starts the process of downloading and storing in local storage all tiles within the specified extent. 

For each downloaded tile it will call the reportProgress() callback. It will pass an object with the following fields

```js
	{
		countNow: /* current count of downloaded tiles */
		countMax: /* number of total tiles that need to be downloaded */
		error: /* if some error has happened, it contains an error object with cell and msg fields, otherwise it is undefined */
		finishedDownloading: /* boolean that informs if this is the last cell */
		cancelRequested: /* boolean that informs if the operation has been cancelled at user's request */
	} 
```
**NOTE:** The reportProgress() callback function should return `true` if the download operation can be cancelled or `false` if it doesn't need to be.

You can also add a buffer around the view's extent:

```js
var minLevel = 0;
var maxLevel = 16;
var extent = someFeature.geometry.getExtent();
var buffer = 1500; /* approx meters (webmercator units) */
var newExtent = basmapLayer.getExtentBuffer(buffer,extent);
basemapLayer.prepareForOffline(minLevel, maxLevel, newExtent,
   lang.hitch(self,self.reportProgress));
```

####basemap.deleteAllTiles(callback)
Deletes all tiles stored in the indexed db database.
The callback is called to indicate success (true) or failure (false,err)

####basemap.getOfflineUsage(callback)
It calculates the number of tiles that are stored in the indexed db database and the space used by them. The callback is called with an object containing the result of this calculation:

```js
	{
		tileCount: /* count of tiles */
		size: /* total size of tiles */	
	}
```
####basemap.getTilePolygons(callback)
It calculates the geographic boundary of each of the tiles stored in the indexed db. This method calls the callback once for each tile, passing an esri/geometry/Polygon that can be added to a GraphicsLayer. This method is useful to show graphically which tiles are stored in the local database, like this:
```js
	graphics = new GraphicsLayer();
	map.addLayer( graphics );
	basemapLayer.getTilePolygons(function(polygon,err)
	{
		if(polygon) {
			var graphic = new Graphic(polygon, symbol);
			graphics.add(graphic);
		} else {
			console.log("showStoredTiles: ", err);
		}
	}
```
