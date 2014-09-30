How to use the edit library
===========================

##`edit` library

The `edit` library allows a developer to extend a feature layer with offline editing support. You can combine this functionality with offline tiles.

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
```		

**Step 3** Create an array of FeatureLayers and add them to the map, and listen for the `layers-add-result` event to continue FeatureLayer and editor widgets initialization

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

**Step 4** After the `layers-add-result` event fires, iterate thru each layer and extend it using the `extend()` method:

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
**Step 5** Use the new offline methods on the layer to prepare for offline mode while still online. Here are a few examples that include code snippets of how to take advantage of some of the libraries methods. You can use a combination of methods from `editsStore` and `offlineFeaturesManager`.

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
			offlineFeaturesManager.goOnline(function()
			{
				//Modify user inteface depending on success/failure
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

####editStore.hasPendingEdits()
You can check if there are any edits pending by using the EditStore library. If there are edits then you can iterate `editsStore.retrieveEditsQueue()` and convert the edits to a readable format via `offlineFeaturesManager.getReadableEdit(edit)`.
		
```js
			var editStore = new O.esri.Edit.EditStore();
			if( editStore.hasPendingEdits())
			{
				var edits = editStore.retrieveEditsQueue();
				edits.forEach(function(edit)
				{
					var readableEdit = offlineFeaturesManager.getReadableEdit(edit);
					//Update user interface to display readable edits
				},this);
			}
			else
			{
				//Tell user interface no edits are pending
			}
```
