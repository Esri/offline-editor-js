offline-editor-js
=================

Experimental JavaScript library that auto-detects an offline condition and stores FeatureLayer edit activities until a connection is reestablished. Works with adds, updates and deletes.

Includes several libraries:

- OfflineStore - overrides applyEdits() method
- OfflineTileStore - stores tiles for offline pan and zoom.
- OfflineFeatureStore - **TBD** (manages features for offline usage)

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
* Can store base map tiles for offline pan and zoom.
* Automatic offline/online detection. Once an offline condition exists the library starts storing the edits. And, as soon as it reconnects it will submit the updates.
* Can store dozens or hundreds of edits.
* Currently works with Points, Polylines and Polygons.
* Indexes edits for successful/unsuccessful update validation as well as for more advanced workflows.
* Monitors available storage and is configured by default to stop edits at a maximum threshold and alert that the threshold has been reached. This is intended to help prevent data loss.

##OfflineStore Library

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


##OfflineTileStore Library

####OfflineTileStore()
* Constructor. Stores tiles for offline panning and zoom. 


####storeLayer()
* Stores tiled in either localStorage or IndexedDB if it is available. Storage process is initiated by forcing a refresh on the basemap layer.

####useIndexedDB
* Property. Manually sets whether library used localStorage or IndexedDB. Default is false. 


####getLocalStorageUsed()
* Returns amount of storage used by the calling domain. Typical browser limit is 5MBs.

##Testing
Run Jasmine's SpecRunner.html in a browser. You can find it in the /test directory.

##Dependencies
* ArcGIS API for JavaScript

## Resources

* [ArcGIS Developers](http://developers.arcgis.com)
* [ArcGIS REST Services](http://resources.arcgis.com/en/help/arcgis-rest-api/)
* [twitter@esri](http://twitter.com/esri)

## Issues

Find a bug or want to request a new feature?  Please let us know by submitting an issue.

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


