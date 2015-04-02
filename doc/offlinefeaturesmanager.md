API OfflineFeaturesManager
==========================

##O.esri.Edit.OfflineFeaturesManager
The `offline-edit-min.js` library provides the following tools for working with esri.layers.FeatureLayer objects while partially or fully offline. 


###Constructor
Constructor | Description
--- | ---
`O.esri.Edit.OfflineFeaturesManager()` | Creates an instance of the OfflineFeaturesManager class. This library allows you to extend FeatureLayer objects with offline editing capabilities and manage the online/offline resynchronization process.

###Properties
Property | Value | Description
--- | --- | ---
`DB_NAME` | "features_store" | **New @ v2.5** Sets the database name. You can instantiate multiple databases within the same application by creating seperate instances of OfflineFeaturesManager.
`DB_OBJECTSTORE_NAME` | "features" | **New @ v2.5** Represents an object store that allows access to a set of data in the database.
`DB_UID` | "objectid" | **New @ v2.5 IMPORTANT!** This tells the database what id to use as a unique identifier. This depends on how your feature service was created. ArcGIS Online services may use something different such as `GlobalID`.
`proxyPath` | null | Default is `null`. If you are using a Feature Service that is not CORS-enabled then you will need to set this path.
`attachmentsStore` | null | Default is `null`. If you are using attachments, this property gives you access to the associated database.

###ENUMs
The manager can be in one of these three states (see `getOnlineStatus()` method):

Property | Value | Description
--- | --- | ---
`ONLINE` | "online" | All edits will directly go to the server
`OFFLINE` | "offline" | Edits will be enqueued
`RECONNECTING` | "reconnecting" | Sending stored edits to the server

###Methods

OfflineFeaturesManager provides the following functionality.

**IMPORTANT:** The library currently only works offline when the feature layer's `mode` is set to `FeatureLayer.MODE_SNAPSHOT`.

Methods | Returns | Description
--- | --- | ---
`extend(layer,callback,dataStore)`|`callback( boolean, errors )`| **Updated @ v2.5** Overrides a feature layer, by replacing the `applyEdits()` method of the layer. You can use the FeatureLayer as always, but it's behaviour will be enhanced according to the online status of the manager and the capabilities included in this library. `Callback` is related to initialization the library. `dataStore` is an optional Object that contains any information you need when reconsistuting the layer after an offline browser restart. Refer to the [How to use the edit library doc](howtouseeditlibrary.md) for addition information.
`goOffline()` | nothing | Forces library into an offline state. Any edits applied to extended FeatureLayers during this condition will be stored locally.
`goOnline(callback)` | `callback( boolean, errors )` | Forces library to return to an online state. If there are pending edits, an attempt will be made to sync them with the remote feature server. Callback function will be called when resync process is done.
`getOnlineStatus()` | `ONLINE`, `OFFLINE` or `RECONNECTING`| Determines the current state of the manager. Please, note that this library doesn't detect actual browser offline/online condition. You need to use the `offline.min.js` library included in `vendor\offline` directory to detect connection status and connect events to goOffline() and goOnline() methods. See `military-offline.html` sample.
`getReadableEdit()` | String | **DEPRECATED** @ v2.5. A string value representing human readable information on pending edits. Use `featureLayer.getAllEditsArray()`.


###Events
Application code can subscribe to offlineFeaturesManager events to be notified of different conditions. 

```js

	offlineFeaturesManager.on(
		offlineFeaturesManager.events.ALL_EDITS_SENT, 
		function(edits) 
		{
			...
		});		
```

