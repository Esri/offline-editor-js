API offlineFeaturesManager
==================================

##offlineFeaturesManager
Extends and overrides a feature layer. This library allows you to extend esri.layers.FeatureLayer objects with offline capability and manage the resync process.


###Constructor
Constructor | Description
--- | ---
`OfflineFeaturesManager()` | Creates an instance of the offlineFeaturesManager class. This library allows you to extend FeatureLayer objects with offline editing capabilities and manage the online/offline resynchronization process.

###ENUMs
The manager can be in one of these three states (see `getOnlineStatus()` method):

Property | Description
--- | ---
offlineFeaturesManager.ONLINE | all edits will directly go to the server
offlineFeaturesManager.OFFLINE | edits will be enqueued
offlineFeaturesManager.RECONNECTING | sending stored edits to the server

###Methods
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

Event |  Description
--- | ---
offlineFeaturesManager.events.EDITS_SENT | When any edit is actually sent to the server.
offlineFeaturesManager.events.EDITS_ENQUEUED | When an edit is enqueued and not sent to the server.
offlineFeaturesManager.events.ALL_EDITS_SENT |  After going online and there are no pending edits remaining in the queue.

###FeatureLayer Overrides

Methods | Returns | Description
--- | --- | ---
`applyEdits(`  `adds, updates, deletes,`  `callback, errback)` | `deferred`| applyEdits() method is replaced by this library. It's behaviour depends upon online state of the manager. You need to pass the same arguments as to the original applyEdits() method and it returns a deferred object, that will be resolved in the same way as the original, as well as the callbacks will be called under the same conditions. This method looks the same as the original to calling code, the only difference is internal.

##editsStore

Provides a number of public static methods that are used by `offlineFeaturesManager` lib. They provide a low-level storage mechanism using indexedDb browser functions. These methods don't require a `new` statement or a constructor. After the module has been included in your application you can access these methods directly for example: `editsStore.getEditsStoreSizeBytes();`.

###Public Methods
Methods | Returns | Description
--- | --- | ---
`isSupported()` | boolean | Determines if local storage is available. If it is not available then the storage cache will not work. It's a best practice to verify this before attempting to write to the local cache.
`hasPendingEdits()` | boolean | Determines if there are any queued edits in the local cache.
`pendingEditsCount()` | int | The total number of edits that are queued in the local cache.
`getEditsStoreSizeBytes()` | Number | Returns the total size of all pending edits in bytes.
`getLocalStorageSizeBytes()` | Number | Returns the total size in bytes of all items for local storage cached using the current domain name. 

 
