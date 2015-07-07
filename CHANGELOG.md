# offline-editor-js - Changelog

## Version 2.9.3 - July 1, 2015

No breaking changes.

**Enhancements**
* Closes #319. Make TPK support more universal between Chrome and WebView on Android.

## Version 2.9.2.2 - June 24, 2015

Minor doc update. Updates to README.

## Version 2.9.2.1 - June 18, 2015

Minor doc update. Clarifications on how to use the tile libraries and fixed some typos.

## Version 2.9.2 - June 17, 2015

No breaking changes.

**Enhancements**
* OfflineFeaturesManager now overrides layer.hasAttachments property. The override is available after a feature layer 
has been extended. This fixes an existing bug in the ArcGIS JS API when you create a feature layer from a featureCollectionObject
the hasAttachmens property does not get correctly repopulated.

**Bug fix**
* Fixes issue in offlineFeaturesManager's featureCollection data store when using it with multiple feature layers. 
Subsequent featureLayerCollections were being stored as arrays instead of objects.
* Minor tweak to appcache-tiles.appcache. It was broken.

## Version 2.9.1 - May 28, 2015

No breaking changes.

**Enhancements**
* Initializes internal featureCollectionObject when a layer is extended.
* Added property `OfflineFeaturesManager.ENABLE_FEATURECOLLECTION`. Default value is `false`. When enabled this will
allow the library to automatically create a snapshot of the feature layer.

## Version 2.9 - May 27, 2015

No breaking changes.

**Enhancements**
* Closes #327 - Improved use of keys and indexes in editsStore.js. Minor tweaks at this time.
* Closes #342 - Automates featureCollection management. New method `OfflineFeaturesManager.getFeatureCollections()`.


## Version 2.8.2 - May 19, 2015

No breaking changes. Recommended update.

**Enhancements**
* Fixes sync error when returning online after updating a new edit offline.

## Version 2.8.1 - May 11, 2015

No breaking changes.

**Enhancements**
* Closes #339 - offline update of a new attachment needs to be handled as an ADD.
* Updated offlineAttachmentsSpec.js to test for #339 condition.

## Version 2.8 - May 4, 2015

This release focused on updating full offline editing capabilities. Recommended update. No breaking changes. 

**Enhancements**
* Added functionality to `offlineFeaturesManager.js` to detect and handle when a feature layer is created using a feature collection.
* Addresses browser changes in Chrome 42.x and Firefox 37.x with respect to how they handle HTML/JS apps when going offline and 
then transitioning back online.
* Updated `appcache-features.html` sample. 

**Bug Fix**
* Closes #336 - problem with appcache-features sample. The application now correctly syncs when going back online after 
a full offline restart. It also contains improvements in how the app life-cycle is handled. 

## Version 2.7.1 - April 29, 2015

This release has enhancements and has no breaking changes.

**Enhancements**
* Added `OfflineFeaturesManager.getFeatureLayerJSONDataStore()` for use in full offline browser restarts.

## Version 2.7.0.1 - April 28, 2015

Closes #323 - Add an FAQ doc.

## Version 2.7 - April 27, 2015

This release focused on improving the handling of attachments. Has breaking changes.

**Enhancements**
* Added a new sample attachments-editor-secure.html to demonstrate the pattern for working with secure feature services and attachments.
* Closes #286 - support for secure services (HTTPS) when working with attachments
* Closes #305 - Support both ADD and UPDATE attachment. 
* Closes #306 - removes createObjectURL functionality from attachmentsStore. This allows for attachments to be used in full offline scenarios.
* Closes #318 - added OfflineFeaturesManager.ATTACHMENTS_DB_NAME and ATTACHMENTS_DB_OBJECSTORE_NAME.
* Closes #321 - switch offlineFeaturesManager unit test to a different feature service that's attachments enabled.
* Closes #322 - rewrite offlineAttachmentsSpec.
* Closes #324 - attachmentsStore._readFile() can indicate false positives.
* Closes #325 - support DELETE an existing attachment.
* Closes #328 - add layer.resestAttachmentsDatabase().
* Closes #329 - add layer.getAttachmentsUsage().

**Breaking Changes**
* attachmentsStore.DB_NAME has been renamed to attachmentsStore.dbName to be consistent with editStore.
* attachmentsStore.OBJECTSTORE_NAME has been renamed to attachmentsStore.objectStoreName to be consistent with editStore.
* Added use of the browser's [FormData() API](https://developer.mozilla.org/en-US/docs/Web/API/FormData) along with `FormData.append`. This may cause 
attachment support to break in certain older browsers. This is a courtesy heads-up because as a rule this library only
supports the latest version of Chrome, Firefox and Safari. 

## Version 2.6.1 - April 13, 2015

Patch release. Recommended update. No breaking changes.

**Bug Fixes**

* Closes #315 - editsStore.pushEdit() - failed to insert undefined objectId into database. 

## Version 2.6 - April 9, 2015

Recommended update. No breaking changes. 

