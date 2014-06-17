Tips on using application cache
===============================

If you have a requirement to reload your application or restart the browser while offline then you will need to use the [application cache](http://appcachefacts.info/). Some developers also use application caches to speed up page reload performance. For example, Google uses an application cache when load their main web page.

The application cache, also sometimes referred to as the 'manifest file', will allow you to store any file that is required for offline use. The list of acceptable files includes html, JavaScript libraries, CSS and images. Any file that your application requires to run normally will have to be referenced in the application cache. 

Once an application and its associated files are stored in the application cache it will be available from the cache the next time an application restarts.

## Using application caches with your ArcGIS web app

**Step 1** Make sure you are using an optimized build of the ArcGIS API for JavaScript. You can create an optimized build at [http://jso.arcgis.com/](http://jso.arcgis.com/). This will create a single file that contains all the necessary modules for your app. There are options to host the build via CDN or locally. Either approach will work.

NOTE: You cannot use the regular CDN for the ArcGIS API for JavaScript because the URL contains a redirect. Redirects are not allowed in an application cache and it will fail to load.

**Step 2** Create the application cache file. We have a [Grunt.js](http://gruntjs.com/) task included in the /samples directory to assist with this step. You will need to make some adjustments to the package.json file. It acts as the configuration file for the Grunt task. 

**Step 3** Reference the application cache file from within your application. Here's an example of the syntax:

```html
<html manifest="appcache-features.appcache">

```

**Step 4** Be sure to include and use the `/utils/appCacheManager.js` library as a module in your application. This will enable you to monitor what's going on in the application cache and capture specific events. For example if you want to know when the cache file has completely finalized its loading process then you can listen for the CACHE_LOADED event. Here is a psuedo code example of how to instantiate it:

```js

    appCacheManager = new AppCacheManager(true,true);
    appCacheManager.on(appCacheManager.CACHE_EVENT,cacheEventHandler);
    appCacheManager.on(appCacheManager.CACHE_ERROR,cacheErrorHandler);
    appCacheManager.on(appCacheManager.CACHE_LOADED,cacheLoadedHandler);

```

In the `/samples` directory there are two examples, `appcache-features.html` and `appcache-tiles.html` that demonstrate how to use tiles, features and the appCacheManager with the application cache. 

###Configuring your web server
Your web server must be able to serve up the MIME TYPE `TEXT/cache-manifest`. If this is missing there's a really good chance that the application cache file won't be served up to your app. 

If you have your web server set up to serve no-cache headers, you should temporarily disable that feature. Some browsers will refuse to accept the application cache file if it is served via a no-cache header.

### Clearing the application cache in a browser

When you do testing with an application cache, any time you make a change to your application HTML, CSS or JS you will need to delete the existing application cache. Otherwise, any changes you make will not be reflected in the app. 

**Simply deleting your web cache the normal way won't clear an application cache!**

In Chrome you can navigate to chrome://appcache-internals/ then select the appropriate cache and delete it. If you are testing on an Android device you can remotely debug from your laptop's Chrome instance.

In Safari iPhone and iPad go to settings and select "Clear Cookies and Data."

Safari on desktop can be alot more tricky. Simply attempting Develop > Empty Caches may not work. On a Mac you will have to: close your browser, manually delete the .db file by going to /<username>/library/Caches/com.Apple.Safari and move any item ending in .db to the trash, then restart browser. If this doesn't work then try restarting your machine. Yep, it's an awful workflow and it's been a known bug in Safari dating back to atleast version 6. 

If you want to test on Firefox then try Tools > Options > Advanced > Network > Offline data > Clear Now. More info is available [here](https://developer.mozilla.org/en-US/docs/Web/HTML/Using_the_application_cache#Storage_location_and_clearing_the_offline_cache).

As for IE, this library doesn't currently support any versions.

### Where to place the file

The application cache file can live anywhere in your web directory. It's common to see it to be placed in the root.

###Support
Most modern browsers support application cache including IE v10 and v11, Firefox v28+, Chrome v33+, Safari v7+, iOS Safari v3.2+, and Android browser 2.1+. For more detailed info refer to [caniuse.com](http://caniuse.com/#search=appcache).

### References

[Support for application cache](http://caniuse.com/#search=appcache)

[Appcache Facts](http://appcachefacts.info/) 

[Using the application cache - Mozilla Developer Network](https://developer.mozilla.org/en-US/docs/Web/HTML/Using_the_application_cache)