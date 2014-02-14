offline-editor-js
=================

JavaScript toolkit for using the ArcGIS API for JavaScript offline. It manages both editing and tiles in an offline mode. It's still a work-in-progress so if you have suggestions open an issue or if you want to make a pull request we welcome your proposed modifications. 

This repo contains two sets of libraries:

- `/edit`: handles vector features and stores adds, updates and deletes while offline. Resync's edits with server once connection is reestablished
   * `offlineFeaturesManager` - Extends and overrides a feature layer.
   * `editsStore` - Provides static helper methods for working with the offline data store.
- `/tiles`: stores portions of tiled maps client-side and uses the cached tiles when device is offline
   * `offlineEnabler` Extends and overrides a tiled map service.

##Workflows Supported (v1)
The following workflow is currently supported for both both features and tiles:

1) Load web application while online.
 
2) Once all tiles and features are loaded then place application offline. This can be done manually within the code.

3) Make edits while offline.

4) Return online when you want to resync edits.



##offlineFeaturesManager
Extends and overrides a feature layer.

###Constructor
Constructor | Description
--- | ---
`new offlineFeaturesManager()` | Extends a feature layer and overrides `applyEdits()`.

###ENUMs
Property | Description
--- | ---
ONLINE | "online"
OFFLINE | "offline"
RECONNECTING | "reconnecting"

###Methods
Methods | Returns | Description
--- | --- | ---
`extend()`|nothing|Overrides a feature layer.
`goOffline()` | nothing | Forces library into an offline state. Any edits applied during this condition will be stored locally.
`goOnline(callback)` | `callback( boolean, errors )` | Forces library to return to an online state. If there are pending edits, an attempt will be made to sync them with the remote feature server. 
`getOnlineStatus()` | `ONLINE` or `OFFLINE` | Determines if offline or online condition exists.
`optimizeEditsQueue()` | nothing | Runs various checks on the edits queue to help ensure data integrity.
`replayStoredEdits(callback)` | `callback(boolean, {}`) | Internal method called by `goOnline`. If there are pending edits this method attempts to sync them with the remote feature server.
`getReadableEdit()` | String | A string value representing human readable information on pending edits.

###Events
Event | Value | Description
--- | --- | ---
EDITS_SENT |  'edits-sent' | When any edit is actually sent to the server.
EDITS_ENQUEUED | 'edits-enqueued' | When an edit is enqueued and not sent to the server.
ALL_EDITS_SENT | 'all-edits-sent' | After going online and there are no pending edits remaining in the queue.

###FeatureLayer Overrides

Methods | Returns | Description
--- | --- | ---
`applyEdits(adds, updates, deletes, callback, errback)` | `deferred`| `adds` creates a new edit entry. `updates` modifies an existing entry. `deletes` removes an existing entry. `callback` called when the edit operation is complete.

##editsStore

Provides a number of public static methods for use within your application. These methods don't require a `new` statement or a constructor. After the module has been included in your application you can access these methods directly for example: `editsStore.getEditsStoreSizeBytes();`. `editsStore` is also used internally by the `offlineFeaturesManager` library.

###Methods
Methods | Returns | Description
--- | --- | ---
`isSupported()` | boolean | Determines if local storage is available. If it is not available then the storage cache will not work. It's a best practice to verify this before attempting to write to the local cache.
`hasPendingEdits()` | String | Determines if there are any queued edits in the local cache. If there are then the edits are returned as a String and if not then an empty string will be returned.
`pendingEditsCount()` | int | The total number of edits that are queued in the local cache.
`getEditsStoreSizeBytes()` | Number | Returns the total size of all pending edits in bytes.
`getLocalStorageSizeBytes()` | Number | Returns the total size of all items in bytes for local storage cached using the current domain name. 

 
##offlineEnabler
Extends and overrides a tiled map service.

###Methods
Methods | Returns | Description
--- | --- | ---
`extend(layer, callback)`|`callback(boolean, string)` |Overrides an ArcGISTiledMapServiceLayer.

###ArcGISTiledMapServiceLayer Overrides

