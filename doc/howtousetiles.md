How to use the tiles library
============================

##`tiles` library

The `tiles` library allows a developer to extend a tiled layer with offline support.

There are two approaches to using this set of libraries. The first approach is if you are using an ArcGIS.com Web Map, and the second approach is if you need to be able to restart or reload your application offline.

You should also be aware that there are storage limitations imposed by the browser and the device operating system. 


## Approach 1 - ArcGIS.com Map

Approach #1 is best for partial offline use cases and it uses the `offline-tiles-basic-min.js` library. This approach will not allow you to reload or restart the application while offline.

**Step 1** Include the `offline-tiles-basic-min.js` library in your app.

```js
	require([
		"esri/map", 
		"..dist/offline-tiles-basic-min.js"], 
		function(Map)
	{
		...
	});
```
**Step 2** Once your map is created (either using _new Map()_ or using _esriUtils.createMap(webmapid,...)_, you extend the basemap layer with the offline functionality

```js
	var basemapLayer = map.getLayer( map.layerIds[0] );
	var offlineTilesEnabler = new O.esri.Tiles.OfflineTilesEnabler();
	offlineTilesEnabler.extend(basemapLayer, function(success)
	{
		if(success)	{
			// Now we can use offline functionality on this layer 
		} else {
			alert('indexed db is not supported in this browser');
		}
	});
```
**Step 3** Use the new offline methods on the layer to prepare for offline mode while still online:

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

## Approach #2 - Tiled Map Services

This approach is best if you have requirements for restarting or reloading your browser application while offline. For this approach use the `offline-tiles-advanced-min.js` library. This library extends TileMapServiceLayer and you can use it with any Esri tiled basemap layer.

**Step 1** Include the `offline-tiles-advanced-min.js` library in your app.

```js
	require([
		"esri/map", 
		"..dist/offline-tiles-advanced-min.js"], 
		function(Map)
	{
		...
	});
```

**Step 2** Create a new instance of `OfflineTilesEnablerLayer`. Note, when you instantiate the `Map` leave off the `basemap` property because we are adding a customer tile layer as our basemap. `OfflineTilesEnablerLayer` has three properties in the constructor. The first is the REST endpoint of the basemap you want to use, the second is the callback and the last is an optional parameter to preset the layer as online or offline. This will help with with drawing tiles correctly during offline restarts or reloads.

IMPORTANT: If you are trying to use a non-CORS-enabled Feature Service you will need to explicity declare your `proxyPath`. We've set `proxyPath` to `null` here just as an illustration. You don't need to do that since its default is `null`.

```js

    tileLayer = new O.esri.Tiles.OfflineTilesEnablerLayer("http://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer",function(evt){
        console.log("Tile Layer Loaded.");
        // All non-CORS-enabled Feature Services require a proxy.
        // You can set the property here if needed.
        tileLayer.offline.proxyPath = null;
    },_isOnline);

	// NOTE: When instantiating the Map, do not specify the basemap property!
    var map = new Map("map",{
        center: [-104.98,39.74], // long, lat
        zoom: 8,
        sliderStyle: "small"
    });

    map.addLayer(tileLayer);


```

All map events will continue to work normally. Although some methods that are typically available will now have to be accessed through OfflineTilesEnablerLayer such as `getLevel()`, `getMaxZoom()`, and `getMinZoom()`.

To get the current extent you will need to monitor the `zoom-end` and `pan-end` events like this:

```js


    map.on("zoom-end",function(evt){
        _currentExtent = evt.extent;
    });

    map.on("pan-end",function(evt){
       _currentExtent = evt.extent;
    });

```

## Browser storage limitations

Our general guideline for the amount of total storage you can use on a device is be between 50MBs and 100MBs. If you need greater storage than that you'll need to either switch to a hybrid model (e.g. PhoneGap) or use one of our native ArcGIS Runtime SDKs. The Runtime SDKs have fully supported and robust offline capabilities that go beyond what JavaScript is currently capable of.

Some developers have mentioned that they have stored alot more than 100MBs. How much you can store varies between devices and browsers. Every mobile operating system sets a limit on how much memory a single application can use. Since web apps are dependant on the browser, which is a web app, if it consumes too much memory the operating system will simply kill the browser. Poof and it's gone. So, web apps are dependant on a variety of things including how many other browser tabs are open, browser memory leakage especially if it's been running for a long time, other storage being used such as feature edits, the application cache and the general browser cache.
