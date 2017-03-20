How to use the tiles library
============================

## `tiles` library

The `tiles` library allows a developer to extend a tiled layer with offline support.

There are two primary approaches to using this set of libraries. The first approaches is for intermittent offline use cases where you only expect occasional and temporary internet outages and you don't need to worry about restarting the application while offline. The first approach works with both an `ArcGISTiledMapServiceLayer` and ArcGIS.com Web maps.

The second approach is if you need to be able to restart or reload your application offline and only works with `ArcGISTiledMapServiceLayer`.  *You must use this approach if your tiled layer uses token-based security.*

For detecting whether the browser is online, offline or listen for connection changes we recommend the [Offline.js](http://github.hubspot.com/offline/docs/welcome/) library.

You should also be aware that there are storage limitations imposed by the browser and the device operating system. There is a brief discussion on this at the bottom of the document.


## Approach 1 - ArcGIS.com or tiled Map

Approach #1 is for intermittent offline use cases and it uses the `offline-tiles-basic-min.js` library. This approach will not allow you to reload or restart the application while offline. The `tiles-indexed-db.html` sample is a working example of how to implement offline patterns and practices with an ArcGIS.com Web map.

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
**Step 2** Create the map using either _new Map()_ or using _esriUtils.createMap(webmapid,...)_. Once it has loaded then extend the basemap layer with the offline functionality. If you are using the `Map()` method you need to wait until the `load` event has fired. If you are using a Web map and the `createMap()` method to load an ArcGIS.com Web map it passes a `deferred` and you can run the following code in the `then` method:  

```js
	var basemapLayer = map.getLayer( map.layerIds[0] );
	var offlineTilesBasic = new O.esri.Tiles.OfflineTilesBasic();
	offlineTilesBasic.extend(basemapLayer, function(success)
	{
		if(success)	{
			// Now we can use offline functionality on this layer 
		} else {
			alert('indexed db is not supported in this browser');
		}
	});
```
**Step 3** This will enable new offline methods on the layer to prepare for offline mode while still online:

#### basemap.prepareForOffline(minLevel,maxLevel,extent,reportProgress)

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

#### basemap.goOnline()
This method puts the layer in online mode. When in online mode, the layer will behave as regular layers, fetching all tiles from the remote server. If there is no internet connectivity the tiles may appear thanks to the browsers cache, but no attempt will be made to look up tiles in the local database.

#### basemap.goOffline()
This method puts the layer in offline mode. When in offline mode, the layer will not fetch any tile from the remote server. It will look up the tiles in the IndexedDB database and display them in the layer. If the tile can't be found in the local database it will show up blank (even if there is actual connectivity). The pair of methods `goOffline()` and `goOnline()` allows the developer to manually control the behaviour of the layer. Used in conjunction with the offline dectection library, you can put the layer in the appropriate mode when the internet condition changes.

#### basemap.deleteAllTiles(callback)
Deletes all tiles stored in the indexed db database.
The callback is called to indicate success (true) or failure (false,err)

#### basemap.getOfflineUsage(callback)
It calculates the number of tiles that are stored in the indexed db database and the space used by them. Because the library uses compression, the database size will be significantly smaller than the downloaded tiles size. The callback is called with an object containing the result of this calculation:

```js
	{
		tileCount: /* count of tiles */
		size: /* total size of tiles */	
	}
```
#### basemap.getTilePolygons(callback)
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
#### basemap.getLevelEstimation(extent, level, tileSize)
Returns an object that contains the number of tiles that would need to be downloaded for the specified extent and zoom level, and the estimated byte size of such tiles. This method is useful to give the user an indication of the required time and space before launching the actual download operation:

```js
	{
		level: /* level number */
		tileCount: /* count of tiles */
		sizeBytes: /* total size of tiles */	
	}
	
**NOTE**: The byte size estimation is very rough.
```

## Approach #2 - Tiled Map Services (Full Offline)

This approach is best if you have requirements for restarting or reloading your browser application while offline. For this approach use the `offline-tiles-advanced-min.js` library. This library extends TileMapServiceLayer and you can use it with any Esri tiled basemap layer. You will not be able to use an ArcGIS.com Web map for this approach.

**NOTE:** This approach requires the use of an [Application Cache](https://developer.mozilla.org/en-US/docs/Web/HTML/Using_the_application_cache) to store the application's HTML, CSS, and JavaScript. See the `appcache-tiles.html` sample for a working example of how to configure an application for this scenario. 

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

**Step 2** Create a new instance of `OfflineTileAdvanced`. Note, when you instantiate the `Map` leave off the `basemap` property because we are adding a customer tile layer as our basemap. `OfflineTileAdvanced` has four parameters in the [constructor](https://github.com/Esri/offline-editor-js/blob/master/doc/offlinetilesadvanced.md#constructor). The first is the REST endpoint of the basemap you want to use, the second is the callback, the third is a state property to preset the layer as online or offline, and the fourth is an optional parameter to set a custom object store. This will help with with drawing tiles correctly during offline restarts or reloads.

IMPORTANT: If you are trying to use a non-CORS-enabled Feature Service you will need to explicity declare your `proxyPath`. We've set `proxyPath` to `null` here just as an illustration, but it's not required.

```js

    tileLayer = new O.esri.Tiles.OfflineTilesAdvanced("http://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer",function(evt){
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

All map events will continue to work normally. Although some methods that are typically available will now have to be accessed through `OfflineTilesAdvanced` such as `getLevel()`, `getMaxZoom()`, and `getMinZoom()`.

To get the current extent you will need to monitor the `zoom-end` and `pan-end` events like this:

```js


    map.on("zoom-end",function(evt){
        _currentExtent = evt.extent;
    });

    map.on("pan-end",function(evt){
       _currentExtent = evt.extent;
    });

```

## Specifying a custom database, dataStore name, and Offline Tiles Id Manager name

Both `OfflineTilesAdvanced` and `OfflineTilesBasic` have an optional property that allows you to specify your own database name, dataStore name, and offline tile ID manager name.

For OfflineTilesBasic you can use the following pattern within the `extend()` method:

```js

    var dbConfig = {
        dbName : "TILES_TEST",
        objectStoreName : "TILES"
    }
    
	offlineTilesBasic.extend(basemapLayer, function(success)
	{
		if(success)	{
			// Now we can use offline functionality on this layer 
		} else {
			alert('indexed db is not supported in this browser');
		}
	}, true /* online */, dbConfig );

```

For OfflineTilesAdvanced use this pattern in the constructor.  Note that the Advanced approach also supports token-based security, so an optional ```offlineIdManager``` can also be specified.

```js

    var dbConfig = {
        dbName : "TILES_TEST",
        objectStoreName : "TILES",
        offlineIdManager: "TILES_ID_MANAGER"
    }

    tileLayer = new O.esri.Tiles.OfflineTilesAdvanced("http://xyz",function(evt){
		. . .
		. . .
    }, true /* online */, dbConfig);

```

## Setting the online state property

In the constructor for `OfflineTilesAdvanced` and in the `extend()` method for `OfflineTilesBasic` is a `state` property. This always defaults to `true`. It's important because it allows you to tell the library at runtime whether the application is online (true) or offline (false) so that the library initializes correctly. 

## Working with secure tile services

If you are using a secure tiled map service then you'll need to use the `OfflineTilesAdvanced` library. There isn't anything special you need to do, the library should automatically recognize you are using a secure service and it will trigger `esri/IdentityManager` if it cannot find valid credentials.

The library manually stores credential information using the following localStorage pattern: ```window.localStorage[offlineIdManager```.  If you do not specify the ```offlineIdManager``` parameter in the ```dbConfig``` constructor parameter, a default value of `window.localStorage.offline_id_manager` will be assigned.

If you are using an optimized version of the ArcGIS API for JavaScript make sure you include the `esri/IdentityManager` module.

## Browser storage limitations

Our general guideline for the amount of total storage you can use on a device is be between 50MBs and 100MBs. If you need greater storage than that you'll need to either switch to a hybrid model (e.g. PhoneGap) or use one of our native ArcGIS Runtime SDKs. The Runtime SDKs have fully supported and robust offline capabilities that go beyond what JavaScript is currently capable of.

The library helps where it can by providing 2.7x compression of the tile imagery and about 50% compression of the tile URLs. 

Some developers have mentioned that they have stored alot more than 100MBs. How much you can store varies between devices and browsers. Every mobile operating system sets a limit on how much memory a single application can use. Since web apps are dependant on the browser, which is a web app, if it consumes too much memory the operating system will simply kill the browser. Poof and it's gone. So, web apps are dependant on a variety of things including how many other browser tabs are open, browser memory leakage especially if it's been running for a long time, other storage being used such as feature edits, the application cache and the general browser cache.
