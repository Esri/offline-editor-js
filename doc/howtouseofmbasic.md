How to use the basic edit library
====================================

## `OfflineEditBasic` library

This library allows a developer to extend a feature layer with intermittent offline editing support. You can combine this functionality with offline tiles. For a complete list of features consult the [OfflineEditBasic API doc](offlineeditbasic.md).

**IMPORTANT:** Only use a single instance of OfflineEditBasic per application. With this single instance you can extend offline capabilities to multiple feature layers. This single instance contains all edits for all feature layers initialized via `OfflineEditBasic.extend().` Multiple feature layers share a single database. The database maintains the relationship between each edit and its' respective feature layer via a UUID.

**Step 1** Include `offline.min.js`, `offline-tiles-basic-min.js` and `offline-edit-basic-min.js` in your app's require contstructor. Be sure to include `ofline.mins.js` which is a 3rd party library for detecting if the browser is online or offline. 

The pattern for how we include the tiles and edit library within the `require` statement is called generic script injection. Note that we do assign any of the editing or tile libraries an alias name. For example, we specified the mobile path "esri/map" and we gave it an alias called "Map." But, we did not do the equivalent for `offline-tiles-basic-min.js` or `offline-edit-basic-min.js`.

```html	
    <script src="//github.hubspot.com/offline/offline.min.js"></script>
	<script>
	require([
		"esri/map", 
		"..dist/offline-tiles-basic-min.js",
		"..dist/offline-edit-basic-min.js",
		function(Map)
	{
		...
	});
```

You can also refer to the offline-editor-js within a `define` statement using the following pattern for importing the library. Note you can leave off the `.js` from the module identifier, for example:

```js

	define(["..dist/offline-edit-basic-min"],function(){
		...
	})

```

**Step 2** Once your map is created (either using `new Map()` or using `esriUtils.createMap(webmapid,...)`, you create a new OfflineEditBasic instance and starting assigning events listeners to tie the library into your user interface:

```js
		
		var offlineEdit = new O.esri.Edit.OfflineEditBasic();
		// OPTIONAL - you can change the name of the database
		// offlineEdit.DBNAME = "FIELD_SURVEY3";
		// OPTIONAL - you can change the name of the unique identifier used by the feature service. Default is "objectid".
		// offlineEdit.UID = "GlobalID";
		offlineEdit.on(offlineEdit.events.EDITS_ENQUEUED, updateStatus);
updateStatus);
		offlineEdit.on(offlineEdit.events.EDITS_SENT, updateStatus);		              

		
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


**Step 4** Once a layer has been extended the offline library will enable it with new methods. Here are a few examples that include code snippets of how to take advantage of some of the library's methods. 

#### OfflineEditBasic.proxyPath
By default, the library assumes you are using a CORS-enabled Feature Service. All ArcGIS Online Feature Services are CORS-enabled. If you are hosting your own service and it is not CORS-enabled, then you will need to set this path. More information on downloading and using ArcGIS proxies can be found here: [https://developers.arcgis.com/en/javascript/jshelp/ags_proxy.html](https://developers.arcgis.com/en/javascript/jshelp/ags_proxy.html)

Here's one example:

```js

	offlineEdit.proxyPath = "../your-local-proxy-directory/proxy.php";

```

#### OfflineEditBasic.goOffline()
Force the library to go offline. Once this condition is set, then any offline edits will be cached locally.

```js
		function goOffline()
		{
			offlineEdit.goOffline()														});
			//TO-DO			
		}
```

#### OfflineEditBasic.goOnline()
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

It's important to note that the `results` object contains all the necessary information about successes and failures that may have occurred during the online resync process. Here is a description of what's inside. The `features.responses` object contains information on features sync. 

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

If there was a failure and/or errors, it's a good idea to reevaluate the edits that remain in the database because some edits may have been synced and others may still be pending. Only then, and depending on the error message, should the app try to `goOnline()` again. 

#### OfflineEditBasic.getOnlineStatus()
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

#### OfflineEditBasic.pendingEditsCount(callback)
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

### How to empty the edits database during testing?

Some browsers, like Firefox, make it difficult or impossible to delete data that's in an IndexedDB database. And, there may be times during testing were you are stuck with bad or old data in the database and you need to delete it.

You can run the reset code seperately or you can run the app with this pattern. If you do use the pattern below be sure to comment out the reset code and then re-run the app. You should be good to go again with a completely empty database.

```js

offlineEdit.extend(myFeatureLayer,function(result, error) {
    if(result) {
        console.log("OfflineEditBasic initialized.");
        offlineEdit.resetDatabase(function(success,error){
            console.log("DATABASE DELETED");
        });
    . . .
    . . .
});    

```