Methods | Returns | Description
--- | --- | ---
`getTileUrl(level, row, col)` | Url | Retrieves tiles as requested by the ArcGIS API for JavaScript. If a tile is in cache it is returned. If it is not in cache then one is retrieved over the internet. 
`getLevelEstimation(extent,` `level, tileSize)` | {level, tileCount, sizeBytes} | Returns an object that contains the number of tiles that would need to be downloaded for the specified extent and zoom level, and the estimated byte size of such tiles. This method is useful to give the user an indication of the required time and space before launching the actual download operation. The byte size estimation is very rough.
`goOffline()` | nothing | This method puts the layer in offline mode. When in offline mode, the layer will not fetch any tile from the remote server. It will look up the tiles in the indexed db database and display them in the layer. If the tile can't be found in the local database it will show up blank (even if there is actual connectivity). The pair of methods `goOffline()` and `goOnline() `allows the developer to manually control the behaviour of the layer. Used in conjunction with the offline dectection library, you can put the layer in the appropriate mode when the offline condition changes.
`goOnline(callback)` | `callback (boolean, errors)` | This method puts the layer in online mode. When in online mode, the layer will behave as regular layers, fetching all tiles from the remote server. If there is no internet connectivity the tiles may appear thanks to the browsers cache, but no attempt will be made to look up tiles in the local database.
`deleteAllTiles(callback)` | `callback(boolean, errors)` | Clears the local cache of tiles.
`getOfflineUsage(callback)` | `callback(size, error)` | Gets the size in bytes of the local tile cache.
`getTilePolygons(callback)` | `callback(polygon, error)` | Gets polygons representing all cached cell ids within a particular zoom level and bounded by an extent.
`saveToFile( filename, callback)` | `callback( boolean, error)` | Saves tile cache into a portable csv format.
`loadFromFile( filename, callback)` | `callback( boolean, error)` | Reads a csv file into local tile cache.
`estimateTileSize(callback)` | `callback(number)` | Retrieves one tile from a layer and then returns its size.
`prepareForOffline(minLevel,`  `maxLevel, extent,  reportProgress)`  | `callback(number)` | Retrieves tiles and stores them in the local cache.


##`tiles` library


The `tiles` library allows a developer to extend a tiled layer with offline support.

**Step 1** Configure paths for dojo loader to find the tiles and vendor modules (you need to set paths relative to the location of your html document), before loading ArcGIS JavaScript API

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



**Step 2** Include the `tiles/offlineEnabler` library in your app.

	require([
		"esri/map", 
		"tiles/offlineEnabler"], 
		function(Map,offlineEnabler)
	{
		...
	});

