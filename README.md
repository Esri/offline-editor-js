offline-editor-js
=================

JavaScript library that auto-detects an offline condition and stores the results until a connection is reestablished.

##How to use?

The library provides a constructor that can simply be used in place of the traditional applyEdit() method. It does all the rest of the work for you:

	var offlineStore = new OfflineStore(map);
	offlineStore.applyEdits(graphic,layer,"delete");	
##Features

* Automatic offline/online detection. Once an offline condition exists the library starts storing the edits. And, as soon as it reconnects it will submit the updates.
* Can store dozens or hundreds of edits.
* Indexes edits for successful/unsuccessful update validation as well as for more advanced workflows.
* Monitors available storage and is configured by default to stop edits at a maximum threshold.

##API

####OfflineStore(/\* Map \*/ map)
* Constructor. Requires a reference to an ArcGIS API for JavaScript Map.

####applyEdits(/\* Graphic \*/ graphic,/\* FeatureLayer \*/ layer, /\* String \*/ enumValue)
* Method.

####getStore()
* Returns an array of Graphics.

####getLocalStoreIndex()
* Returns the index as an array of JSON objects. The objects are constructor like this:
	
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




##Testing
Run Jasmine's SpecRunner.html in a browser. You can find it in the /test directory.

You can also emulate off-line conditions by using Firefox's build-in, offline functionality:

![] (firefox_offline_mode.png)


##Dependencies
* ArcGIS API for JavaScript

## Resources

* [ArcGIS Developers](http://developers.arcgis.com)
* [ArcGIS REST Services](http://resources.arcgis.com/en/help/arcgis-rest-api/)
* [twitter@esri](http://twitter.com/esri)

## Issues

Find a bug or want to request a new feature?  Please let us know by submitting an issue.

## Contributing

Esri welcomes contributions from anyone and everyone. Please see our [guidelines for contributing](https://github.com/esri/contributing).


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

[](Esri Tags: ArcGIS Web Mapping Editing FeatureServices Offline)
[](Esri Language: JavaScript)


