# API OfflineEditBasic

## O.esri.Edit.OfflineEditBasic
The `offline-edit-basic-min.js` library provides the following tools for working with esri.layers.FeatureLayer objects while intermittently offline. 


### Constructor
Constructor | Description
--- | ---
`O.esri.Edit.OfflineEditBasic()` | Creates an instance of the OfflineEditBasic class. This library allows you to extend FeatureLayer objects with offline editing capabilities and manage the online/offline resynchronization process.

### Properties
Property | Value | Description
--- | --- | ---
`DB_NAME` | "features_store" | Sets the database name. You can instantiate multiple databases within the same application by creating seperate instances of OfflineEditAdvanced.
`DB_OBJECTSTORE_NAME` | "features" | Represents an object store that allows access to a set of data in the database.
`DB_UID` | "objectid" | IMPORTANT!** This tells the database what id to use as a unique identifier. This depends on how your feature service was created. ArcGIS Online services may use something different such as `GlobalID`.
`proxyPath` | null | Default is `null`. If you are using a Feature Service that is not CORS-enabled then you will need to set this path.

### ENUMs
The manager can be in one of these three states (see `getOnlineStatus()` method):

Property | Value | Description
--- | --- | ---
`ONLINE` | "online" | All edits will directly go to the server
`OFFLINE` | "offline" | Edits will be enqueued
`RECONNECTING` | "reconnecting" | Sending stored edits to the server

### Methods

OfflineEditBasic provides the following functionality.

**IMPORTANT:** The library currently only works offline when the feature layer's `mode` is set to `FeatureLayer.MODE_SNAPSHOT`.

Methods | Returns | Description
--- | --- | ---
`extend( layer,` `callback, dataStore)`|`callback( boolean, errors )`| Overrides a feature layer, by replacing the `applyEdits()` method of the layer. You can use the FeatureLayer as always, but it's behaviour will be enhanced according to the online status of the manager and the capabilities included in this library.<br><br> `Callback` indicates the layer has been extended. <br><br>`dataStore` is an optional Object that contains any information you need when reconsistuting the layer after an offline browser restart. Refer to the [How to use the edit library doc](howtouseeditlibrary.md) for addition information.
`goOffline()` | nothing | Forces library into an offline state. Any edits applied to extended FeatureLayers during this condition will be stored locally.
`goOnline(callback)` | No attachments: `callback( {success: boolean, responses: Object } )`<br><br> With attachments: `callback( {success: boolean, responses: uploadedResponses, dbResponses: dbResponses })` | Forces library to return to an online state. If there are pending edits, an attempt will be made to sync them with the remote feature server. Callback function will be called when resync process is done. <br><br>Refer to the [How to use the edit library doc](howtouseeditlibrary.md) for addition information on the `results` object.
`getOnlineStatus()` | `ONLINE`, `OFFLINE` or `RECONNECTING`| Determines the current state of the manager. Please, note that this library doesn't detect actual browser offline/online condition. You need to use the `offline.min.js` library included in `vendor\offline` directory to detect connection status and connect events to goOffline() and goOnline() methods. See `military-offline.html` sample.


### Events
Application code can subscribe to OfflineEditBasic events to be notified of different conditions. 

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
`events.EDITS_ENQUEUED` | "edits-enqueued" | nothing | When an edit is enqueued and not sent to the server.
`events.EDITS_ENQUEUED_ERROR` | "edits-enqueued-error" | {msg:error} | An error occurred while trying to store the edit. In your app it is recommended to verify if the edit is in the database or not.


### FeatureLayer 

A FeatureLayer that has been extended using OfflineEditBasic.extend() will gain access to the following additional functionality. Example usage:


```js

	// Extend the FeatureLayer
	var offlineEdit = new O.esri.Edit.OfflineEditBasic();
	offlineEdit.extend(myCustomFeatureLayer);

```
 

Methods | Returns | Description
--- | --- | ---
`applyEdits(`  `adds, updates, deletes,`  `callback, errback)` | `deferred` | applyEdits() method is replaced by this library. It's behaviour depends upon online state of the manager. You need to pass the same arguments as to the original applyEdits() method and it returns a deferred object, that will be resolved in the same way as the original, as well as the callbacks will be called under the same conditions. This method looks the same as the original to calling code, the only difference is internal. Listen for `EDITS_ENQUEUED`.
`resetDatabase(callback)` | `callback( boolean, error)` | Full edits database reset -- use with **caution**. If some edits weren't successfully sent, then the record will still exist in the database. If you use this function then those pending records will also be deleted.
`pendingEditsCount(callback)` | `callback( int )` | Returns the number of pending edits in the database.  
`getUsage(callback)`| `callback({usage}, error)` | Returns the approximate size of the edits database in bytes. The usage Object is {sizeBytes: number, editCount: number}.
`getAllEditsArray(callback)` | `callback(boolean, array)` | Returns an array of all edits stored in the database. Each item in array is an object that contains: {"id":"internalID", "operation":"add, update, delete","layer":"layerURL","type":"esriGeometryType","graphic":"esri.Graphic JSON"}
