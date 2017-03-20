# How to use the advanced edit library

## `OfflineEditAdvanced` library

This library allows a developer to extend a feature layer with intermittent and full offline editing support. You can combine this functionality with offline tiles. For a complete list of features consult the [OfflineEditAdvanced API doc](offlineeditadvanced.md).

**IMPORTANT:** Only use a single instance of OfflineEditAdvanced per application. With this single instance you can extend offline capabilities to multiple feature layers. This single instance contains all edits for all feature layers initialized via `OfflineEditAdvanced.extend().` Multiple feature layers share a single database. The database maintains the relationship between each edit and its' respective feature layer via a UUID.

**Step 1** Include `offline.min.js`, `offline-tiles-basic-min.js` and `offline-edit-advanced-min.js` in your app's require contstructor. Be sure to include `ofline.mins.js` which is a 3rd party library for detecting if the browser is online or offline. 

The pattern for how we include the tiles and edit library within the `require` statement is called generic script injection. Note that we do assign any of the editing or tile libraries an alias name. For example, we specified the mobile path "esri/map" and we gave it an alias called "Map." But, we did not do the equivalent for `offline-tiles-basic-min.js` or `offline-edit-advanced-min.js`.

```html	
    <script src="//github.hubspot.com/offline/offline.min.js"></script>
	<script>
	require([
		"esri/map", 
		"..dist/offline-tiles-basic-min.js",
		"..dist/offline-edit-advanced-min.js",
		function(Map)
	{
		...
	});
```

You can also refer to the offline-editor-js within a `define` statement using the following pattern for importing the library. Note you can leave off the `.js` from the module identifier, for example:

```js

	define(["..dist/offline-edit-advanced-min"],function(){
		...
	})

```

