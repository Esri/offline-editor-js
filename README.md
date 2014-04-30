offline-editor-js
=================

A prototype JavaScript toolkit for using the ArcGIS API for JavaScript offline. It manages both editing and tiles in an offline mode. It's still a work-in-progress so if you have suggestions open an issue or if you want to make a pull request we welcome your proposed modifications. 

*IMPORTANT:* If you want a full, robust offline solution then you should be using our ArcGIS Runtime SDKs for .NET, WPF, Java, iOS, Android and Qt.

This repo contains the following libraries:

- `/edit`: handles vector features and stores adds, updates and deletes while offline. Resync's edits with server once connection is reestablished
   * `offlineFeaturesManager` - Extends and overrides a feature layer.
   * `editsStore` - Provides static helper methods for working with the offline data store.
- `/tiles`: stores portions of tiled maps client-side and uses the cached tiles when device is offline
   * `offlineTilesEnabler` Extends and overrides a tiled map service.
- `/utils`: contains various helper libraries.
- `/samples`: sample apps to show how to use different aspects of the offline library capabilities.

#Workflows Supported (v1)
The following workflow is currently supported for both both features and tiles:

1) Load web application while online.
 
2) Once all tiles and features are loaded then programmatically take application offline. 

3) Make edits while offline.

4) Return online when you want to resync edits.

