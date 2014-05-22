API Doc for TPKLayer
====================

##TPKLayer

Extends a tiled map service and provides the ability to display tiles from a .tpk (ArcGIS Tile Page).

###Constructor

Constructor | Description
--- | ---
`TPKLayer()` | Creates an instance of the TPKLayer class. This library allows you to extend a TiledMapServiceLayer for the purpose of displaying a TPK file as a map.

###Methods
Methods | Returns | Description
--- | ---
`extend(files)`| nothing | Overrides a TiledMapServiceLayer. Files is an array of Entry Objects derived from a zip (tpk) file parsed via zip.js. As soon as this method is called it will extract all the necessary information from the zip file and display the TPK as a map.
`setMaxDBSize(size)`| nothing | (Optional) Let's you specify a maximum size in MBs for the local database. The default is 75MBs. Recommended maximum is 100MBs. Important: Making the database too large can result in browser crashes and slow application performance.
`getDBSize(callback)`| `callback(size,err)` | Returns the size of local database in bytes or an error message. Calling this too often during parsing operations can affect application performance.
`isDBWriteable(value)`| boolean | Default is true. Let's you programmatically allow or not allow the storing of tiles in the local database. This method can help you manage the size of the database. Use this in conjunction with `getDBSize()` on a map pan or zoom event listener. Tile retrieval times from images stored in the database are significantly faster than pulling images from the TPK.

###Properties
Property  | Description
--- | ---
`map` | Refers to the main applications Esri.Map object.
`store` | Refers to the local database and hooks directly to its [functionality](offlinetilesenabler.md). 
`RECENTER_DELAY` | Default is 350ms. Millisecond delay before attempting to recenter the map after orientation changes. Note: adjusting this too high will cause annoying delays. Adjusting this to short and it may not fire properly within the application life cycle.

###Events
Event | Value | Description
--- | --- | ---
`VALIDATION_ERROR` | "validationError" | An error occured during initialization that could prevent proper operation of the library.
`DATABASE_ERROR` | "databaseError" | An error occured while reading or writing to the local database.
`PARSING_ERROR` | "parsingError" | An error occured while parsing the TPK file.
`PROGRESS_EVENT` | "progress" | Event indicated progress status while parsing a TPK file. Parsing can take a while depending on how large the TPK is.
`PROGRESS_START` | "start" | Parsing has begun. Important for control UX elements that provide user feedback during parsing.
`PROGRESS_END` | "end" | Parsing has finished. Important for control UX elements that provide user feedback during parsing.

###TiledMapServiceLayer Override

Methods | Returns | Description
--- | --- | ---
`getTileUrl(level, row, col)` | String | Use the url's level, row and column to retrieve tiles as requested by the ArcGIS API for JavaScript. If a tile is in the local database it is returned. If it is not then the library parsing the TPK file for the appropriate tile image. If 	`isDBWriteable()` is set to true (default), then an image retrieved from the TPK will be written to the database. Tile retrieval times from images stored in the database are significantly faster than pulling images from the TPK.

