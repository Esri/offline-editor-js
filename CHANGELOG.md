# offline-editor-js - Changelog

## Version 2.4 - Nov 26, 2014
- Closes #274 phantom symbols not working correctly
	- Updated offlineFeaturesManager.js
	- Updated API docs to reflect new functionality.
- Updated appcache-features.html sample to incorporate new functionality.
- Updated modular-popup CSS media queries

New functionality:

- Added setPhantomLayerGraphics() - for use with offline browser restarts. Allows you to restore the phantom graphics layer. This layer is used to highlight any points that have been modified while offline.
- Added getPhantomLayerGraphics() - for use with offline browser restarts. Allows you to get a JSON copy of the current phantom graphics layers so that you can save it to a local database such as localStorage.

Breaking changes: none

## Version 2.3.1.2 - Oct 21, 2014
- Closes #267 can't host markdown on gh-pages

## Version 2.3.1.1 - Oct 14, 2014
- Minor wording change in tpk-layer.html sample to better describe changing TPK file type to .zip in order for it to work correctly.

## Version 2.3.1 - Oct 14, 2014
- Fixes NPM version for current NPM (requires patch version)
- Fixes issue with JPEG-based TPKs where tiles were not completely read from the TPK buffer, resulting in an incomplete image.

## Version 2.3 - Oct 13, 2014
- Closes #74 - Build sample with nice UX for editing
- Closes #257 - Build getting started pages for AGOL, editing and TPK. All samples show basic functionality and are responsive. Also integrated a new launch page for the API and How To Use docs.
- Closes #258 - Convert modal popup to widget
- The following samples were updated to be responsive: 
	- appcache-features.html
	- appcache-tiles.html
	- tpk-layer.html

New functionality:

- Closes #256 - Add getMaxZoom and getMinZoom to offlineTilesEnabler
- Added getMinMaxLOD() to offlineTilesEnabler and OfflineTilesEnablerLayer

Breaking Changes - None.


## Version 2.2.1 - Oct 1, 2014
Added a Getting Started for Tiles tutorial.

## Version 2.2.0.1 - Oct 1, 2014
Force update of submodules for IndexedDB and offline.js. Didn't take the 1st time. Submodule updates can be tricky.

## Version 2.2 - Sep 30, 2014
- Closes #233 - Rename TPKLayer.isDBWriteable()
- Closes #238 - TPKLayer - load tiles from URL
- Closes #242 - Internal - replace certain constructor properties
- Closes #243 - Update vendor versions
- Closes #247 - TPKLayer - only init autoCenter when null
- Closes #248 - Remove resource-proxy sub-directory
- Closes #249 - Add a public proxyPath var to offlineFeaturesManager.js

New functionality:

- Rename TPKLayer.isDBWriteable() to setDBWriteable(boolean). (Issue #233)
- In TPKLayer - load tiles from URL creates a new method loadTilesFromURL(). (Issue #238)
- Adds a public proxyPath var to offlineFeaturesManager.js. (Issue #249)

Breaking change:

- Issue [#248](https://github.com/Esri/offline-editor-js/issues/248) removes the ArcGIS proxy libraries from this repo. This means if you have an application that referred to that directory it will break and you'll need to fork and clone your own version of that repository [here](https://github.com/Esri/resource-proxy). 


## Version 2.1.1 - Sep 22, 2014
- Closes #244 - broken attachements-editor sample gh-pages

## Version 2.1 - Sep 18, 2014
- Closes #236 - Minor typo in How to use TPKLayer doc
- Closes #237 - Completely rebuilt gh-pages. Now we have an online demo app page.

## Version 2.0.3 - Sep 15, 2014
- Closes issue #234 - Minor cleanup of samples. Removed unused dojoConfig pathnames. 

## Version 2.0.2 - Sep 9, 2014
- Documentation update only.
- More minor doc updates.
- Minor README update to include link to new migration tips doc.

## Version 2.0.1 - Sep 8, 2014
- Minor updates to documentation
- Removed VERSION property from namespace (for now)
- Deleted OfflineMapsNS.js - not used (left over from v2 testing)

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