Getting started with full offline editing
=========================================

Full offline editing involves setting up your application to survive a browser restart while the mobile device is offline. This short document outlines the various pieces you need to help ensure your web application will work successfully in a full offline environment.

While this document focuses on editing, some of the patterns recommended here also apply to handling of map tiles while offline.

**Workflows**

Here are the top-level application workflows you'll encounter in offline apps:

- Online + feature layer not extended for offline use = edits always sync with feature service.
- Online + feature layer extended = edits always immediately sync with feature service. Edits pass-thru completely. 
- Offline + feature layer extended = edits stored in database and the dataStore is updated by default each time there is a new edit registered.
- Returning online with pending edits + feature layer extended = edits are synced with feature service from local database.
- Returning online with pending edits + feature layer not extended = no edits will be synced.
- Always offline + feature layer extended = you can retrieve the edits programmatically and transfer them to a thumbdrive or equivalent to sync them manually.

**Overview of the Pieces**

Restarting a web app offline involves a number of critical pieces that have to be in place. The vast majority of web apps are not designed to survive an offline restart so you have to take extra steps to insure the app reinitializes just like it would if it was online.

1. When working with offline apps, you take full responsbility for having a thorough understanding of your application's initialization life cycle. The order in which the various HTML, CSS, .js libraries and image files are parsed by the browser is very important. As you'll find out, if there are any inter-dependencies between libraries, then an offline restart will expose them.
2. Offline apps will require an Application Cache or Service Workers to pull down all HTML, CSS, .js files and images that an app uses while it is online.
3. Offline apps require a way to determine if there is an internet connection or not.
4. Not all JavaScript code will work after an offline restart, such as the Editor Widget. It's safe to assume that the vast majority of JavaScript code ever written was written for fully-online usage and you'll need to take extra care with application initialization. 
5. You'll need to make some decisions on how to manage certain aspects of the feature layer while it is fully offline. OfflineEditAdvanced has a dataStore which you can manually access if needed.

**Application Life-cycle** Study the full offline samples in this repo carefully. In most cases, they are slightly overengineered. However, they are built that way for good reasons. The order in which things intializes is critical. In many cases don't be surprised if you'll need to force initialization sequences in your code to be sequential. Asynchronous loading of JavaScript libraries typically only works for full offline if you want to wait until all libraries have finished loading.

**Application Cache.** You will have to set up an application cache file. This cache is also sometimes called Cache Manifest, AppCache and Manifest. The application cache mehanism is broadly supported across [browser vendors](http://caniuse.com/#search=application). It instructs the browser to store any HTML, CSS, .js or image that is required for fully reconstituting the web page while offline. It can be a pain to set these up, it requires a lot of trail and error, but once they are set up they function fairly well.

Examples of application caches can be found in this repositories `/samples` directory, along with a grunt-based application cache helper tool. 

You may notice warnings that Application Cache has gone away, for example [here on MDN](https://developer.mozilla.org/en-US/docs/Web/HTML/Using_the_application_cache) but the warnings are [greatly exaggerated](http://www.andygup.net/application-cache-is-not-gone-oh-my-or-is-it/).  

**Offline detection for browsers** You need a mechanism for checking if the browser is online or offline. If the browser is offline you can set the `OfflineEditAdvanced` library to offline mode using `OfflineEditAdvanced.goOffline()` and then all edits will be saved to the database. When you want to return online, you can use `OfflineEditAdvanced.goOnline(callback)` and the library will push any pending edits to the Feature Service, and it will also simply pass-thru any and not store anything as long as the library remains in online mode.

* **[Offline.js](http://caniuse.com/#search=application)** is one library for helping detect if a browser is offline or not. It does have its flaws, for example we've noticed that Chrome on Windows laptops can fail to quickly detect when the browser has gone offline. Detecting when a browser's state shifts from online to offline and back again is tricky business. It's much easier with native SDKs or with plugins for PhoneGap/Cordova.

* **Simple HTTP request** Another fairly straightforward pattern is to simply try an HTTP request and check if it fails. This isn't completely bulletproof, but it works across all modern browsers. Here's one example:

```javascript

   function validateOnline(callback) {
        var req = new XMLHttpRequest();
        req.open("GET", "http://mywebsite.com/blue-pin.png?" + 
            (Math.floor(Math.random() * 1000000000)), true);
        req.onload = function() {
            if( req.status === 200 && req.responseText !== "") {            
                req = null;
                callback(true);
            }
            else {
                console.log("validateOnline failed");
                req = null;
                callback(false);
            }
        };
        req.onerror = function(e) {
            console.log("validateOnline failed: " + e);
            callback(false);
        };
        req.timeout = 10000; //milliseconds
        req.send(null);
    }

```

**Editing Widgets** The ArcGIS API for JavaScript v3.x Editor Widget does not work in full offline mode for ADDS, UPDATES or DELETES because it doesn't store changes directly in the feature layer. 

You'll need to build your own custom functionality for now. There is an effort underway to create a [light-weight editing template](https://github.com/Esri/offline-editor-js/issues/434) but that is a work in progress and the sample has been temporarily moved to this [gist](https://gist.github.com/andygup/1e768216177dd8a77a73).

The [appcache-features.html](https://github.com/Esri/offline-editor-js/blob/master/samples/appcache-features.html) sample shows a custom modal widget for doing only UPDATE's on existing data.

**About the dataStore** The dataStore is a database mechanism for storing feature collections and any other information or objects needed to rebuild an application when it starts up while offline. 

You can either let the library automatically handle the dataStore (default) or you can manually manage it yourself if there's additional items you need to store and maintain between offline browser resarts. In default mode, the library automatically updates the dataStore every time you make an edit. It's sole purpose is to ensure the library has an accurate snapshot of feature layer and its features so that they can be reconstituted correctly.

More information on how the use the dataStore can be found [here](https://github.com/Esri/offline-editor-js/blob/master/doc/howtouseofmadvancedlibrary.md).





