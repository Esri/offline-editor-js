#Attachment Support
The __offline-edit-min.js__ has support for attachments in offline mode. See [attachments-editor.html](../samples/attachments-editor.html) sample.

##What you can do:
While your application is in `OFFLINE` mode, you can:

* add attachments to any feature, either a feature that already exists in the server or a newly added feature.
* remove attachments from features. It only works for attachments that have been added while offline.
* query for attachments of a particular feature. It will only return attachments that have been added while offline.
* view the attached files (see __limitations__ below)
* when the app goes to `ONLINE` mode, all attachments are sent back to the server and removed from local browser storage

##How you do that:
You can either use the ArcGIS FeatureLayer API _(esri.layers.FeatureLayer)_ directly or use the built-in [AttachmentEditor](https://developers.arcgis.com/javascript/jsapi/attachmenteditor-amd.html) widget that support feature attachment editing. Both approaches work well, and the code you write works the same either if you are on `ONLINE` or `OFFLINE` modes.

The only differences in your code are:

* create an offlineFeaturesManager enabled for attachment support:

            var offlineFeaturesManager = new esri.OfflineFeaturesManager();
            offlineFeaturesManager.initAttachments();

* extend your featureLayers with offline editing functionality:

		offlineFeaturesManager.extend(featureLayer, function(success)
		{
			console.log("layer extended", success? "success" : "failed");
		});

###Using the FeatureLayer API
The FeatureLayer API for handling attachments consists primarily of three methods:

* `layer.queryAttachmentInfos(objectId,callback,errback)` [doc](https://developers.arcgis.com/javascript/jsapi/featurelayer.html#queryattachmentinfos)
* `layer.addAttachment(objectId, formNode, callback, errback)` [doc](https://developers.arcgis.com/javascript/jsapi/featurelayer.html#addattachment)
* `layer.deleteAttachments(objectId, attachmentIds, callback, errback)` [doc](https://developers.arcgis.com/javascript/jsapi/featurelayer.html#deleteattachments)

They work the same both in ONLINE and OFFLINE mode. In OFFLINE mode, attachments will be kept in the local browser storage (indexeddb) and sent back to the server when you call `offlineFeaturesManager.goOnline()`

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

* while in OFFLINE mode, features in a featureLayer don't know whether they have any attachments in the server or any other information about attachments. Therefore queryAttachmentInfos() and deleteAttachments() can't take those attachments into account. Calling queryAttachmentInfos() will only return attachments that are stored in local storage and deleteAttachments() can only remove local attachments.
* in order to see local attachments, the library uses [window.URL.createObjectURL() API](https://developer.mozilla.org/en-US/docs/Web/API/URL.createObjectURL). This API generates an opaque URL that represents the content of the File passed as parameter. This allows the user of the app to see and download attachments that are still in local browser storage as if they were actual files accessible through a URL. However, the lifetime of this URL is tied to the page where it is created. This means that if the user reloads (while still offline) the page after adding some local attachments, then these URLs will be invalid.