Event | Value | Returns |  Description
--- | --- | --- | ---
`events.EDITS_SENT` | "edits-sent" | nothing | **Updated @ v2.5** When any edit is actually sent to the server while online-only.
`events.EDITS_SENT_ERROR` | "edits-sent-error" | {msg:error} | **New @ v2.5** There was a problem while sending errors to the server.
`events.EDITS_ENQUEUED` | "edits-enqueued" | nothing | When an edit is enqueued and not sent to the server.
`events.EDITS_ENQUEUED_ERROR` | "edits-enqueued-error" | {msg:error} | **New @ v2.5** An error occurred while trying to store the edit. In your app it is recommended to verify if the edit is in the database or not.
`events.ALL_EDITS_SENT` | "all-edits-sent" | {[addResults] ,[updateResults], [deleteResults]} | After going online and there are no pending edits remaining in the queue. Be sure to also check for `EDITS_SENT_ERROR`. 
`events.ATTACHMENT_ENQUEUED` | "attachment-enqueued" | nothing | An attachment is in the queue to be sent to the server.
`events.ATTACHMENTS_SENT` | "attachments-sent" | nothing | When any attachment is actually sent to the server.

###FeatureLayer 

A FeatureLayer that has been extended using OfflineFeaturesManager.extend() will gain access to the following additional functionality. Example usage:


```js

	// Extend the FeatureLayer
	var offlineFeaturesManager = new O.esri.Edit.OfflineFeaturesManager();
	offlineFeaturesManager.extend(myCustomFeatureLayer);
	
	// Access additional functionality
	myCustomFeatureLayer.getPhantomGraphicsLayer(function(json){...});

```
 

Methods | Returns | Description
--- | --- | ---
`applyEdits(`  `adds, updates, deletes,`  `callback, errback)` | `deferred` | applyEdits() method is replaced by this library. It's behaviour depends upon online state of the manager. You need to pass the same arguments as to the original applyEdits() method and it returns a deferred object, that will be resolved in the same way as the original, as well as the callbacks will be called under the same conditions. This method looks the same as the original to calling code, the only difference is internal. Listen for `EDITS_ENQUEUED` or `EDITS_ENQUEUED_ERROR`.
`convertGraphicLayerToJSON(` `features, updateEndEvent, callback)` | `callback( featureJSON, layerDefJSON)` | Not really needed @ v2.5 when you can store the entire feature layer's JSON using the `dataStore` property in the `OfflineFeatureManager` contructor. Used with offline browser restarts. In order to reconstitute the feature layer and map you'll need to store the featureJSON and layerDefJSON in local storage and then it read back upon an offline restart. The `updateEndEvent` is the Feature Layer's `update-end` event object. The appcache-features.html sample demonstrates this pattern.
`getFeatureDefinition(` `featureLayer, featuresArr` `geometryType, callback)` | Object | Used with offline browser restarts. Not really needed @ v2.5 when you can store the entire feature layer's JSON using the `dataStore` property in the `OfflineFeatureManager` contructor. Pass it a FeatureLayer instance, an array of features and specify the Esri geometry type. It will return a FeatureLayer Definition object that can be used to reconstitute a Feature Layer from scratch. The appcache-features.html sample demonstrates this pattern. Go here for more info on the ArcGIS REST API [layerDefinition](http://resources.arcgis.com/en/help/arcgis-rest-api/index.html#//02r30000004v000000), and [Layer](http://resources.arcgis.com/en/help/arcgis-rest-api/index.html#/Layer/02r30000004q000000/).
`setPhantomLayerGraphics( graphicsArray) ` | nothing | Used with offline browser restarts. Adds the graphics in the `graphicsArray` to the internal phantom graphics layer. This layer is designed to indicate to the user any graphic that has been modified while offline. The appcache-features.html sample demonstrates this pattern.
`getPhantomLayerGraphics( callback) ` | `callback( graphicsLayerJSON)` | Used with offline browser restarts. Returns a JSON representation of the internal phantom graphics layer. This layer is designed to indicate to the user any graphic that has been modified while offline. The appcache-features.html sample demonstrates this pattern.
`resetDatabase(callback)` | `callback( boolean, error)` | **New @ v2.5** Full database reset -- use with **caution**. If some edits weren't successfully sent, then the record will still exist in the database. If you use this function then those pending records will also be deleted.
`pendingEditsCount(callback)` | `callback( int )` | **New @ v2.5** Returns the number of pending edits in the database.  
`getUsage(callback)`| `callback({usage}, error)` | **New @ v2.5** Returns the approximate size of the database in bytes. the usage Object is {sizeBytes: number, editCount: number}.
`getPhantomGraphicsArray( callback)` | `callback(boolean, array)` | **New @ v2.5** Used with offline browser restarts. Returns an array of phantom graphics from the database.
`getAllEditsArray(callback)` | `callback(boolean, array)` | **New @ v2.5** Returns an array of all edits stored in the database. Each item in array is an object that contains: {"id":"internalID", "operation":"add, update, delete","layer":"layerURL","type":"esriGeometryType","graphic":"esri.Graphic JSON"}
`getFeatureLayerJSON(url,callback)` | `callback( boolean, JSON )` | **New @ v2.5.** Helper function that retrieves the feature layer's JSON using `f=json` parameter.
`setFeatureLayerJSONDataStore( jsonObject, callback)` | `callback( boolean, error)` | **New @ v2.5** Sets the optional feature layer storage object. Can be used instead of the `OfflineFeatureManager` constructor's `dataStore` property or to update it. `jsonObject` can be any Object. However, they key name `id` is reserved. This data store object is used for full offline browser restarts.
`getFeatureLayerJSONDataStore(callback)` | `callback( true, object )` or `callback( false, errorString)` | **New @ v2.5** Retrieves the optional feature layer storage object. This data store object is used for full offline browser restarts.
`convertFeatureGraphicsToJSON(` `[features],callback)` | `callback( jsonString )` | **New @ v2.5.** Helper function that converts an array of feature layer graphics to a JSON string.

