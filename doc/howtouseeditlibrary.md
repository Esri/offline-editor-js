How to use the edit library
===========================

##`edit` library

The `edit` library allows a developer to extend a feature layer with offline editing support. You can combine this functionality with offline tiles. For a complete list of features consult the [OfflineFeaturesManager API doc](offlinefeaturesmanager.md).

**Step 1** Include `offline.min.js`, `offline-tiles-basic-min.js` and `offline-edit-min.js` in your app's require contstructor. Be sure to include `ofline.mins.js` which is a 3rd party library for detecting if the browser is online or offline. 

The pattern for how we include the tiles and edit library within the `require` statement is called generic script injection. Note that we do assign any of the editing or tile libraries an alias name. For example, we specified the mobile path "esri/map" and we gave it an alias called "Map." But, we did not do the equivalent for `offline-tiles-based-min.js` or `offline-edit-min.js`.

```html	
	<script src="../vendor/offline/offline.min.js"></script>
	<script>
	require([
		"esri/map", 
		"..dist/offline-tiles-basic-min.js",
		"..dist/offline-edit-min.js",
		function(Map)
	{
		...
	});
```

You can also refer to the offline-editor-js within a `define` statement using the following pattern for importing the library. Note you can leave off the `.js` from the module identifier, for example:

```js

	define(["..dist/offline-edit-min"],function(){
		...
	})

```

