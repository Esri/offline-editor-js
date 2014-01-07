offline-editor-js
=================

Experimental JavaScript library that auto-detects an offline condition and stores FeatureLayer edit activities until a connection is reestablished. Works with adds, updates and deletes.

Includes several libraries (in the `lib` directory):

- `edit`: handles vector features, allows editing while offline and sending edits to server once connection is restablished
- `tiles`: allows to store portions of tiled maps client-side and use the cached tiles when device is offline

##How to use?

The easiest approach is to simply use the library to override applyEdits():

**Step 1.** The library provides a constructor that can simply be used in place of the traditional applyEdit() method. It does all the rest of the work for you:

	var offlineStore = new OfflineStore(map);
	offlineStore.applyEdits(graphic,layer,"delete");
	
**Step 2.** Run your mapping app while online to download all the maps and feature layers to the browser.

**Step 3.** To operate the app offline, try using Firefox's built-in, offline functionality since it seems to work very well. Set offline mode as shown in this screenshot:

![] (firefox_offline_mode.png)
	
While the library works in Chrome, Firefox and Safari with the internet turned off, at this time it has only been extensively tested truly offline with Firefox. With those other browsers it meets the use case of handling edits during intermittent internet scenarios. There are other third party applications for Chrome, for example, that supposedly allow full offline browsing but I haven't been tested them yet. 	
		
##Features

* Override the applyEdits() method.
* Automatic offline/online detection. Once an offline condition exists the library starts storing the edits. And, as soon as it reconnects it will submit the updates.
* Can store dozens or hundreds of edits.
* Currently works with Points, Polylines and Polygons.
* Indexes edits for successful/unsuccessful update validation as well as for more advanced workflows.
* Monitors available storage and is configured by default to stop edits at a maximum threshold and alert that the threshold has been reached. This is intended to help prevent data loss.
* Can store base map tiles for offline pan and zoom.

##`edit` Library

####OfflineStore(/\* Map \*/ map)
* Constructor. Requires a reference to an ArcGIS API for JavaScript Map.

####applyEdits(/\* Graphic \*/ graphic,/\* FeatureLayer \*/ layer, /\* String \*/ enumValue)
* Method. Overrides FeatureLayer.applyEdits().

####getStore()
* Returns an array of Graphics from localStorage.

####getLocalStoreIndex()
* Returns the index as an array of JSON objects. An internal index is used to keep track of adds, deletes and updates. The objects are constructed like this:
	
		{"id": object610,"type":"add","success":"true"}

####getLocalStorageUsed()
* Returns the total storage used for the applications domain in MBs.

####enum()
* Constant. Provides an immutable reference value for "add","update" and "delete". Example usage:

		offlineStore.enum().UPDATE



####verticesObject(/\* Graphic \*/ graphic, /\* FeatureLayer \*/ layer)
* Helper method for use with vertices editing. Example usage:

		editToolbar.on("deactivate", function(evt) {
            if(updateFlag == true){
                offlineStore.applyEdits(
                   vertices.graphic,vertices.layer,offlineStore.enum().UPDATE);
                updateFlag = false;
            }
            else{
                offlineStore.applyEdits(
                   evt.graphic,currentLayer,offlineStore.enum().UPDATE);
            }
        }


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
		...	});

**Step 3** Once your map is created (either using new Map() or using esriUtils.createMap(webmapid,...), you extend the basemap layer with the offline functionality

	var basemapLayer = map.getLayer( map.layerIds[0] );
	offlineEnabler.extend(basemapLayer,function(success)
	{
		if(success)	{
			/* now we can use offline functionality on this layer */		} else {
			alert('indexed db is not supported in this browser);		}
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
	
####basemap.goOffline()
This method puts the layer in offline mode. When in offline mode, the layer will not fetch any tile from the remote server. It will look up the tiles in the indexed db database and display them in the layer. If the tile can't be found in the local database it will show up blank (even if there is actual connectivity)

####basemap.goOnline()
This method puts the layer in online mode. When in online mode, the layer will behave as regular layers, fetching all tiles from the remote server. If there is no internet connectivity the tiles may appear thanks to the browsers cache, but no attempt will be made to look up tiles in the local database.

**NOTE**: The pair of methods goOffline() and goOnline() allows the developer to manually control the behaviour of the layer. Used in conjunction with the offline dectection library, you can put the layer in the appropriate mode when the offline condition changes.

##Testing
Open Jasmine's `SpecRunner.edit.html` and `SpecRunner.tiles.html` in a browser. You can find them in the `/test` directory.

##Dependencies
Online dependencies:

* ArcGIS API for JavaScript (tested with v3.7)

Dependencies included in the `vendor` directory as git submodules

* [offline.js](https://github.com/hubspot/offline) - it allows detection of the online/offline condition and provides events to hook callbacks on when this condition changes
* [bootstrap-map](https://github.com/Esri/bootstrap-map-js.git) - UI creation using bootstrap and ArcGIS maps (used in samples)
* [IndexedDBShim](https://github.com/axemclion/IndexedDBShim) - polyfill to simulate indexed db functionality in browsers/platforms where it is not supported (notably iOS Safari, PhoneGap, Android Chrome)
* [jasmine.async](https://github.com/derickbailey/jasmine.async.git) - library to help implementing tests of async functionality (used in tests)

__NOTE__: Once you clone the repo, you need to do "git submodule init" and "git submodule update" to get the exact same version of submodules that this project has been developed and tested against.

## Resources

* [ArcGIS Developers](http://developers.arcgis.com)
* [ArcGIS REST Services](http://resources.arcgis.com/en/help/arcgis-rest-api/)
* [twitter@esri](http://twitter.com/esri)

## Issues

Find a bug or want to request a new feature?  Please let us know by submitting an [issue](https://github.com/Esri/offline-editor-js/issues?state=open).

## Contributing

Anyone and everyone is welcome to contribute. Please see our [guidelines for contributing](https://github.com/esri/contributing).


## Licensing
Copyright 2013 Esri

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