##O.esri.Edit.EditStore

Provides a number of public methods that are used by `OfflineFeaturesManager` library for storing edits in the browser. Instiantiate this library using a `new` statement. 

__NOTE:__ Use with caution as most of the methods are RESERVED for internal library use-only. All common use functions should be accessed directly through the feature layer after it has been extended by the offlineFeaturesManager.

###Constructor
Constructor | Description
--- | ---
`O.esri.Edit.EditStore()` | Creates an instance of the EditStore class. This library is responsible for managing the storage, reading, writing, serialization, deserialization of geometric features. 

###ENUMs

Property | Value | Description
--- | --- | ---
`ADD` | "add" | Represents a FeatureLayer.add() operation.
`UPDATE` | "update" | Represents a FeatureLayer.update() operation.
`DELETE` | "delete" | Represents a FeatureLayer.delete() operation.

###Public Properties

Property | Value | Description
--- | --- | ---
`dbName` | "features_store" | **New @ v2.5.** Defines the database name. You can have multiple databases within the same application.
`objectStoreName` | "features" | **New @ v2.5.** Represents an object store that allows access to a set of data in the IndexedDB database, looked up via primary key. 

###Public Methods
Methods | Returns | Description
--- | --- | ---
`isSupported()` | boolean | Determines if local storage is available. If it is not available then the storage cache will not work. It's a best practice to verify this before attempting to write to the local cache.
`pushEdit(` `operation, layer, graphic, callback)` | `callback(` `true, edit)` or  `callback(` `false, message)`| Pushes an edit into storage. Operation is the corresponding enum. Layer is a reference to the feature layer, and the graphic is the graphic object associated with the edit.
`resetEditsQueue(callback)` | `callback( boolean, error)` | **Updated @ v2.5.** Use with **caution**, initiates a complete database reset. If some edits weren't sent when your app goes online, then you will delete those records as well.
`pendingEditsCount( callback )` | `callback( int )` | **Updated @ v2.5.** The total number of edits that are queued in the database.
`getAllEditsArray( callback)` | `callback()` | **New @ v2.5.** Returns all edits in an iterable array.
`getFeatureLayerJSON( callback)` | `callback( boolean, Object)` | **New @ v2.5.** Returns the feature layer JSON object.
`deleteFeatureLayerJSON( callback)` | `callback( boolean, {message:String)` | **New @ v2.5.** Delete the feature layer JSON object from the database.
`pushFeatureLayerJSON( dataObject, callback)` | `callback( boolean, error)` | **New @ v2.5.** Use this to store any static FeatureLayer or related JSON data related to your app that will assist in restoring the layer after an offline restart. Supports adds and updates, will not overwrite entire object.
`getUsage( callback)` | `callback( int, errorString)` | **New @ v2.5.** Returns the approximate size of the database in bytes.
`hasPendingEdits()` | boolean | **Deprecated @ v2.5.** Determines if there are any queued edits in the local cache. Use `pendingEditsCount()` instead.
`retrieveEditsQueue()` | Array | **Deprecated @ v2.5.** Returns an array of all pending edits.
`getEditsStoreSizeBytes()` | Number | **Deprecated @ v2.5.** Returns the total size of all pending edits in bytes. Use `getUsage()` instead.
`getLocalStorageSizeBytes()` | Number | **Deprecated @ v2.5.** Returns the total size in bytes of all items for local storage cached using the current domain name. Use `getUsage()` instead.

