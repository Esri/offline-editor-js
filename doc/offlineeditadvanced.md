# API OfflineEditAdvanced

## O.esri.Edit.OfflineEditAdvanced
The `offline-edit-advanced-min.js` library provides the following tools for working with esri.layers.FeatureLayer objects while intermittently and fully offline. 


### Constructor
Constructor | Description
--- | ---
`O.esri.Edit.OfflineEditAdvanced()` | Creates an instance of the OfflineEditAdvanced class. This library allows you to extend FeatureLayer objects with offline editing capabilities and manage the online/offline resynchronization process.

### Properties
Property | Value | Description
--- | --- | ---
`DB_NAME` | "features_store" | Sets the database name. You can instantiate multiple databases within the same application by creating seperate instances of OfflineEditAdvanced.
`DB_OBJECTSTORE_NAME` | "features" | Represents an object store that allows access to a set of data in the database.
`DB_UID` | "objectid" | IMPORTANT!** This tells the database what id to use as a unique identifier. This depends on how your feature service was created. ArcGIS Online services may use something different such as `GlobalID`.
`ATTACHMENTS_DB_NAME` | "attachments_store" | (Added @ v2.7) Sets the attachments database name.
`ATTACHMENTS_DB_OBJECTSTORE_NAME` | "attachments" | (Added @ v2.7) Sets the attachments database object store name.
`proxyPath` | null | Default is `null`. If you are using a Feature Service that is not CORS-enabled then you will need to set this path.
`attachmentsStore` | null | Default is `null`. If you are using attachments, this property gives you access to the associated database.
`ENABLE_FEATURECOLLECTION` | `false` | Enabling this property will allow the library to create a snapshot of the feature layer and make it available via `getFeatureCollections()`. When you extend a layer and you want to use a custom `dataStore` then leave this property set to `false` so that you don't end up with two copies of the feature layer in the database.

### ENUMs
The manager can be in one of these three states (see `getOnlineStatus()` method):

Property | Value | Description
--- | --- | ---
`ONLINE` | "online" | All edits will directly go to the server
`OFFLINE` | "offline" | Edits will be enqueued
`RECONNECTING` | "reconnecting" | Sending stored edits to the server

### Methods

OfflineEditAdvanced provides the following functionality.

**IMPORTANT:** The library currently only works offline when the feature layer's `mode` is set to `FeatureLayer.MODE_SNAPSHOT`.

Methods | Returns | Description
--- | --- | ---
`extend( layer,` `callback, dataStore)`|`callback( boolean, errors )`| Overrides a feature layer, by replacing the `applyEdits()` method of the layer. You can use the FeatureLayer as always, but it's behaviour will be enhanced according to the online status of the manager and the capabilities included in this library.<br><br> `Callback` indicates the layer has been extended. <br><br>`dataStore` is an optional Object that contains any information you need when reconsistuting the layer after an offline browser restart. Refer to the [How to use the advanced edit library doc](howtouseofmadvancedlibrary.md) for addition information.
`goOffline()` | nothing | Forces library into an offline state. Any edits applied to extended FeatureLayers during this condition will be stored locally.
`goOnline(callback)` | No attachments: `callback( {success: boolean, responses: Object } )`<br><br> With attachments: `callback( {success: boolean, responses: uploadedResponses, dbResponses: dbResponses })` | Forces library to return to an online state. If there are pending edits, an attempt will be made to sync them with the remote feature server. Callback function will be called when resync process is done. <br><br>Refer to the [How to use the advanced edit library doc](howtouseofmadvancedlibrary.md) for addition information on the `results` object.
`getOnlineStatus()` | `ONLINE`, `OFFLINE` or `RECONNECTING`| Determines the current state of the manager. Please, note that this library doesn't detect actual browser offline/online condition. You need to use the `offline.min.js` library included in `vendor\offline` directory to detect connection status and connect events to goOffline() and goOnline() methods. See `draw-pointlinepoly-offline.html` sample.
`getFeatureCollections( callback )` | `callback( boolean, Object)` | (Added @ v2.9) Returns and Object that contains the latest `featureLayerCollection` snapshot for each feature layer that is using the library. Each collection is updated automatically by the library when there is an associated `ADD`, `UPDATE` or `DELETE` operation.<br><br>This method should be used when working with pre-built Esri widgets such as the `AttributeInspector.`
`getFeatureLayerJSONDataStore( callback )` | `callback( boolean, Object)` | (Added @ v2.7.1) Returns the feature layer's dataStore Object that was created using the `OfflineEditAdvanced()` constructor. Offers more control what is provided by `getFeatureCollections()`.


### Events
Application code can subscribe to OfflineEditAdvanced events to be notified of different conditions. 

```js

	offlineEdit.on(
		offlineEdit.events.ALL_EDITS_SENT, 
		function(edits) 
		{
			...
		});		
```

Event | Value | Returns |  Description
--- | --- | --- | ---
`events.EDITS_SENT` | "edits-sent" | nothing | When any edit is actually sent to the server while online-only.
`events.EDITS_SENT_ERROR` | "edits-sent-error" | {msg:error} | There was a problem while sending errors to the server.
`events.EDITS_ENQUEUED` | "edits-enqueued" | nothing | When an edit is enqueued and not sent to the server.
`events.EDITS_ENQUEUED_ERROR` | "edits-enqueued-error" | {msg:error} | An error occurred while trying to store the edit. In your app it is recommended to verify if the edit is in the database or not.
`events.ALL_EDITS_SENT` | "all-edits-sent" | {[addResults] ,[updateResults], [deleteResults]} | After going online and there are no pending edits remaining in the queue. Be sure to also check for `EDITS_SENT_ERROR`. 
`events.ATTACHMENT_ENQUEUED` | "attachment-enqueued" | nothing | An attachment is in the queue to be sent to the server.
`events.ATTACHMENTS_SENT` | "attachments-sent" | nothing | When any attachment is actually sent to the server.