**Step 2** Once your map is created (either using new Map() or using esriUtils.createMap(webmapid,...), you create a new OfflineEditAdvanced instance and starting assigning events listeners to tie the library into your user interface:

```js
		
		var offlineEdit = new O.esri.Edit.OfflineEditAdvanced();
		// OPTIONAL - you can change the name of the database
		// OfflineEdit.DBNAME = "FIELD_SURVEY3";
		// OPTIONAL - you can change the name of the unique identifier used by the feature service. Default is "objectid".
		// offlineEdit.UID = "GlobalID";
		offlineEdit.on(offlineEdit.events.EDITS_ENQUEUED, updateStatus);
updateStatus);
		offlineEdit.on(offlineEdit.events.ALL_EDITS_SENT, updateStatus);		              
		offlineEdit.on(offlineEdit.events.EDITS_SENT_ERROR, handleEditsSentError);
		
```		

NOTE: You can also monitor standard ArcGIS API for JavaScript layer events using the typical pattern such as:

```js

      	offlineEdit.on("edits-complete", handleEditsComplete);

```

**Step 3** Set a listener for the `layers-add-result` event. Then, add the feature layer to the map just like you normally would.

**IMPORTANT:** The library currently only works offline when the `mode` is set to `FeatureLayer.MODE_SNAPSHOT`:

```js
	
	map.on('layers-add-result', initEditor);
	
	var fsUrl = "http://services2.arcgis.com/CQWCKwrSm5dkM28A/arcgis/rest/services/Military/FeatureServer/1";

    var layer1 = new FeatureLayer(fsUrl, {
		mode: FeatureLayer.MODE_SNAPSHOT,
		outFields: ['*']
	});

	map.addLayers(featureLayers);
	
```

**Step 4** After the `layers-add-result` event fires extend the feature layer using the `extend()` method. 

Optionally, if you are building a fully offline app then you will also need to set the `dataStore` property in the constructor if you want full control of what is stored. Or, you can access an automatically created data store via the `getFeatureCollections()` method. If you use the `getFeatureCollections()` pattern you can simply ignore the `dataStore` property in the constructor. 

The `dataStore` property is an object that is used to store any data related to your app that will assist in restoring it and any feature layers after a full offline browser restart. 

The library's internal `featureLayerCollection` is equivalent to `featureLayer.toJson()`.

Note: the `layer.extend()` callback only indicates that the edits database has been successfully initialized.

Here is an example of initializing the library for partial offline use. Note that the `dataStore` property is not set because it's only needed if you need to restart the browser while offline.

```js
		
		function initEditor(evt)
		{
			offlineEdit.extend(layer1,function(success, error){
				if(success){
					console.log("Layer has been extended for offline use.");
				}
			});
		}			
		
```

For full offline use, the pattern would look like this where we are creating a `dataStore`. 

```js
		
		function initEditor(evt)
		{
			// OPTIONAL - for fully offline use you can store a data object
			var dataStore = {};
            dataStore.featureLayerJSON = layer1.toJson();
            dataStore.zoom = map.getZoom();      
            
            offlineEdit.extend(layer1,function(success, error){
				if(success){
					console.log("Layer has been extended for offline use.");
				}
			}, dataStore);
		}			
		
```


When working with fully offline browser restarts you should wait until the layer has been successfully extended before forcing the library to go back online. When you force the library to `goOnline()` it will attempt to sync any edits that occurred while offline. Only call `goOnline()` once. If there are errors or it doesn't work then the best practice is to recheck the contens of the edits database.

The workflow for this coding pattern is you start out online > offline > browser restart > then back online. 

```js

    offlineEdit.extend(layer1, function(success, error) {
        if(success) {
            // If the app is online then force offlineEdit to its online state
            // This will force the library to check for pending edits and attempt to
            // resend them to the Feature Service.
            if(_isOnline){ // Check if app is online or offline
                offlineEdit.goOnline(function(result){
                    if(!result.success){
                        alert("There was a problem when attempting to go back online.");
                    }
                    else {
                        // Do somthing good!
                    }
                });
            }
            else {
                offlineEdit.goOffline();
            }
        }
    });

```


There are two approaches to using the dataStore:

* **Approach 1** involves you manually creating the dataStore for greater control over what goes into the Data Store Object and then inserting that Object into the offlineFeatureManager's constructor.

* **Approach 2**, you can let the library manage it automatically upon an ADD, UPDATE or DELETE. This is accomplished by not inserting a manual Data Store Object into OfflineEditAdvanced constructor and instead setting OfflineEditAdvanced.ENABLE_FEATURECOLLECTION = true.

#### Approach 1 - manually create dataStore

The `dataStore` object has one reserved key and that is `id`. If you overwrite the `id` key the application will fail to update the `dataStore` object correctly. Here is an example of one possible `dataStore` object:

```js

	var dataStore = {
		"featureLayerJSON": featureLayer.toJson(),
		"zoom": map.getZoom(),
		"centerPt": (map.extent.getCenter()).toJson()
	}

```

**NOTE:** The `dataStore` is a single JavaScript Object. When manually submitting a `dataStore` the last Object wins (LIFO). Any new `dataStore` will overwrite the previous values. 

Here's one approach for using a recursive function for loading the feature layers:

```js

    var featureLayerArray = [featureLayer0, featureLayer1, featureLayer2, . . . ];
    
    var count = 0;
    function extendFeatureLayers(){
        if(count <= featureLayerArray.length){
            offlineEdit.extend(featureLayerArray[count],
                function(success, error){
                    if(success){
                        count++;
                        extendFeatureLayers();
                    }
                    else {
                        console.log(“Error when extending layer: “ + count);
                    }
                });
        }
        else {
            //You are now done! Put post-completion code here.
        }
    }


```


You can then retrieve this data after an offline restart by using the following pattern:

```js

	offlineEdit.getFeatureLayerJSONDataStore(function(success, dataStore){
		if(success){
			myFeatureLayer = new 
				FeatureLayer(dataStore.featureLayerJSON,{
            	mode: FeatureLayer.MODE_SNAPSHOT,
               	outFields: ["GlobalID","BSID","ROUTES","STOPNAME"]
           	});
           	
           	offlineEdit.extend(myFeatureLayer,function(result, error) {
           		if(result) {
           			console.log("Layer has been successfully rebuilt while offline!");
           		}
           	}
		}
	});


```

#### Approach 2 - automatic management of dataStore

If you don't want to deal with creating and managing your own data store when working with offline browser restarts, then here's the pattern for using the built-in `featureLayerCollections`. This pattern is ideal if you are using Esri's pre-built widgets such as `AttributeInspector` and you don't have access to the necessary events for creating and updating the `dataStore`. 

Once you set `ENABLED_FEATURECOLLECTION` to `true` the library will automatically update its internal snapshot of the feature layer every time an ADD, UPDATE or DELETE is executed while offline.


```js

			// Tell the library to automatically create and store a snapshot of the
			// of the feature layer.
			offlineEdit.ENABLE_FEATURECOLLECTION = true
			
			offlineEdit.extend(layer1,function(success, error){
				if(success){
					console.log("layer1 has been extended for offline use.");
				}
			});

```

Now you can use this pattern to reconstitute the layer after an offline browser restart:

```js

     offlineEdit.getFeatureCollections(function(success, collection) {
         if(success) { 
         	myFeatureLayer = new 
			    FeatureLayer(collection.featureCollections[0].featureLayerCollection),{
            	mode: FeatureLayer.MODE_SNAPSHOT,
               	outFields: ["GlobalID","BSID","ROUTES","STOPNAME"]
           	});
           	
           	offlineEdit.extend(myFeatureLayer,function(result, error) {
           		if(result) {
           			console.log("Layer has been successfully rebuilt while offline!");
           		}
           	}
         }
     });

```

Here is an example of the Object returned in the `getFeatureCollections()` callback:

```js
    {
        id: "feature-collection-object-1001",
        featureLayerCollections: [
            { 
                featureLayerUrl: "http://...", 
                featureLayerCollection: { . . . }
            }
        ]
    }

```

There are two ways to get the dataStore. You can get it from the instance of Offline Features Manager or from the feature layer, itself:

* `offlineEdit.getFeatureLayerJSONDataStore( callback )`
* `featureLayer.getFeatureLayerJSONDataStore(callback)`


**Step 5** Once a layer has been extended the offline library will enable it with new methods. Here are a few examples that include code snippets of how to take advantage of some of the library's methods. 

#### OfflineEditAdvanced.proxyPath
By default, the library assumes you are using a CORS-enabled Feature Service. All ArcGIS Online Feature Services are CORS-enabled. If you are hosting your own service and it is not CORS-enabled, then you will need to set this path. More information on downloading and using ArcGIS proxies can be found here: [https://developers.arcgis.com/en/javascript/jshelp/ags_proxy.html](https://developers.arcgis.com/en/javascript/jshelp/ags_proxy.html)

Here's one example:

```js

	offlineEdit.proxyPath = "../your-local-proxy-directory/proxy.php";

```

#### OfflineEditAdvanced.goOffline()
Force the library to go offline. Once this condition is set, then any offline edits will be cached locally.

```js
		function goOffline()
		{
			offlineEdit.goOffline()														});
			//TO-DO			
		}
```

#### OfflineEditAdvanced.goOnline()
Force the library to return to an online condition. If there are pending edits, the library will attempt to sync them.

```js
		function goOnline()
		{			
			offlineEdit.goOnline(function(result)
			{
				if(result.success){
				    //Modify user inteface depending on success/failure
				}				
			});
		}
```

It's important to note that the `results` object contains all the necessary information about successes and failures that may have occurred during the online resync process. Here is a description of what's inside. The `features.responses` object contains information on features sync. The `attachments.uploadResponses` contain information on attachments sync. And, the `attachments.dbResponses` contains information on whether or not any attachment that was successfully sync'd was deleted from the local database. 

```js

resultsObject = {
    features:{
        success : boolean,
        responses : responses
    },
    attachments:{
        success : boolean,
        uploadResponses : uploadResponses,
        dbResponses : dbResponses 
    }
}

```

Typically you should only need to call this method once for each online/offline cycle. However, resync attempts won't always happen perfectliy. In your code, if there are errors or the library fails to sync for some reason then the best practice is to evaluate any error messages, recheck the online/offline status and recheck the contents of the edits database. 

If there was a an failure and/or errors, it's a good idea to reevaluate the edits that remain in the database because some edits may have been synced and others may still be pending. Only then, and depending on the error message, should the app try to `goOnline()` again. 

#### OfflineEditAdvanced.getOnlineStatus()
Within your application you can manually check online status and then update your user interface. By using a switch/case statement you can check against three enums that indicate if the library thinks it is offline, online or in the process of reconnecting.

```js		
			
			switch( offlineEdit.getOnlineStatus() )
			{
				case offlineEdit.OFFLINE:
					node.innerHTML = "<i class='fa fa-chain-broken'></i> offline";
					domClass.add(node, "offline");
					break;
				case offlineEdit.ONLINE:
					node.innerHTML = "<i class='fa fa-link'></i> online";
					domClass.add(node, "online");
					break;
				case offlineEdit.RECONNECTING:
					node.innerHTML = "<i class='fa fa-cog fa-spin'></i> reconnecting";
					domClass.add(node, "reconnecting");
					break;
			}
		
```

#### OfflineEditAdvanced.pendingEditsCount(callback)
You can check if there are any edits pending.
		
```js
	
	// Simply get a count
	offlineEdit.pendingEditsCount(function(count){
		console.log("There are " + count + " edits pending");
	})		
	
	// Or retrieve all pending edits
	offlineEdit.getAllEditsArray(function(success,editsArray){
	 	if(success && editsArray.length > 0){
	 		editsArray.forEach(function(edit){
	 			console.log("Pending edit: " + JSON.stringify(edit));
	 		});
	 	}
	})
			
```

### Use of the library with multiple feature layers

Yes, you can use this library with multiple feature layers. Edits are stored in the database based on a UUID that includes a reference to the associated feature layer. See the `appcache-twofeatureslayer-noedit.html` sample for one example of how to implement this functionality.

### How to empty the edits database during testing?

Some browsers, like Firefox, make it difficult or impossible to delete data that's in an IndexedDB database. And, there may be times during testing were you are stuck with bad or old data in the database and you need to delete it.

You can run the reset code seperately or you can run the app with this pattern. If you do use the pattern below be sure to comment out the reset code and then re-run the app. You should be good to go again with a completely empty database.

```js

offlineEdit.extend(myFeatureLayer,function(result, error) {
    if(result) {
        console.log("OfflineEditAdvanced initialized.");
        offlineEdit.resetDatabase(function(success,error){
            console.log("DATABASE DELETED");
        });
    . . .
    . . .
});    

```