**Bug Fixes**

* Closes #308 - resetLimitedPhantomGraphicsQueue failing. Could cause fatal errors.

**Updates**

* Closes #304 - preserve version number in minified builds
* Closes #307 - package.json updated devDependencies
* Updated editsStoreSpec2 to accommodate the fix for #308
* jshint updates:
    * jshint now working for /edit directory. Initial step towards piping all files thru jshint!
    * jshint fix to attachmentsStore.js - moved "use strict" into function
    * jshint fix to OfflineEditNS.js - removed "use strict" & added jshint exception
    * Many jshint fixes in offlineFeaturesManager.js
    * jshint fix to .jshintrc
* Deleted editsStore_old.js

## Version 2.5.1 - April 7, 2015 

Closes #301 - OfflineFeaturesManager failed on _validateFeature during an attachment ADD operation.

## Version 2.5.0.2 - April 2, 2015

Minor doc update. Clarification in OfflineFeaturesManager on requiring `mode` be set to `FeatureLayer.MODE_SNAPSHOT`.

## Version 2.5.0.1 - April 1, 2015

Minor doc update. Added references to attachments documentation. Misc. clarifications.

## Version 2.5 - March 27, 2015

v2.5 focused on updating OfflineFeaturesManager from using localStorage to IndexedDB. Additional information is available in the [API Doc](https://github.com/Esri/offline-editor-js/blob/master/doc/offlinefeaturesmanager.md). Feature edit storage capabilities have been increased from 5 MBs to approximately 50 - 100 MBs or more, and the changes made allow for additional functionality and capabilities to be implemented that weren't possible under the previous architecture.**

Closes #292, #289, #285, #281, #280, #275, #261

**BREAKING CHANGES:** In order to accomplish the v2.5 update the following **breaking** changes were made. All common `EditStore` functionality was migrated to the FeatureLayer so that under most circumstances there is no need to use or access the `EditStore` library directly anymore. In fact, as of v2.5 accessing it directly is discouraged. 

* `OfflineFeatureManager.getReadableEdit()` deprecated. Use `featureLayer.getAllEditsArray()`.
* `editsStore.hasPendingEdits()` deprecated. Use `featureLayer.pendingEdits()`.
* `editsStore.retrieveEditsQueue()` deprecated. Use `featureLayer.getAllEditsArray()`.
* `editsStore.getEditsStoreSizeBytes()` deprecated. Use `featureLayer.getUsage()`.
* `editsStore.getLocalStorageSizeBytes()` deprecated. Use `featureLayer.getUsage()`.

**New Functionality in OfflineFeatureManager**

* `OfflineFeaturesManager.DB_NAME`. Allows you to set the database name of the edits library.
* `OfflineFeaturesManager.DB_OBJECTSTORE_NAME`. Set an internal object store within the database that allows access to a set of data. 
* `OfflineFeaturesManager.DB_UID`. **IMPORTANT**. This tells the database which `id` to use as a unique identifier for each feature service. 
* `OfflineFeaturesManager.events.EDITS_SENT`. **Updated**. Now this event is only triggered when an edit is synced with the server while online.
* `OfflineFeaturesManager.events.EDITS_SENT_ERROR`. Indicates there was an error when syncing with the server. If there was an error, the edit will remain in the database.
* `OfflineFeaturesManager.events.EDITS_ENQUEUED_ERROR`. Indicates an error occurred while trying to store an edit in offline mode. 

**New Functionality in FeatureLayer** When you use `OfflineFeatureManager.extend()` to extend a feature layer it will be enabled with the following new functionality:

* `featureLayer.resetDatabase()`. Full database reset.
* `featureLayer.pendingEditsCount()`. Returns the number of pending edits.
* `featureLayer.getUsage()`. Returns the approximate size of the database and number of edits.
* `featureLayer.getPhantomGraphicsArray()`. Used with offline browser restarts. Returns an array of phantom graphics. Complimentary to `featureLayer.getPhantomLayerGraphics()`.
* `featureLayer.getAllEditsArray()`. Returns an array of all edits stored in the database.
* `featureLayer.getFeatureLayerJSON()`. A helper function for retrieving a feature layers JSON using the REST `f=json` parameter. Note you can also retrieve feature layer JSON using the ArcGIS API for JavaScript's `featureLayer.toJson()` method.
* `featureLayer.setFeatureLayerJSONDataStore()`. Sets or updates the optional feature layer storage object. You can also set the dataStore using the `OfflineFeatureManager` constructor's `dataStore` property.
* `featureLayer.getFeatureLayerJSONDataStore()`. Retrieves the optional feature layer storage object.
* `featureLayer.convertFeatureGraphicsToJSON()`. Helper function that converts an array of graphics to a JSON string.

** Footnote on browser storage capabilities. The amount of storage varies from device to device. It depends on multiple factors related to the browser including how much memory space the browser has consumed, how large the browser cache has grown, how many other tabs may be open, and how much memory other applications are already consuming.

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