### FeatureLayer 

A FeatureLayer that has been extended using OfflineEditAdvancedoff.extend() will gain access to the following additional functionality. Example usage:


```js

	// Extend the FeatureLayer
	var offlineEdit = new O.esri.Edit.OfflineEditAdvanced();
	offlineEdit.extend(myCustomFeatureLayer);
	
	// Access additional functionality
	myCustomFeatureLayer.getPhantomGraphicsLayer(function(json){...});

```
 

Methods | Returns | Description
--- | --- | ---
`applyEdits(`  `adds, updates, deletes,`  `callback, errback)` | `deferred` | applyEdits() method is replaced by this library. It's behaviour depends upon online state of the manager. You need to pass the same arguments as to the original applyEdits() method and it returns a deferred object, that will be resolved in the same way as the original, as well as the callbacks will be called under the same conditions. This method looks the same as the original to calling code, the only difference is internal. Listen for `EDITS_ENQUEUED` or `EDITS_ENQUEUED_ERROR`.
`addAttachment( objectId, formNode,` `callback,errback)` | `deferred` | Adds a single attachment.
`updateAttachment( objectId, attachmentId,` `formNode, callback, errback)` | `deferred` | (Added @ v2.7) Updates an existing attachment.
`deleteAttachments( objectId, attachmentsIds,` `callback, errback)`| `deferred` | Deletes existing attachments as well as attachments that were created while offline.
`getAttachmentsUsage(callback)` | `callback(usageObject,error)` | (Added @ v2.7) Returns the approximate size of the attachments database. The usage Object is {sizeBytes: number, attachmentCount: number}.
`resetAttachmentsDatabase( callback)` | `callback(boolean, error)` | (Added @ v2.7) Resets the entire attachments database  -- use with **caution**.
`convertGraphicLayerToJSON(` `features, updateEndEvent, callback)` | `callback( featureJSON, layerDefJSON)` | You can also store the entire feature layer's JSON using the `dataStore` property in the `OfflineFeatureManager` contructor. Used with offline browser restarts. In order to reconstitute the feature layer and map you'll need to store the featureJSON and layerDefJSON in local storage and then it read back upon an offline restart. The `updateEndEvent` is the Feature Layer's `update-end` event object. The appcache-features.html sample demonstrates this pattern.
`getFeatureDefinition(` `featureLayer, featuresArr` `geometryType, callback)` | `Object` | Used with offline browser restarts. You can also store the entire feature layer's JSON using the `dataStore` property in the `OfflineFeatureManager` contructor. Pass it a FeatureLayer instance, an array of features and specify the Esri geometry type. It will return a FeatureLayer Definition object that can be used to reconstitute a Feature Layer from scratch. The appcache-features.html sample demonstrates this pattern. Go here for more info on the ArcGIS REST API [layerDefinition](http://resources.arcgis.com/en/help/arcgis-rest-api/index.html#//02r30000004v000000), and [Layer](http://resources.arcgis.com/en/help/arcgis-rest-api/index.html#/Layer/02r30000004q000000/).
`setPhantomLayerGraphics( graphicsArray) ` | nothing | Used with offline browser restarts. Adds the graphics in the `graphicsArray` to the internal phantom graphics layer. This layer is designed to indicate to the user any graphic that has been modified while offline. The appcache-features.html sample demonstrates this pattern.
`getPhantomLayerGraphics( callback) ` | `callback( graphicsLayerJSON)` | Used with offline browser restarts. Returns a JSON representation of the internal phantom graphics layer. This layer is designed to indicate to the user any graphic that has been modified while offline. The appcache-features.html sample demonstrates this pattern.
`resetDatabase(callback)` | `callback( boolean, error)` | Full edits database reset -- use with **caution**. If some edits weren't successfully sent, then the record will still exist in the database. If you use this function then those pending records will also be deleted.
`pendingEditsCount(callback)` | `callback( int )` | Returns the number of pending edits in the database.  
`getUsage(callback)`| `callback({usage}, error)` | Returns the approximate size of the edits database in bytes. The usage Object is {sizeBytes: number, editCount: number}.
`getPhantomGraphicsArray( callback)` | `callback(boolean, array)` | Used with offline browser restarts. Returns an array of phantom graphics from the database.
`getAllEditsArray(callback)` | `callback(boolean, array)` | Returns an array of all edits stored in the database. Each item in array is an object that contains: {"id":"internalID", "operation":"add, update, delete","layer":"layerURL","type":"esriGeometryType","graphic":"esri.Graphic JSON"}
`getFeatureLayerJSON(url,callback)` | `callback( boolean, JSON )` | Helper function that retrieves the feature layer's JSON using `f=json` parameter.
`setFeatureLayerJSONDataStore( jsonObject, callback)` | `callback( boolean, error)` | Sets the optional feature layer storage object. Can be used instead of the `OfflineFeatureManager` constructor's `dataStore` property or to update it. `jsonObject` can be any Object. However, they key name `id` is reserved. This data store object is used for full offline browser restarts.
`getFeatureLayerJSONDataStore(callback)` | `callback( true, object )` or `callback( false, errorString)` | Retrieves the optional feature layer storage object. This data store object is used for full offline browser restarts.
`convertFeatureGraphicsToJSON(` `[features],callback)` | `callback( jsonString )` | Helper function that converts an array of feature layer graphics to a JSON string.