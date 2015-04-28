#Attachment Support
The __offline-edit-min.js__ has support for attachments in offline mode. See [attachments-editor.html](../samples/attachments-editor.html) sample.

##What you can do:
While your application is in `OFFLINE` mode, you can:

* add attachments to any feature, either a feature that already exists in the server or a newly added feature.
* delete attachments from features if you have pre-cached the attachments or if you have added a feature while offline you can delete it from the local database. 
* query for attachments of a particular feature. It will only return attachments that have been added while offline.
* view the attached files (see __limitations__ below)
* when the app goes to `ONLINE` mode, all attachments are sent back to the server and removed from the local database.

##How you do use it:
You can either use the ArcGIS FeatureLayer API _(esri.layers.FeatureLayer)_ directly or use the [AttachmentEditor](https://developers.arcgis.com/javascript/jsapi/attachmenteditor-amd.html) widget that supports feature attachment editing. Both approaches work well, and the code you write works the same either if you are on `ONLINE` or `OFFLINE` modes.

The only differences in your code are:

* create an offlineFeaturesManager enabled for attachment support. Make sure you initialize the attachments database:

            var offlineFeaturesManager = new esri.OfflineFeaturesManager();
            offlineFeaturesManager.initAttachments();

* extend your featureLayers with offline editing functionality:

		offlineFeaturesManager.extend(featureLayer, function(success, error)
		{
			console.log("layer extended", success? "success" : "failed");
		});

You can also modified the database's name and object store name. This functionality is typically used for advanced
users that have a requirement to run multiple databases:

            var offlineFeaturesManager = new esri.OfflineFeaturesManager();
            offlineFeaturesManager.ATTACHMENTS_DB_NAME = "attachment-store-two";
            offlineFeaturesManager.ATTACHMENTS_DB_OBJECTSTORE_NAME = "attachments-two";
            
            offlineFeaturesManager.initAttachments();

###Using the FeatureLayer API
The FeatureLayer API for handling attachments consists primarily of four methods. In general you should let `OfflineFeaturesManager`
handle interactions with attachments and it's not recommended to interact with the attachments database directly. 

* `layer.queryAttachmentInfos(objectId,callback,errback)` [doc](https://developers.arcgis.com/javascript/jsapi/featurelayer.html#queryattachmentinfos)
* `layer.addAttachment(objectId, formNode, callback, errback)` [doc](https://developers.arcgis.com/javascript/jsapi/featurelayer.html#addattachment)
* `layer.updateAttachment(objectId, attachmentId, formNode, callback, errback)` - as of April 2015 the ArcGIS API for JavaScript document has this functionality but it's not documented. That should hopefully be fixed in the next release of the JS API.
* `layer.deleteAttachments(objectId, attachmentIds, callback, errback)` [doc](https://developers.arcgis.com/javascript/jsapi/featurelayer.html#deleteattachments)

They work the same both in ONLINE and OFFLINE mode. In OFFLINE mode, attachments will be kept in the local database (indexeddb) and sent back to the server when you call `offlineFeaturesManager.goOnline()`

##Getting database usage
Once a feature layer is extended you can find out how big the database and how many attachments are stored by using the following pattern:

			layer.getAttachmentsUsage(function(usage, error) {
				console.log("Size: " + usage.sizeBytes + ", attachmentCount: " + usage.attachmentCount);
			});

##Resetting the database
Under certain circumstances you may want to force the database to delete everything.

			layer.resetAttachmentsDatabase(function(result, error) { 
				console.log("Reset succes: " + result); // result is a boolean
			});

###Using the AttachmentEditor widget
The [AttachmentEditor](https://developers.arcgis.com/javascript/jsapi/attachmenteditor-amd.html) is not very fancy, but it's easy to work with:

                map.infoWindow.setContent("<div id='content' style='width:100%'></div>");
                map.infoWindow.resize(350,200);
                var attachmentEditor = new AttachmentEditor({}, dom.byId("content"));
                attachmentEditor.startup();

                featureLayer.on("click", function(evt) 
                {
                    var event = evt;
                    var objectId = evt.graphic.attributes[featureLayer.objectIdField];
                    map.infoWindow.setTitle(objectId);
                    attachmentEditor.showAttachments(event.graphic,featureLayer);
                    map.infoWindow.show(evt.screenPoint, map.getInfoWindowAnchor(evt.screenPoint));
                });

The widget internally uses the FeatureLayer API, and it works well in OFFLINE mode.


##Limitations
Attachment support in OFFLINE mode has some limitations:

* while in OFFLINE mode, features in a featureLayer don't know whether they have any attachments in the server or any other 
information about attachments unless you specifically build out that functionality. Therefore queryAttachmentInfos() and deleteAttachments() can't take those attachments into account. Calling queryAttachmentInfos() will only return attachments that are stored in local storage and deleteAttachments() can only remove local attachments.