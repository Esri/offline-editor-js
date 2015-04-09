/*global IDBKeyRange,indexedDB */

O.esri.Edit.AttachmentsStore = function () {
    "use strict";

    this._db = null;

    var DB_NAME = "attachments_store";
    var OBJECT_STORE_NAME = "attachments";

    this.isSupported = function () {
        if (!window.indexedDB) {
            return false;
        }
        return true;
    };

    this.store = function (featureLayerUrl, attachmentId, objectId, attachmentFile, callback) {
        try {
            // first of all, read file content
            this._readFile(attachmentFile, function (fileContent) {
                // now, store it in the db
                var newAttachment =
                {
                    id: attachmentId,
                    objectId: objectId,
                    featureId: featureLayerUrl + "/" + objectId,
                    contentType: attachmentFile.type,
                    name: attachmentFile.name,
                    size: attachmentFile.size,
                    url: this._createLocalURL(attachmentFile),
                    content: fileContent
                };

                var transaction = this._db.transaction([OBJECT_STORE_NAME], "readwrite");

                transaction.oncomplete = function (event) {
                    callback(true, newAttachment);
                };

                transaction.onerror = function (event) {
                    callback(false, event.target.error.message);
                };

                var objectStore = transaction.objectStore(OBJECT_STORE_NAME);
                var request = objectStore.put(newAttachment);
                request.onsuccess = function (event) {
                    //console.log("item added to db " + event.target.result);
                };

            }.bind(this));
        }
        catch (err) {
            console.log("AttachmentsStore: " + err.stack);
            callback(false, err.stack);
        }
    };

    this.retrieve = function (attachmentId, callback) {
        console.assert(this._db !== null, "indexeddb not initialized");

        var objectStore = this._db.transaction([OBJECT_STORE_NAME]).objectStore(OBJECT_STORE_NAME);
        var request = objectStore.get(attachmentId);
        request.onsuccess = function (event) {
            var result = event.target.result;
            if (!result) {
                callback(false, "not found");
            }
            else {
                callback(true, result);
            }
        };
        request.onerror = function (err) {
            console.log(err);
            callback(false, err);
        };
    };

    this.getAttachmentsByFeatureId = function (featureLayerUrl, objectId, callback) {
        console.assert(this._db !== null, "indexeddb not initialized");

        var featureId = featureLayerUrl + "/" + objectId;
        var attachments = [];

        var objectStore = this._db.transaction([OBJECT_STORE_NAME]).objectStore(OBJECT_STORE_NAME);
        var index = objectStore.index("featureId");
        var keyRange = IDBKeyRange.only(featureId);
        index.openCursor(keyRange).onsuccess = function (evt) {
            var cursor = evt.target.result;
            if (cursor) {
                attachments.push(cursor.value);
                cursor.continue();
            }
            else {
                callback(attachments);
            }
        };
    };

    this.getAttachmentsByFeatureLayer = function (featureLayerUrl, callback) {
        console.assert(this._db !== null, "indexeddb not initialized");

        var attachments = [];

        var objectStore = this._db.transaction([OBJECT_STORE_NAME]).objectStore(OBJECT_STORE_NAME);
        var index = objectStore.index("featureId");
        var keyRange = IDBKeyRange.bound(featureLayerUrl + "/", featureLayerUrl + "/A");
        index.openCursor(keyRange).onsuccess = function (evt) {
            var cursor = evt.target.result;
            if (cursor) {
                attachments.push(cursor.value);
                cursor.continue();
            }
            else {
                callback(attachments);
            }
        };
    };

    this.getAllAttachments = function (callback) {
        console.assert(this._db !== null, "indexeddb not initialized");

        var attachments = [];

        var objectStore = this._db.transaction([OBJECT_STORE_NAME]).objectStore(OBJECT_STORE_NAME);
        objectStore.openCursor().onsuccess = function (evt) {
            var cursor = evt.target.result;
            if (cursor) {
                attachments.push(cursor.value);
                cursor.continue();
            }
            else {
                callback(attachments);
            }
        };
    };

    this.deleteAttachmentsByFeatureId = function (featureLayerUrl, objectId, callback) {
        console.assert(this._db !== null, "indexeddb not initialized");

        var featureId = featureLayerUrl + "/" + objectId;

        var objectStore = this._db.transaction([OBJECT_STORE_NAME], "readwrite").objectStore(OBJECT_STORE_NAME);
        var index = objectStore.index("featureId");
        var keyRange = IDBKeyRange.only(featureId);
        var deletedCount = 0;
        index.openCursor(keyRange).onsuccess = function (evt) {
            var cursor = evt.target.result;
            if (cursor) {
                var attachment = cursor.value;
                this._revokeLocalURL(attachment);
                objectStore.delete(cursor.primaryKey);
                deletedCount++;
                cursor.continue();
            }
            else {
                setTimeout(function () {
                    callback(deletedCount);
                }, 0);
            }
        }.bind(this);
    };

    this.delete = function (attachmentId, callback) {
        console.assert(this._db !== null, "indexeddb not initialized");

        // before deleting an attachment we must revoke the blob URL that it contains
        // in order to free memory in the browser
        this.retrieve(attachmentId, function (success, attachment) {
            if (!success) {
                callback(false, "attachment " + attachmentId + " not found");
                return;
            }

            this._revokeLocalURL(attachment);

            var request = this._db.transaction([OBJECT_STORE_NAME], "readwrite")
                .objectStore(OBJECT_STORE_NAME)
                .delete(attachmentId);
            request.onsuccess = function (event) {
                setTimeout(function () {
                    callback(true);
                }, 0);
            };
            request.onerror = function (err) {
                callback(false, err);
            };
        }.bind(this));
    };

    this.deleteAll = function (callback) {
        console.assert(this._db !== null, "indexeddb not initialized");

        this.getAllAttachments(function (attachments) {
            attachments.forEach(function (attachment) {
                this._revokeLocalURL(attachment);
            }, this);

            var request = this._db.transaction([OBJECT_STORE_NAME], "readwrite")
                .objectStore(OBJECT_STORE_NAME)
                .clear();
            request.onsuccess = function (event) {
                setTimeout(function () {
                    callback(true);
                }, 0);
            };
            request.onerror = function (err) {
                callback(false, err);
            };
        }.bind(this));
    };

    this.replaceFeatureId = function (featureLayerUrl, oldId, newId, callback) {
        console.assert(this._db !== null, "indexeddb not initialized");

        var featureId = featureLayerUrl + "/" + oldId;

        var objectStore = this._db.transaction([OBJECT_STORE_NAME], "readwrite").objectStore(OBJECT_STORE_NAME);
        var index = objectStore.index("featureId");
        var keyRange = IDBKeyRange.only(featureId);
        var replacedCount = 0;
        index.openCursor(keyRange).onsuccess = function (evt) {
            var cursor = evt.target.result;
            if (cursor) {
                var newFeatureId = featureLayerUrl + "/" + newId;
                var updated = cursor.value;
                updated.featureId = newFeatureId;
                updated.objectId = newId;
                objectStore.put(updated);
                replacedCount++;
                cursor.continue();
            }
            else {
                // allow time for all changes to persist...
                setTimeout(function () {
                    callback(replacedCount);
                }, 1);
            }
        };
    };

    this.getUsage = function (callback) {
        console.assert(this._db !== null, "indexeddb not initialized");

        var usage = {sizeBytes: 0, attachmentCount: 0};

        var transaction = this._db.transaction([OBJECT_STORE_NAME])
            .objectStore(OBJECT_STORE_NAME)
            .openCursor();

        console.log("dumping keys");

        transaction.onsuccess = function (event) {
            var cursor = event.target.result;
            if (cursor) {
                console.log(cursor.value.id, cursor.value.featureId, cursor.value.objectId);
                var storedObject = cursor.value;
                var json = JSON.stringify(storedObject);
                usage.sizeBytes += json.length;
                usage.attachmentCount += 1;
                cursor.continue();
            }
            else {
                callback(usage, null);
            }
        }.bind(this);
        transaction.onerror = function (err) {
            callback(null, err);
        };
    };

    // internal methods

    this._readFile = function (attachmentFile, callback) {
        var reader = new FileReader();
        reader.onload = function (evt) {
            callback(evt.target.result);
        };
        reader.readAsBinaryString(attachmentFile);
    };

    this._createLocalURL = function (attachmentFile) {
        return window.URL.createObjectURL(attachmentFile);
    };

    this._revokeLocalURL = function (attachment) {
        window.URL.revokeObjectURL(attachment.url);
    };

    this.init = function (callback) {
        console.log("init AttachmentStore");

        var request = indexedDB.open(DB_NAME, 11);
        callback = callback || function (success) {
            console.log("AttachmentsStore::init() success:", success);
        }.bind(this);

        request.onerror = function (event) {
            console.log("indexedDB error: " + event.target.errorCode);
            callback(false, event.target.errorCode);
        }.bind(this);

        request.onupgradeneeded = function (event) {
            var db = event.target.result;

            if (db.objectStoreNames.contains(OBJECT_STORE_NAME)) {
                db.deleteObjectStore(OBJECT_STORE_NAME);
            }

            var objectStore = db.createObjectStore(OBJECT_STORE_NAME, {keyPath: "id"});
            objectStore.createIndex("featureId", "featureId", {unique: false});
        }.bind(this);

        request.onsuccess = function (event) {
            this._db = event.target.result;
            console.log("database opened successfully");
            callback(true);
        }.bind(this);
    };
};

