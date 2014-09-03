# offline-editor-js - Changelog

## Version 2 - 
Breaking Changes:

- Provides a single, concatenated and minified library files in /dist for edit, tiles and tpk. This single library pattern offers a performance boost by providing a significantly smaller size and one file to load.
- Internally refactored all libraries.
- Single, concatenated source library files also available in /dist.
- Updated all samples to ArcGIS API for JavaScript v3.10.
- Concatentation and minification available via a Grunt task.
- All tests updated.
- All samples updated to use single library file pattern.
- Added a universal namespace via OfflineMapsNS.js for use with all pure JavaScript libraries in the repo.
- Deprecated restartOfflineFeaturesManager.js
- Renamed various internal libraries.
- Consolidated duplicate functionality between offlineTilesEnabler.js and OfflineTilesEnablerLayer.js into TilesCore.js. The coding pattern is a bit ackward to access the shared functionality, but the upside is that duplicate functionality only needs to be maintained in a single library.

## Version 1.x - Various
- Multiple, non-versioned updates 


## Version 1 - Sep 19. 2013

- Initial commit.