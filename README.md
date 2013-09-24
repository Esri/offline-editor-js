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






##Dependencies
ArcGIS API for JavaScript
