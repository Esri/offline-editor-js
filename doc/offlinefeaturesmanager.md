API OfflineFeaturesManager
==========================

##O.esri.Edit.OfflineFeaturesManager
The `offline-edit-min.js` library provides the following tools for working with esri.layers.FeatureLayer objects while partially or fully offline. 


###Constructor
Constructor | Description
--- | ---
`O.esri.Edit.OfflineFeaturesManager()` | Creates an instance of the offlineFeaturesManager class. This library allows you to extend FeatureLayer objects with offline editing capabilities and manage the online/offline resynchronization process.

###Properties
Property | Description
--- | ---
`proxyPath` | Default is null. If you are using a Feature Service that is not CORS-enabled then you will need to set this path.
`attachmentsStore` | Default is null. If you are using attachments, this property gives you access to the associated database.

###ENUMs
The manager can be in one of these three states (see `getOnlineStatus()` method):

Property | Value | Description
--- | --- | ---
`ONLINE` | "online" | All edits will directly go to the server
`OFFLINE` | "offline" | Edits will be enqueued
`RECONNECTING` | "reconnecting" | Sending stored edits to the server

###Methods

The offline-editor-js library provides the following functionality.

Methods | Returns | Description
--- | --- | ---
`extend(layer)`|nothing|Overrides a feature layer, by replacing the `applyEdits()` method of the layer. You can use the FeatureLayer as always, but it's behaviour will be different according to the online status of the manager.
`goOffline()` | nothing | Forces library into an offline state. Any edits applied to extended FeatureLayers during this condition will be stored locally.
`goOnline(callback)` | `callback( boolean, errors )` | Forces library to return to an online state. If there are pending edits, an attempt will be made to sync them with the remote feature server. Callback function will be called when resync process is done.
`getOnlineStatus()` | `ONLINE`, `OFFLINE` or `RECONNECTING`| Determines the current state of the manager. Please, note that this library doesn't detect actual browser offline/online condition. You need to use the `offline.min.js` library included in `vendor\offline` directory to detect connection status and connect events to goOffline() and goOnline() methods. See `military-offline.html` sample.
`getReadableEdit()` | String | A string value representing human readable information on pending edits.


###Events
Application code can subscribe to offlineFeaturesManager events to be notified of different conditions. 

```js

	offlineFeaturesManager.on(
		offlineFeaturesManager.events.EDITS_SENT, 
		function(edits) 
		{
			...
		});
```

Event | Value |  Description
--- | --- | ---
`events.EDITS_SENT` | "edits-sent" | When any edit is actually sent to the server.
`events.EDITS_ENQUEUED` | "edits-enqueued" | When an edit is enqueued and not sent to the server.
`events.ALL_EDITS_SENT` | "all-edits-sent" | After going online and there are no pending edits remaining in the queue.
`events.ATTACHMENT_ENQUEUED` | "attachment-enqueued" | An attachment is in the queue to be sent to the server.
`events.ATTACHMENTS_SENT` | "attachments-sent" | When any attachment is actually sent to the server.

###FeatureLayer Extends

This library extends a FeatureLayer and adds the following additional functionality. Example usage:


```js

	// Extend the FeatureLayer
	var offlineFeaturesManager = new O.esri.Edit.OfflineFeaturesManager();
	offlineFeaturesManager.extent(myCustomFeatureLayer);
	
	// Access additional functionality
	myCustomFeatureLayer.getPhantomGraphicsLayer(function(json){...});

```
 

Methods | Returns | Description
--- | --- | ---
`applyEdits(`  `adds, updates, deletes,`  `callback, errback)` | `deferred`| applyEdits() method is replaced by this library. It's behaviour depends upon online state of the manager. You need to pass the same arguments as to the original applyEdits() method and it returns a deferred object, that will be resolved in the same way as the original, as well as the callbacks will be called under the same conditions. This method looks the same as the original to calling code, the only difference is internal.
`convertGraphicLayerToJSON(` `features, updateEndEvent, callback)` | `callback( featureJSON, layerDefJSON)` | Used with offline browser restarts. In order to reconstitute the feature layer and map you'll need to store the featureJSON and layerDefJSON in local storage and then it read back upon an offline restart. The `updateEndEvent` is the Feature Layer's `update-end` event. The appcache-features.html sample demonstrates this pattern.
`getFeatureDefinition(` `featureLayer, featuresArr` `geometryType, callback)` | Object | Used with offline browser restarts. Pass it a FeatureLayer instance, an array of features and specify the Esri geometry type. It will return a FeatureLayer Definition object that can be used to reconstitute a Feature Layer from scratch. The appcache-features.html sample demonstrates this pattern. Go here for more info on the ArcGIS REST API [layerDefinition](http://resources.arcgis.com/en/help/arcgis-rest-api/index.html#//02r30000004v000000), and [Layer](http://resources.arcgis.com/en/help/arcgis-rest-api/index.html#/Layer/02r30000004q000000/).
`setPhantomLayerGraphics( graphicsArray) ` | nothing | Used with offline browser restarts. Adds the graphics in the `graphicsArray` to the internal phantom graphics layer. This layer is designed to indicate to the user any graphic that has been modified while offline. The appcache-features.html sample demonstrates this pattern.
`getPhantomLayerGraphics( callback) ` | `callback( graphicsLayerJSON)` | Used with offline browser restarts. Returns a JSON representation of the internal phantom graphics layer. This layer is designed to indicate to the user any graphic that has been modified while offline. The appcache-features.html sample demonstrates this pattern.

##O.esri.Edit.EditStore

Provides a number of public methods that are used by `OfflineFeaturesManager` library for storing edits in the browser. Instiantiate this library using a `new` statement. 

###Constructor
Constructor | Description
--- | ---
`O.esri.Edit.EditStore()` | Creates an instance of the EditStore class. This library is responsible for managing the storage, reading, writing, serialization, deserialization of geometric features. 

###Public Methods
Methods | Returns | Description
--- | --- | ---
`isSupported()` | boolean | Determines if local storage is available. If it is not available then the storage cache will not work. It's a best practice to verify this before attempting to write to the local cache.
`hasPendingEdits()` | boolean | Determines if there are any queued edits in the local cache.
`resetEditsQueue()` | nothing | Empties the edits queue and replaces it with an empty string.
`retrieveEditsQueue()` | Array | returns an array of all pending edits.
`pendingEditsCount()` | int | The total number of edits that are queued in the local cache.
`getEditsStoreSizeBytes()` | Number | Returns the total size of all pending edits in bytes.
`getLocalStorageSizeBytes()` | Number | Returns the total size in bytes of all items for local storage cached using the current domain name. 
