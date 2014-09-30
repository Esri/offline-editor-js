How to use the TPKLayer library
===============================

## `TPKLayer` Library

The `TPKLayer` Library allows you to display at TPK file as a map. 

**Step 1** Include the `offline-tpk-min.js` library in your app.

```js
	require([
		"esri/map", 
		"..dist/offline-tpk-min.js"], 
		function(Map)
	{
		...
	});
```

**Step 2** Unzip the TPK file. This creates an array of Entry objects. Depending on your operating system you may have to rename the TPK file to .zip so that it becomes a recognized MIME type for the html input element.

```js

	O.esri.zip.createReader(new O.esri.zip.BlobReader(blob), function (zipReader) {
    	zipReader.getEntries(function (entries) {
        	initMap(entries);
        	zipReader.close(function(evt){
            	console.log("Done reading zip file.")
        	})
    	}, function (err) {
        	alert("There was a problem reading the file!: " + err);
    	})
	})


```
**Step 3** Create a new instance of TPKLayer and pass the array of Entry objects from the zipReader into the `extend()` method's constructor. Then add the layer to the map. As soon as this code executes the layer will start parsing the TPK file. 


```js

	tpkLayer = new O.esri.TPK.TPKLayer();
	
	//Listen for progress events to provide UX feedback
	tpkLayer.on("progress", function (evt) {
		evt == "start" ? loading.style.visibility = "visible" : loading.style.visibility = "hidden";
	})
	
	tpkLayer.extend(entries);

	map = new Map("map");
	map.addLayer(tpkLayer);

```



**Listen for errors**

It is a best practice to listen for the following events and handle them appropriately in the user interface.

```js
	
	tpkLayer.on("validationEvent", function(evt){
		//evt.msg is the string message
		//evt.err is the error 
		if(evt.msg == tpkLayer.NO_SUPPORT_ERROR){
			//Let the user know the library isn't supported.
		}
	})
	
	tpkLayer.on("databaseErrorEvent", function(evt){
		//evt.msg is the string message
		//evt.err is the error 
		if(evt.msg == tpkLayer.DB_INIT_ERROR){
			//Let the user know there was a db problem.
		}
	})

```


**To clear the database**

When you need to delete all tiles from the existing data use the following pattern. 

```js
	
	tpkLayer.store.deleteAll(function(success,error){
		if(success){
			//do something
		}
		else{
			//let user know something went wrong
		}	
	})

```

**Can I use the TPKLayer with a tiled basemap?**

Yes for ArcGIS API for JavaScript v3.8+ and ONLY if the TPKs Levels of Detail (LODs) match the tiled map services LODs exactly.

The basemap (base tiled layer) defines the LODs that the map can display. Any other operational tiled layers on the map will not display if they don’t match the basemap’s LODs. Esri.Map doesn’t union LODs of all tiled layers on the map.

You can also use the `TPKLayer.loadFromURL()` method to add tiled map service tiles directly to the database. In order to get the tile information, use this method with `offlineTilesEnabler.saveToFile()` and `OfflineTilesEnablerLayer.saveToFile()`. That will create a CSV file that contains all the tiles within the extent that you define. The tiles-indexed-db.html sample demonstrates this pattern. Each tile within the CSV is defined by a URL as a String, and the tile image as a base64 String:

```js

	var tile = {
    	url: "http://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/16/24710/32091",
       	img: "data:image/png;base64,iVBORw0KGgoAAA...pQAAAABJRU5ErkJggg=="
    };

``` 

See the [TPKLayer API doc](tpklayer.md) for more info.

For more information on creating TPKs go [here](http://resources.arcgis.com/en/help/main/10.1/index.html#//006600000457000000).

**Additional Considerations**

There are a few things to keep in mind when working with TPK files and JavaScript.

The following three properties will affect the size of the TPK file. Minimizing all of these will help with application performance. Zoom as close into your area of interest as possible. 

* Number of layers
* Size of the extent
* Minimum and maximum zoom level 

It's a general recommended to keep the size of the local database below 75MBs, with a maximum of 100MBs for best performance. Allowing the database to grow to large can result in browser crashes and slow app performance. 

The amount of memory allowed to the browser is dependant on many variables including the available device memory, other applications already running and the number of open browser tabs.



