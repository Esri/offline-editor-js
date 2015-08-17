Technical Dependencies
======================

The offline-editor-js projects includes but is not limited to the following dependencies:

* indexedDB. Storage limits for indexedDB are not necessarily consistent across browsers. Here is a Mozilla [document](https://developer.mozilla.org/en-US/docs/IndexedDB#Storage_limits) discussing limits across different browsers. 
* Advanced users of the library should be aware that JavaScript stores some strings as UTF-16. More information can be found in this Mozilla [article](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/length).
* If a user completely flushes their browser cache all queued edits, tiles as well as anything stored in local storage, IndexedDB, SQLite or even the appcache will most likely be lost.
* Data stored by the library should persist if the browser is shutdown and restarted. However, this does not mean that your application will be returned to its correct state. A client web application's state has to be programmatically managed. This includes the state of items including but not limited to feature layers within your application.
* Browser support for all the functionality in this library isn't gauranteed, of course.

