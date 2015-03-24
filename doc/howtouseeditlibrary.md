How to use the edit library
===========================

##`edit` library

The `edit` library allows a developer to extend a feature layer with offline editing support. You can combine this functionality with offline tiles. For a complete list of features consult the [OfflineFeaturesManager API doc](offlinefeaturesmanager.md).

**Step 1** Include `offline.min.js`, `offline-tiles-basic-min.js` and `offline-edit-min.js` in your app. `ofline.mins.js` is another 3rd party library for detecting if the browser is online or offline. The pattern for how we include the tiles and edit library within the `require` statement is called generic script injection.

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

Also, if you have other AMD libraries in your project and you want to refer to offline-editor-js within a `define` statement you can use the following pattern for importing the library. Note you can leave off the `.js` from the module identifier, for example:

```js

	define(["..dist/offline-edit-min"],function(){
		...
	})

```

**Step 2** Once your map is created (either using new Map() or using esriUtils.createMap(webmapid,...), you create a new OfflineFeaturesManager instance and starting assigning events listeners to tie the library into your user interface:

```js
		
		var offlineFeaturesManager = new O.esri.Edit.OfflineFeaturesManager();
		offlineFeaturesManager.on(offlineFeaturesManager.events.EDITS_ENQUEUED, updateStatus);
		offlineFeaturesManager.on(offlineFeaturesManager.events.EDITS_SENT, updateStatus);
		offlineFeaturesManager.on(offlineFeaturesManager.events.ALL_EDITS_SENT, updateStatus);		              
		offlineFeaturesManager.on(offlineFeaturesManager.events.EDITS_SENT_ERROR, handleEditsSentError);
		
```		

NOTE: You can also monitor standard ArcGIS API for JavaScript layer events using the typical pattern such as:

```js

      	offlineFeatureLayer.on("edits-complete", handleEditsComplete);

```

**Step 3** Create an array of FeatureLayers and add them to the map, and listen for the `layers-add-result` event to continue FeatureLayer and editor widgets initialization. In this example we are initializing multiple layers, but you can just as easily initialize a single layer.

```js
	map.on('layers-add-result', initEditor);
	
	var fsUrl = "http://services2.arcgis.com/CQWCKwrSm5dkM28A/arcgis/rest/services/Military/FeatureServer/";
		// var layersIds = [0,1,2,3,4,5,6];
		var layersIds = [1,2,3];
		var featureLayers = [];

		layersIds.forEach(function(layerId)
		{
			var layer = new FeatureLayer(fsUrl + layerId, {
				mode: FeatureLayer.MODE_SNAPSHOT,
				outFields: ['*']
			});
			featureLayers.push(layer);			
		})

		map.addLayers(featureLayers);
```

**Step 4** After the `layers-add-result` event fires, iterate thru each layer and extend it using the `extend()` method. If you only have one feature layer you can simply just extent it without having to iterate:

```js
		function initEditor(evt)
		{
			try {
				/* extend layer with offline detection functionality */
				evt.layers.forEach(function(result)
				{
					var layer = result.layer;
					offlineFeaturesManager.extend(layer);
					layer.on('update-end', logCurrentObjectIds);
				});
			catch(err){
			 	. . .
			}		
		}			
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
			offlineFeaturesManager.goOnline(function(success,errors)
			{
				if(success){
				    //Modify user inteface depending on success/failure
				}				
			});
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
