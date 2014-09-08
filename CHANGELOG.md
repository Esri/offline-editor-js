# offline-editor-js - Changelog

## Version 2.0 - Sep 8, 2014

Version 2.0 involves many changes. Please read the following carefully when upgrading from v1.x to v2.0.

Breaking Changes:

- Provides a single, concatenated and minified library files in /dist for edit, tiles and tpk. This single library pattern offers a HTTP request/response performance boost by providing libraries of significantly smaller size and only one file to retrieve as compared to making multiple HTTP requests.
- Added a new namespacing for use with all non-AMD JavaScript libraries in the repo.
- Internally refactored all libraries.
- Single, concatenated source library files also available in /dist.
- Updated all samples to ArcGIS API for JavaScript v3.10.
- Concatentation and minification of libraries via a Grunt task.
- All tests updated.
- All samples updated.
- Consolidated duplicate functionality between offlineTilesEnabler.js and OfflineTilesEnablerLayer.js into TilesCore.js. The coding pattern is a bit ackward to access the shared functionality, but the upside is that duplicate functionality only needs to be maintained in a single library.

Overview of the new namespace pattern:

   * `O.esri.Edit` references all offline edit libraries
   * `O.esri.Tiles` references all offline tile libraries
   * `O.esri.TPK` references all TPK libraries
   * `O.esri.zip` a wrapper around Zip.js

Breaking name changes for the following libraries:

   * `offline-edit-min.js` - replaces _OfflineFeaturesManager.js_
   * `offline-tiles-basic-min.js` - _replaces offlineTilesEnabler.js_ 
   * `offline-tiles-advanced-min.js` - replaces _OfflineTilesEnablerLayer.js_
   * `offline-tpk-min.js` - replaces _TPKLayer.js_
   
Breaking name changes for the following Classes:
   
   * `O.esri.Edit.OfflineFeaturesManager()` replaces _OfflineFeaturesManager()_
   * `O.esri.Tiles.OfflineTilesEnabler()` replaces _OfflineTilesEnabler()_
   * `O.esri.Tiles.OfflineTilesEnablerLayer()` replaces _OfflineTilesEnablerLayer()_
   * `O.esri.TPK.TPKLayer()` replaces _TPKLayer()_
   * `O.esri.Edit.EditStore()` replaces _editsStore()_
   * `O.esri.zip` replaces the module _"tpk/zip"_

Breaking changes for the following methods:

   * `O.esri.Edits.EditStore().retrieveEditsQueue()` replaces the formerly private method _editsStore()._retrieveEditsQueue()_

Deprecations:

- Deprecated _restartOfflineFeaturesManager.js_. This functionality has been integrated directly into `OfflineFeaturesManager.js`

## Version 1.x - Various
- Multiple, non-versioned updates 


## Version 1 - Sep 19. 2013

- Initial commit.