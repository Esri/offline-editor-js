offline-editor-js
=================

**Maintenance Mode** As of May 1, 2016 no new functionality will be added to this project. For additional details refer to this [issue](https://github.com/Esri/offline-editor-js/issues/468).

If you need a fully integrated, robust offline solution that's officially supported, then please refer to our native [ArcGIS Runtime SDKs](https://developers.arcgis.com/arcgis-runtime/) for iOS, Android, .NET, Xamarin, Java, OSx and Qt.

# Getting Started

Online samples are available here: **[http://esri.github.io/offline-editor-js/demo/](http://esri.github.io/offline-editor-js/demo/)**

This project is also available on npm: **[https://www.npmjs.com/package/esri-offline-maps](https://www.npmjs.com/package/esri-offline-maps)**


# Libraries

This repo contains the following libraries in the `/dist` directory. The use of `basic` in the name indicates intermittent offline-only, and `advanced` indicates the library can be used for both intermittent and full offline. 

Reference URLs are provided for developement only. It's recommended to use a CDN or host your own.

Use_Case | Name, Description and gh-pages URL
--- | ---
Basic editing | **`offline-edit-basic-min.js`** Simple, lightweight *(15k minimized)* offline editing library that automatically caches adds, updates and deletes when the internet is temporarily interrupted.<br><br>[`http://esri.github.io/offline-editor-js/dist/offline-edit-basic-min.js`](http://esri.github.io/offline-editor-js/dist/offline-edit-basic-min.js)
Advanced editing | **`offline-edit-advanced-min.js`** Used for intermittent and full offline editing workflows. Also includes limited support for attachments. <br><br>[`http://esri.github.io/offline-editor-js/dist/offline-edit-advanced-min.js`](http://esri.github.io/offline-editor-js/dist/offline-edit-advanced-min.js)
Basic map tiles |  **`offline-tiles-basic-min.js`** Caches map tiles for simple, intermittent-only offline workflows. Use this library with ArcGIS Online Web maps as well as with tiled map services.<br><br> [`http://esri.github.io/offline-editor-js/dist/offline-tiles-basic-min.js`](http://esri.github.io/offline-editor-js/dist/offline-tiles-basic-min.js) 
Advanced map tiles | **`offline-tiles-advanced-min.js`** Used for intermittent and full offline tile caching. Extends any ArcGIS Tiled Map Service. This library should be used in conjunction with an HTML5 Application Cache Manifest coding pattern.<br><br>[`http://esri.github.io/offline-editor-js/dist/offline-tiles-advanced-min.js`](http://esri.github.io/offline-editor-js/dist/offline-tiles-advanced-min.js)
TPK files | **`offline-tpk-min.js`** Reads TPK files and displays and caches them as a tiled map layer. Works for both intermittent and full offline.<br><br>[`http://esri.github.io/offline-editor-js/dist/offline-tpk-min.js`](http://esri.github.io/offline-editor-js/dist/offline-tpk-min.js)

`src` files are for software development-only. The`min` versions are minified and should be used in production. 

# Workflows Supported
The following workflow is currently supported for both both features and tiles:

1) Load web application while online.
 
2) Once all tiles, features and attachments are loaded then programmatically take application offline.

3) Make edits while offline.

4) Return online when you want to resync edits.

This workflow is supported for intermittent offline and full offline. There are samples in the `/samples` directory for both use cases. For more information on the differences between intermittent and full offline check out this [blog post](http://www.andygup.net/going-offline-with-html5-and-javascript-part-1/).

Full offline requires the use of an [application manifest](https://developer.mozilla.org/en-US/docs/HTML/Using_the_application_cache) to allow for browser reloads and restarts while offline. The application manifest lets you store .html, .js, .css and image files locally. There is also a [wiki doc](https://github.com/Esri/offline-editor-js/wiki/Working-with-Application-Cache) to help you learn more about using the cache with this library.

__Attachment Support__: Attachments are supported with some limitations. See documentation [here](./doc/attachments.md)


# API and How To Use Docs

Go __[here](http://esri.github.io/offline-editor-js/demo/)__ to get links to the API docs and How to use docs.

## FAQ

Go __[here](https://github.com/Esri/offline-editor-js/wiki/FAQ)__ for answers to frequently asked questions.

## Architecture

![Architecture](demo/images/offline_arch.png)

## Setup Instructions

1. [Fork and clone the repo.](https://help.github.com/articles/fork-a-repo)
2. After cloning from github, `cd` into the `offline-editor-js` folder
3. Run `git submodule init` and `git submodule update`
4. Try out the apps in the `/samples` folder. If they run, then everything is set up correctly.

## Build Instructions

1. From the root directory run `npm install`
2. Run `Grunt build`. If there are no errors, the minimized _(min)_ and source _(src)_ versions of the libraries will be output to `/dist`
3. For production automation see the npm scripts listed in [package.json](https://github.com/Esri/offline-editor-js/blob/master/package.json).

## Limitations

* Currently does not support related tables, domains or subtypes. The ArcGIS Runtime SDKs fully support these and more.
* There are browser limitations and technical dependencies. The offline capabilities in this toolkit depend on certain JavaScript capabilities being present in the browser. Go [here](doc/dependencies.md) for a detailed breakdown.
* Attachments are supported with some limitations listed [here](./doc/attachments.md).
* Browser storage space on mobile devices is a known limitation. This applies to stand-alone web applications and hybrid applications.
* The ArcGIS Editor Widget (ArcGIS API for JavaScript v3.x) may not work with `OfflineEditAdvanced` after a full offline restart. It's recommended that you build your own custom editing functionality that is fully mobile and offline compliant.

## Supported browsers
* Only the latest versions of Chrome, Firefox and Safari are supported.  
* The most up to date information on this library's browser support can be found [here](http://esri.github.io/offline-editor-js/demo/index.html#support).

## Dependencies

* [ArcGIS API for JavaScript (v3.14+)](https://developers.arcgis.com/javascript/)
* [Offline.js](http://github.hubspot.com/offline/docs/welcome/) - it allows detection of the online/offline condition and provides events to hook callbacks on when this condition changes
* Node.js required for building the source
* [IndexedDBShim](https://github.com/axemclion/IndexedDBShim) - polyfill to simulate indexedDB functionality in browsers/platforms where it is not supported notably older versions desktop Safari and iOS Safari.
* Sub-modules (see `/vendor` directory)

   * [jasmine.async](https://github.com/derickbailey/jasmine.async.git) - Used specifically for unit testing.

* Non sub-module based libraries that are used internally by this project
	* [FileSaver.js](https://github.com/Esri/offline-editor-js/blob/master/lib/tiles/README.md) - library to assist with uploading and downloading of files containing tile information.
	* [grunt-manifest](https://github.com/gunta/grunt-manifest) node.js library to assist with the creation of manifest files.
	* [zip](http://gildas-lormeau.github.io/zip.js/) A library for zipping and unzipping files. 
	* [xml2json](https://code.google.com/p/x2js/) A library for converting XML to JSON. Handles complex XML. 

## Resources

* [ArcGIS API for JavaScript](https://developers.arcgis.com/javascript/)
* [ArcGIS REST Services](http://resources.arcgis.com/en/help/arcgis-rest-api/)
* [twitter@esri](http://twitter.com/esri)

## Issues

Find a bug or want to request a new feature?  Please let us know by submitting an [issue](https://github.com/Esri/offline-editor-js/issues?state=open).

## Contributing

Anyone and everyone is welcome to contribute. Please see our [guidelines for contributing](https://github.com/esri/contributing).


## Licensing
Copyright 2017 Esri

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

[](Esri Tags: ArcGIS Web Mapping Editing FeatureServices Tiles Offline)
[](Esri Language: JavaScript)


