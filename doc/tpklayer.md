API Doc for TPKLayer
====================

##O.esri.TPK.TPKLayer

The `offline-tpk-min.js` library extends a tiled map service and provides the following tools for working with and displaying tiles from a .tpk file (ArcGIS Tile Package). 

###Constructor

Constructor | Description
--- | ---
`O.esri.TPK.TPKLayer()` | Creates an instance of the TPKLayer class. This library allows you to extend a TiledMapServiceLayer for the purpose of displaying a TPK file as a map.

###Properties
Property  | Value | Description
--- | --- | ---
`map` | Object | Refers to the main applications Esri.Map object.
`store` | Object |  Refers to the local database and hooks directly to its [functionality](offlinetilesenabler.md). 
`RECENTER_DELAY` | 350 | Default is 350ms. Millisecond delay before attempting to recenter the map after orientation changes. Note: adjusting this too high will cause annoying delays. Adjusting this to short and it may not fire properly within the application life cycle.	
`PROGRESS_START` | "start" | An event property indicated parsing has begun. Important for control of UX elements that provide user feedback during parsing.
`PROGRESS_END` | "end" | An event property indicated parsing has finished. Important for control of UX elements that provide user feedback during parsing.
`WINDOW_VALIDATED` | "windowValidated" | An event property indicated all window related functionality has been checked. Example: Window.File and Window.FileReader.
`DB_VALIDATED` | "dbValidated" | An event property indicating all database checks have passed.
`PARSING_ERROR` | "parsingError" | An event property indicating an error occured while parsing the TPK file.
`DB_INIT_ERROR` | "dbInitError"| An event property indicating an error occurred while initializing the database.
`NO_SUPPORT_ERROR` | "libNotSupportedError"| An event property indicating the library won't work on this browser.

###Methods
Methods | Returns | Description
--- | --- | ---
`extend(files)`| nothing | Overrides a TiledMapServiceLayer. Files is an array of Entry Objects derived from a zip (tpk) file parsed via zip.js. As soon as this method is called it will extract all the necessary information from the zip file and display the TPK as a map.
`setMaxDBSize(size)`| nothing | (Optional) Let's you specify a maximum size in MBs for the local database. The default is 75MBs. Recommended maximum is 100MBs. Important: Making the database too large can result in browser crashes and slow application performance.
`getDBSize(callback)`| `callback(size,err)` | Returns the size of local database in bytes or an error message. Calling this too often during parsing operations can affect application performance.
`setDBWriteable(value)`| nothing | Default is true. Value is boolean. Let's you programmatically allow or not allow the storing of tiles in the local database. This method can help you manage the size of the database. Use this in conjunction with `getDBSize()` on a map pan or zoom event listener. Tile retrieval times from images stored in the database are significantly faster than pulling images from the TPK.
`loadFromURL(tile,callback)` | `callback(success,err)` | Use this method when working with both tiled map services and TPKs. With this method you can force load tiles into the database. Use this in conjunction with offlineTilesEnabler.saveToFile() and OfflineTilesEnablerLayer.saveToFile(). The `tile` property must confirm to the following Object construction: {/\* String \*/ url, /\* base64 String \*/ img}. Returns a boolean that indicates if the load was successful or not. 
`isDBValid()` | boolean | Verifies whether not the browser supports this library.

###Events
Event | Value | Description
--- | --- | ---
`DATABASE_ERROR_EVENT` | "databaseErrorEvent" | An error occured while reading or writing to the local database.
`VALIDATION_EVENT` | "validationEvent" | An event related to various checks to insure library functionality is supported.
`PROGRESS_EVENT` | "progress" | Event indicated progress status while parsing a TPK file. Parsing can take a while depending on how large the TPK is.

###TiledMapServiceLayer Override

Methods | Returns | Description
--- | --- | ---
`getTileUrl(level, row, col)` | String | Use the url's level, row and column to retrieve tiles as requested by the ArcGIS API for JavaScript. If a tile is in the local database it is returned. If it is not then the library parsing the TPK file for the appropriate tile image. If 	`isDBWriteable()` is set to true (default), then an image retrieved from the TPK will be written to the database. Tile retrieval times from images stored in the database are significantly faster than pulling images from the TPK.

###O.esri.zip

Integrates zip.js into the TPKLayer library. Here is a short listing, for a completing listing of zip.js functionality go [here](http://gildas-lormeau.github.io/zip.js/).

Methods | Returns | Description
--- | --- | ---
`createReader(reader, callback[, onerror])` | {ZipReader} | Create a ZipReader object. A ZipReader object helps to read the zipped content.
`BlobReader(blob)` | Binary contents of Blob | Use this as the reader property in the createReader constructor.

