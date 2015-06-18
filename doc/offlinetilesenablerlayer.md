API Doc for OfflineTileEnablerLayer
====================================

There are two different libraries for taking tiles offline: `offline-tiles-basic-min.js` and `offline-tiles-advanced-min.js`. The basic library is for use with ArcGIS.com web maps and partial/intermittently offline use cases. You won't be able to restart or reload your app when using this library offline.

If you have a requirement for restarting or reloading the app while offline then you should use the advanced library. The `offline-tiles-advanced-min.js` library lets you create a custom basemap layer that extends TiledMapServiceLayer. 

##O.esri.Tiles.OfflineTileEnablerLayer
The `offline-tiles-advanced-min.js` library provides the following tools for working with tiled map services. This library is designed for both partial and full offline use cases, and it will work if you have a requirement for browser reloads or restarts while offline.

###Constructor
Constructor | Description
--- | ---
`O.esri.Tiles.OfflineTileEnablerLayer(url,callback,state)` | Creates an instance of the offlineTileEnabler class. This library allows you to extend an ArcGISTiledMapServiceLayer with offline capability as well as manage the online/offline resynchronization process. Any Esri basemap REST endpoint should work. The state property is a boolean for specifying if the application is intializing the layer online (true) or offline (false). When you first load the map you should set this property to `true`.

###Properties
Property  | Description
--- | ---
`layer.offline.proxyPath`| For CORS enabled servers this can be set to `null`. The default is null. All ArcGIS Online-based services uses CORS. If you are using a non-CORS enabled server you'll need a proxy. Don't forget to check your proxy configuration to allow connections for all possible services that you might be using. More information on using proxies with ArcGIS can be found here: [https://developers.arcgis.com/javascript/jshelp/ags_proxy.html](https://developers.arcgis.com/javascript/jshelp/ags_proxy.html).

###Methods
Methods | Returns | Description
--- | --- | ---
`prepareForOffline(` `minLevel, maxLevel, extent,  ` `reportProgress)`  | `callback(number)` | Retrieves tiles and stores them in the local cache. For more information see [How To Use Tiles Library](howtousetiles.md).
`goOffline()` | nothing | This method puts the layer in offline mode. When in offline mode, the layer will not fetch any tile from the remote server. It will look up the tiles in the indexed db database and display them in the layer. If the tile can't be found in the local database it will show up blank (even if there is actual connectivity). The pair of methods `goOffline()` and `goOnline() `allows the developer to manually control the behaviour of the layer. Used in conjunction with the offline dectection library, you can put the layer in the appropriate mode when the offline condition changes.
`goOnline()` | nothing | This method puts the layer in online mode. When in online mode, the layer will behave as regular layers, fetching all tiles from the remote server. If there is no internet connectivity the tiles may appear thanks to the browsers cache, but no attempt will be made to look up tiles in the local database.
`getLevelEstimation(extent,` `level, tileSize)` | {level, tileCount, sizeBytes} | Returns an object that contains the number of tiles that would need to be downloaded for the specified `"esri/geometry/Extent"`, zoom level `integer`, and the estimated byte size `integer`. This method is useful to give the user an indication of the required time and space before launching the actual download operation. The byte size estimation is very rough.
`getExtentBuffer(buffer,extent)`| Extent | `buffer` property is an `integer`. `extent` property is an `"esri/geometry/Extent"`. Returns a new extent buffered by a given measurement that's based on map units. For example, if you are using mercator map projection then the buffer property would be in meters and the new extent would be returned in mercactor.
`getTileUrlsByExtent(extent, level)` | Array | Returns an array of tile urls within a given map extent and zoom level.
`deleteAllTiles(callback)` | `callback(boolean, errors)` | Clears the local cache of tiles.
`getOfflineUsage(callback)` | `callback(size, error)` | Gets the size in bytes of the local tile cache.
`getTilePolygons(callback)` | `callback(polygon, error)` | Gets polygons representing all cached tiles. This is helpful to give users a visual feedback of the current content of the tile cache.
`saveToFile(filename, callback)` | `callback( boolean, error)` | Saves tile cache into a portable csv format.
`loadFromFile(filename, callback)` | `callback( boolean, error)` | Reads a csv file into local tile cache.
`estimateTileSize(callback)` | `callback(number)` | Retrieves one tile from a layer and then returns its size.
`getMaxZoom(callback)` | `callback(number)` | Returns the maximum zoom level of the layer.
`getMinZoom(callback)` | `callback(number)` | Returns the minimum zoom level of the layer.
`getMinMaxLOD(minZoomAdjust,` `maxZoomAdjust)` | `{min: zoomLevel, max: zoomLevel}` | Utility method for bracketing above and below your current Level of Detail. Use this in conjunction with setting the minLevel and maxLevel in `prepareForOffline()`. `minZoomAdjust` is an Integer specifying how far above the current layer you want to retrieve tiles. `maxZoomAdjust` is an Integer specifying how far below (closer to earth) the current layer you want to retrieve tiles