**Step 2** Once your map is created (either using new Map() or using esriUtils.createMap(webmapid,...), you create a new OfflineFeaturesManager instance and starting assigning events listeners to tie the library into your user interface:

```js
		
		var offlineFeaturesManager = new O.esri.Edit.OfflineFeaturesManager();
		// OPTIONAL - you can change the name of the database
		// offlineFeaturesManager.DBNAME = "FIELD_SURVEY3";
		// OPTIONAL - you can change the name of the unique identifier used by the feature service. Default is "objectid".
		// offlineFeaturesManager.UID = "GlobalID";
		offlineFeaturesManager.on(offlineFeaturesManager.events.EDITS_ENQUEUED, updateStatus);
updateStatus);
		offlineFeaturesManager.on(offlineFeaturesManager.events.ALL_EDITS_SENT, updateStatus);		              
		offlineFeaturesManager.on(offlineFeaturesManager.events.EDITS_SENT_ERROR, handleEditsSentError);
		
```		

NOTE: You can also monitor standard ArcGIS API for JavaScript layer events using the typical pattern such as:

```js

      	offlineFeatureLayer.on("edits-complete", handleEditsComplete);

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

**Step 4** After the `layers-add-result` event fires extend the feature layer using the `extend()` method. Optionally, if you are building a fully offline app then you will also need to set the `dataStore` property in the constructor. 

Note: the `layer.extend()` callback only indicates that the edits database has been successfully initialized.

```js
		
		function initEditor(evt)
		{
			// OPTIONAL - for fully offline use you can store a data object
			// var options = {};
            // options.graphics = JSON.stringify(layer1.toJson());
            // options.zoom = map.getZoom();
            
			offlineFeaturesManager.extend(layer1,function(success, error){
				if(success){
					console.log("layer1 has been extended for offline use.");
				}
			}/*, dataStore */);
		}			
		
```

When working with fully offline browser restarts you should wait until the layer has been successfully extended before forcing the library to go back online. The workflow for this coding pattern is you start out online > offline > browser restart > then back online.

```js

    offlineFeaturesManager.extend(layer1, function(success, error) {
        if(success) {
            // If the app is online then force offlineFeaturesManager to its online state
            // This will force the library to check for pending edits and attempt to
            // resend them to the Feature Service.
            if(_isOnline){ // Check if app is online or offline
                offlineFeaturesManager.goOnline(function(result){
                    if(!result.success){
                        alert("There was a problem when attempting to go back online.");
                    }
                    else {
                        // Do somthing good!
                    }
                });
            }
            else {
                offlineFeaturesManager.goOffline();
            }
        }
    });

```


The `dataStore` property is an object that is used to store any data related to your app that will assist in restoring it and any feature layers after a full offline browser restart. The `dataStore` object has one reserved key and that is `id`. If you overwrite the `id` key the application will fail to update the `dataStore` object correctly. Here is an example of one possible `dataStore` object:

```js

	var dataStore = {
		"featureLayerJSON": featureLayer.toJson(),
		"zoom": map.getZoom(),
		"centerPt": (map.extent.getCenter()).toJson()
	}

```

You can then retrieve this data after an offline restart by using the following pattern:

```js

	offlineFeaturesManager.getFeatureLayerJSONDataStore(function(success, dataStore){
		if(success){
			myFeatureLayer = new 
				FeatureLayer(JSON.parse(dataStore.featureLayerCollection),{
            	mode: FeatureLayer.MODE_SNAPSHOT,
               	outFields: ["GlobalID","BSID","ROUTES","STOPNAME"]
           	});
           	
           	offlineFeaturesManager.extend(myFeatureLayer,function(result, error) {
           		if(result) {
           			console.log("Layer has been successfully rebuilt while offline!");
           		}
           	}
		}
	});


```

**Step 5** Once a layer has been extended the offline library will enable it with new methods. Here are a few examples that include code snippets of how to take advantage of some of the library's methods. You can also use a combination of methods from `editsStore` and `offlineFeaturesManager`.

####offlineFeaturesManager.proxyPath
By default, the library assumes you are using a CORS-enabled Feature Service. All ArcGIS Online Feature Services are CORS-enabled. If you are hosting your own service and it is not CORS-enabled, then you will need to set this path. More information on downloading and using ArcGIS proxies can be found here: [https://developers.arcgis.com/en/javascript/jshelp/ags_proxy.html](https://developers.arcgis.com/en/javascript/jshelp/ags_proxy.html)

Here's one example:

```js

	offlineFeaturesManager.proxyPath = "../your-local-proxy-directory/proxy.php";

```

####offlineFeaturesManager.goOffline()
Force the library to go offline. Once this condition is set, then any offline edits will be cached locally.

```js
		function goOffline()
		{
			offlineFeaturesManager.goOffline();
			//TO-DO
		}
```

####offlineFeaturesManager.goOnline()
Force the library to return to an online condition. If there are pending edits, the library will attempt to sync them.

```js
		function goOnline()
		{			
			offlineFeaturesManager.goOnline(function(result)
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


####offlineFeaturesManager.getOnlineStatus()
Within your application you can manually check online status and then update your user interface. By using a switch/case statement you can check against three enums that indicate if the library thinks it is offline, online or in the process of reconnecting.

```js		
			
			switch( offlineFeaturesManager.getOnlineStatus() )
			{
				case offlineFeaturesManager.OFFLINE:
					node.innerHTML = "<i class='fa fa-chain-broken'></i> offline";
					domClass.add(node, "offline");
					break;
				case offlineFeaturesManager.ONLINE:
					node.innerHTML = "<i class='fa fa-link'></i> online";
					domClass.add(node, "online");
					break;
				case offlineFeaturesManager.RECONNECTING:
					node.innerHTML = "<i class='fa fa-cog fa-spin'></i> reconnecting";
					domClass.add(node, "reconnecting");
					break;
			}
		
```

####featureLayer.pendingEditsCount(callback)
You can check if there are any edits pending. If there are edits then you can iterate `editsStore.retrieveEditsQueue()` and convert the edits to a readable format via `offlineFeaturesManager.getReadableEdit(edit)`.
		
```js
	
	// Simply get a count
	featureLayer.pendingEditsCount(function(count){
		console.log("There are " + count + " edits pending");
	})		
	
	// Or retrieve all pending edits
	featureLayer.getAllEditsArray(function(success,editsArray){
	 	if(success && editsArray.length > 0){
	 		editsArray.forEach(function(edit){
	 			console.log("Pending edit: " + JSON.stringify(edit));
	 		});
	 	}
	})
			
```