**Step 3** Once your map is created (either using new Map() or using esriUtils.createMap(webmapid,...), you extend the basemap layer with the offline functionality

	var basemapLayer = map.getLayer( map.layerIds[0] );
	offlineEnabler.extend(basemapLayer,function(success)
	{
		if(success)	{
			// Now we can use offline functionality on this layer 
		} else {
			alert('indexed db is not supported in this browser);
		}
	});

**Step 4** Use the new offline methods on the layer to prepare for offline mode while still online:

####basemap.getLevelEstimation(extent,level)
Returns an object that contains the number of tiles that would need to be downloaded for the specified extent and zoom level, and the estimated byte size of such tiles. This method is useful to give the user an indication of the required time and space before launching the actual download operation:

	{
		level: /* level number */
		tileCount: /* count of tiles */
		sizeBytes: /* total size of tiles */	
	}
	
**NOTE**: The byte size estimation is very rough.

####basemap.prepareForOffline(minLevel,maxLevel,reportProgress,finishedDownloading)

* Integer	minLevel
* Integer	maxLevel
* Extent	extent
* callback	reportProgress(Object progress)
* callback	finishedDownloading(Boolean cancelled)

This method starts the process of downloading and storing in local storage all tiles within the specified extent. 
For e

####basemap.prepareForOffline(minLevel,maxLevel,reportProgress,finishedDownloading)

* Integer	minLevel
* Integer	maxLevel
* Extent	extent
* callback	reportProgress(Object progress)
* callback	finishedDownloading(Boolean cancelled)

This method starts the process of downloading and storing in local storage all tiles within the specified extent. 
For each downloaded tile it will call the reportProgress() callback. It will pass an object with the following fields

	{
		countNow: /* current count of downloaded tiles */
		countMax: /* number of total tiles that need to be downloaded */
		error: /* if some error has happened, it contains an error object with cell and msg fields, otherwise it is undefined */
	} 

The reportProgress() callback function should return `true` if the download operation should be cancelled or `false` if it can go on.
	
Once all tiles have been downloaded, it will call the finishedDownloading() callback, passing `true` if the operation was cancelled without finishing or `true` if it was completed.


####basemap.deleteAllTiles(callback)
Deletes all tiles stored in the indexed db database.
The callback is called to indicate success (true) or failure (false,err)


####basemap.getOfflineUsage(callback)
It calculates the number of tiles that are stored in the indexed db database and the space used by them. The callback is called with an object containing the result of this calculation:

	{
		tileCount: /* count of tiles */
		size: /* total size of tiles */	
	}

####basemap.getTilePolygons(callback)
It calculates the geographic boundary of each of the tiles stored in the indexed db. This method calls the callback once for each tile, passing an esri/geometry/Polygon that can be added to a GraphicsLayer. This method is useful to show graphically which tiles are stored in the local database, like this:

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

##`edit` library

The `edit` library allows a developer to extend a feature layer with offline editing support.

**Step 1** Include `offline.min.js` and `tiles/offlineEnabler` in your app.
	
	<script src="../vendor/offline/offline.min.js"></script>
	<script>
	require([
		"esri/map", 
		"edit/offlineFeaturesManager",
	    "edit/editsStore", 
		function(Map,offlineFeaturesManager,editsStore)
	{
		...
	});

**Step 2** Once your map is created (either using new Map() or using esriUtils.createMap(webmapid,...), you create a new OfflineFeaturesManager and starting assigning events listeners to tie the library into your user interface:

		var offlineFeaturesManager = new OfflineFeaturesManager();
		offlineFeaturesManager.on(offlineFeaturesManager.events.EDITS_ENQUEUED, updateStatus);
		offlineFeaturesManager.on(offlineFeaturesManager.events.EDITS_SENT, updateStatus);
		offlineFeaturesManager.on(offlineFeaturesManager.events.ALL_EDITS_SENT, updateStatus);
		
**Step 3** Listener for the `layers-add-result` event. Create an array of FeatureLayers and add them to the map.

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

**Step 4** After the `layers-add-result` event fires, iterate thru each layer and extend it using the `extend()` method:

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
		}			``
**Step 5** Use the new offline methods on the layer to prepare for offline mode while still online. Here are a few examples that include code snippets of how to take advantage of some of the libraries methods. You can use a combination of methods from `editsStore` and `offlineFeaturesManager`.

####offlineFeaturesManager.goOffline()
Force the library to go offline. Once this condition is set, then any offline edits will be cached locally.

		function goOffline()
		{
			offlineFeaturesManager.goOffline();
			//TO-DO
		}

####offlineFeaturesManager.goOnline()
Force the library to return to an online condition. If there are pending edits, the library will attempt to sync them.

		function goOnline()
		{			
			offlineFeaturesManager.goOnline(function()
			{
				//Modify user inteface depending on success/failure
			});
		}

####offlineFeaturesManager.getOnlineStatus()
Within your application you can manually check online status and then update your user interface. By using a switch/case statement you can check against three enums that indicate if the library thinks it is offline, online or in the process of reconnecting.
		
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
		

####editsStore.hasPendingEdits()
You can check if there are any edits pending. If there are then iterate `editsStore._retrieveEditsQueue()` and then convert the edits to a readable format via `offlineFeaturesManager.getReadableEdit(edit)`. 		

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

##Setup Instructions

1. [Fork and clone the repo.](https://help.github.com/articles/fork-a-repo)
2. After cloning from github, `cd` into the `offline-editor-js` folder
3. Run `git submodule init` and `git submodule update`
4. Examples in the `/samples` folder should work now.

##Dependencies

* ArcGIS API for JavaScript (v3.7+)
* NOTE: browser limitations and technical dependencies. The offline capabilities in this toolkit depend on the following (psuedo-persistent ) HTML5 capabilities being present in the browser:
	* localStorage. The limits vary by browser and is typically 5MBs per domain name. For additional information see W3C's webstorage specification, [Section 5](http://www.w3.org/TR/webstorage/).
	* indexedDB. Storage limits for indexedDB are not necessarily consistent across browsers. It's generally understood to be 50MB. Here is a Mozilla [document](https://developer.mozilla.org/en-US/docs/IndexedDB#Storage_limits) discussing limits across different browsers. 
	* Advanced users of the library should be aware that JavaScript stores strings as UTF-16. More information can be found in this Mozilla [article](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/length).
	* If a user completely flushes their browser cache all queued edits and tiles will most likely be lost.
	* The data should persist if the browser is shutdown and restarted.

* Sub-mobiles (see `/vendor` directory)

   * [offline.js](https://github.com/hubspot/offline) - it allows detection of the online/offline condition and provides events to hook callbacks on when this condition changes
   * [bootstrap-map](https://github.com/Esri/bootstrap-map-js.git) - UI creation using bootstrap and ArcGIS maps (used in samples)
   * [IndexedDBShim](https://github.com/axemclion/IndexedDBShim) - polyfill to simulate indexed db functionality in browsers/platforms where it is not supported (notably iOS Safari, PhoneGap, Android Chrome)
   * [jasmine.async](https://github.com/derickbailey/jasmine.async.git) - library to help implementing tests of async functionality (used in tests)


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


