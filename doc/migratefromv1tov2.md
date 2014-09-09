Migrating from v1 to v2
=======================

This doc is to provide pointers for migrating from offline-editor-js v1 to v2. Migration should be fairly straightforward as you are simply going to be changing library names and method namespaces. Check the CHANGELOG doc for specifics as well as any deprecations.


##Importing the libraries

In your main html application you can use generic script injection to import the offline-editor-js libraries into your project. Don't create any aliases for the offline-editor-js libraries within the function statement and add them to the end of the module array, but before domReady. As you can see in the example below, the only alias is for `Map`.

```html	

	<script>
	require([
		"esri/map", 
		"..dist/offline-tiles-basic-min.js",
		"..dist/offline-edit-min.js",
		 "dojo/domReady!"
		function(Map)
	{
		...
	});
```

If you have other AMD libraries in your project and you want to refer to offline-editor-js within a `define` statement you can use the following pattern for importing the library. Note you can leave off the `.js` from the module identifier, and again don't include aliases in the function statement for the offline-editor-js libraries:

```js

	define(["..dist/offline-edit-min"],function(){
		...
	})
```

## Referencing the libraries by namespace

Once the libraries are imported, you can reference the functionality via the following namespace pattern. Check out the `\doc` directory for API specific info.

   * `O.esri.Edit` references all offline edit libraries
   * `O.esri.Tiles` references all offline tile libraries
   * `O.esri.TPK` references all TPK libraries
   * `O.esri.zip` a wrapper around Zip.js
   

## Removing the v1 dojoConfig pathnames

In v2 you can remove the old pathname configurations. In the example below I've commented them out for demonstration purposes. However, I recommend you carefully remove any of the old paths because they simply won't work anymore and could potentially cause errors and headaches for you when you go to update your v1 code to v2.

```js

		//var locationPath = location.pathname.replace(/\/[^/]+$/, "");
		//var dojoConfig = {
		//	paths: { 
		//		edit: locationPath  + "/../lib/edit",
		//		tiles: locationPath  + "/../lib/tiles",
		//	}
		//}

```