Using an [application manifest](https://developer.mozilla.org/en-US/docs/HTML/Using_the_application_cache) allows you to reload and restart the application while offline. The application manifest let's you store .html, .js, .css and image files locally.

__Attachment Support__: Attachments are supported with some limitations. See documentation [here](./doc/attachments.md)


#API Doc



##offlineFeaturesManager
Extends and overrides a feature layer. This library allows you to extend esri.layers.FeatureLayer objects with offline capability and manage the resync process.

* __Click [here](doc/offlinefeaturesmanager.md) to see the full API doc for offlineFeaturesManager__

 
##offlineTilesEnabler
Extends and overrides a tiled map service. Provides the ability to customize the extent used to cut the tiles. See the detailed description of basemap.prepareForOffline() in the "How To Use" section below to learn different options.

* __Click [here](doc/offlinetilesenabler.md) to see the full API doc for offlineTilesEnabler__

#How to use

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

##`edit` library

The `edit` library allows a developer to extend a feature layer with offline editing support.

**Step 1** Include `offline.min.js`, `tiles/offlineTilesEnabler` and `tiles/editsStore` in your app.

```html	
	<script src="../vendor/offline/offline.min.js"></script>
	<script>
	require([
		"esri/map", 
		"edit/offlineFeaturesManager",
	    "edit/editsStore", 
		function(Map,OfflineFeaturesManager,editsStore)
	{
		...
	});
```
**Step 2** Once your map is created (either using new Map() or using esriUtils.createMap(webmapid,...), you create a new OfflineFeaturesManager instance and starting assigning events listeners to tie the library into your user interface:

```js
		var offlineFeaturesManager = new OfflineFeaturesManager();
		offlineFeaturesManager.on(offlineFeaturesManager.events.EDITS_ENQUEUED, updateStatus);
		offlineFeaturesManager.on(offlineFeaturesManager.events.EDITS_SENT, updateStatus);
		offlineFeaturesManager.on(offlineFeaturesManager.events.ALL_EDITS_SENT, updateStatus);
```		

**Step 3** Create an array of FeatureLayers and add them to the map, and listen for the `layers-add-result` event to continue FeatureLayer and editor widgets initialization

```js
	map.on('layers-add-result', initEditor);
	
	var fsUrl = "http://services2.arcgis.com/CQWCKwrSm5dkM28A/arcgis/rest/services/Military/FeatureServer/";
		// var layersIds = [0,1,2,3,4,5,6];
		var layersIds = [1,2,3];
		var featureLayers = [];

		layersIds.forEach(function(layerId)
		{
			var layer = new FeatureLayer(fsUrl + layerId, {
				mode: FeatureLayer.MODE_SNAPSHOT,
				outFields: ['*']
			});
			featureLayers.push(layer);			
		})

		map.addLayers(featureLayers);
```

**Step 4** After the `layers-add-result` event fires, iterate thru each layer and extend it using the `extend()` method:

```js
		function initEditor(evt)
		{
			try {
				/* extend layer with offline detection functionality */
				evt.layers.forEach(function(result)
				{
					var layer = result.layer;
					offlineFeaturesManager.extend(layer);
					layer.on('update-end', logCurrentObjectIds);
				});
			catch(err){
			 	. . .
			}		
		}			
```
**Step 5** Use the new offline methods on the layer to prepare for offline mode while still online. Here are a few examples that include code snippets of how to take advantage of some of the libraries methods. You can use a combination of methods from `editsStore` and `offlineFeaturesManager`.

####offlineFeaturesManager.goOffline()
Force the library to go offline. Once this condition is set, then any offline edits will be cached locally.

```js
		function goOffline()
		{
			offlineFeaturesManager.goOffline();
			//TO-DO
		}
```

####offlineFeaturesManager.goOnline()
Force the library to return to an online condition. If there are pending edits, the library will attempt to sync them.

```js
		function goOnline()
		{			
			offlineFeaturesManager.goOnline(function()
			{
				//Modify user inteface depending on success/failure
			});
		}
```

####offlineFeaturesManager.getOnlineStatus()
Within your application you can manually check online status and then update your user interface. By using a switch/case statement you can check against three enums that indicate if the library thinks it is offline, online or in the process of reconnecting.

```js		
			switch( offlineFeaturesManager.getOnlineStatus() )
			{
				case offlineFeaturesManager.OFFLINE:
					node.innerHTML = "<i class='fa fa-chain-broken'></i> offline";
					domClass.add(node, "offline");
					break;
				case offlineFeaturesManager.ONLINE:
					node.innerHTML = "<i class='fa fa-link'></i> online";
					domClass.add(node, "online");
					break;
				case offlineFeaturesManager.RECONNECTING:
					node.innerHTML = "<i class='fa fa-cog fa-spin'></i> reconnecting";
					domClass.add(node, "reconnecting");
					break;
			}
		
```

####editsStore.hasPendingEdits()
You can check if there are any edits pending. If there are then iterate `editsStore._retrieveEditsQueue()` and then convert the edits to a readable format via `offlineFeaturesManager.getReadableEdit(edit)`. 		
```js
			if( editsStore.hasPendingEdits())
			{
				var edits = editsStore._retrieveEditsQueue();
				edits.forEach(function(edit)
				{
					var readableEdit = offlineFeaturesManager.getReadableEdit(edit);
					//Update user interface to display readable edits
				},this);
			}
			else
			{
				//Tell user interface no edits are pending
			}
```

##Setup Instructions

1. [Fork and clone the repo.](https://help.github.com/articles/fork-a-repo)
2. After cloning from github, `cd` into the `offline-editor-js` folder
3. Run `git submodule init` and `git submodule update`
4. Examples in the `/samples` folder should work now.

##Dependencies

* ArcGIS API for JavaScript (v3.8+)
* NOTE: browser limitations and technical dependencies. The offline capabilities in this toolkit depend on psuedo-persistent HTML5 capabilities being present in the browser. Go [here](doc/dependencies.md) for a detailed breakdown of the information.

* Sub-modules (see `/vendor` directory)

   * [offline.js](https://github.com/hubspot/offline) - it allows detection of the online/offline condition and provides events to hook callbacks on when this condition changes
   * [IndexedDBShim](https://github.com/axemclion/IndexedDBShim) - polyfill to simulate indexed db functionality in browsers/platforms where it is not supported (notably iOS Safari, PhoneGap, Android Chrome)
   		- IMPORTANT: There is a know [issue](https://github.com/axemclion/IndexedDBShim/issues/115) with IndexedDBShim on Safari. The workaround is to switch from using /dist/IndexedDBShim.min.js to just using IndexedDBShim.js and then modify line #1467 to a more appropriate size that will meet all your storage needs, for example: ```var DEFAULT_DB_SIZE = 24 * 1024 * 1024```
   * [jasmine.async](https://github.com/derickbailey/jasmine.async.git) - library to help implementing tests of async functionality (used in tests)

* Non sub-module based library(s)
	* [FileSaver.js](https://github.com/Esri/offline-editor-js/blob/master/lib/tiles/README.md) - library to assist with uploading and downloading of files containing tile information.
	* [grunt-manifest](https://github.com/gunta/grunt-manifest) node.js library to assist with the creation of manifest files.

## Resources

* [ArcGIS Developers](http://developers.arcgis.com)
* [ArcGIS REST Services](http://resources.arcgis.com/en/help/arcgis-rest-api/)
* [twitter@esri](http://twitter.com/esri)

## Issues

Find a bug or want to request a new feature?  Please let us know by submitting an [issue](https://github.com/Esri/offline-editor-js/issues?state=open).

## Contributing

Anyone and everyone is welcome to contribute. Please see our [guidelines for contributing](https://github.com/esri/contributing).


## Licensing
Copyright 2014 Esri

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

   http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.

A copy of the license is available in the repository's [license.txt]( license.txt) file.

[](Esri Tags: ArcGIS Web Mapping Editing FeatureServices Offline)
[](Esri Language: JavaScript)