##O.esri.Edit.AttachmentsStore

Provides a number of public methods that are used by `OfflineFeaturesManager` library for storing attachments in the browser. Instiantiate this library using a `new` statement. Instiantiate this library using a `new` statement. 

###Constructor
Constructor | Description
--- | ---
`O.esri.Edit.AttachmentsStore()` | Creates an instance of the AttachmentsStore class. This library is responsible for managing the storage of attachments. 

###Properties

Property | Value | Description
--- | --- | ---
`DB_NAME` | "attachments_store" | Represents a FeatureLayer.add() operation.
`OBJECT_STORE_NAME` | "attachments" | Represents a FeatureLayer.update() operation.

###Public Methods
Methods | Returns | Description
--- | --- | ---
`store(` `featureLayerUrl, attachmentId,` `objectId, attachmentFile, callback)` |  `callback(` `true, edit)` or  `callback(` `false, message)` | Stores attachment. AttachmentId is temporary. For more information on `objectId` see the [FeatureLayer.addAttachments()](https://developers.arcgis.com/javascript/jsapi/featurelayer-amd.html#addattachment) doc.
`retrieve(attachmentId, callback)` | `callback(` `true, result)` or  `callback(` `false, message)` | Retrieves an attachment by its unique `attachmentId`. 
`getAttachmentsByFeatureId(featureLayerUrl,`  `objectId, callback)` | `callback([attachments])` | Retrieves all attachments having the unique `objectId`. For more information on `objectId` see the [FeatureLayer.addAttachments()](https://developers.arcgis.com/javascript/jsapi/featurelayer-amd.html#addattachment) doc 
`getAttachmentsByFeatureLayer(featureLayerUrl, callback)` | `callback([attachments])` | Retrieves all attachments in the specified feature layer. 
`getAllAttachments(callback)` | `callback([attachments])` | Retrieves all attachments in the database. 
`deleteAttachmentsByFeatureId(featureLayerUrl,` `objectId, callback)` | `callback(int)` | Deletes all attachments having the unique `objectId`. Callback provides the number of attachments deleted. 
`deleteAll(callback)` | `callback(` `true)` or  `callback(` `false, message)`  | Deletes all attachments in the database. 
`replaceFeatureId(featureLayerUrl,` `oldId, newId, callback)` | `callback(int)`  | Gives an attachment a new objectId. Returns the number of attachments that were updated. 
`getUsage(callback)` | `callback({sizeBytes: int,` `attachmentCount: int})`  | Returns an approximation of how much data is stored in the database. 