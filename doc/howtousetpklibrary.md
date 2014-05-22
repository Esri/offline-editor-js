How to use the TPKLayer library
===============================

## `TPKLayer` Library

The `TPKLayer` Library allows you to display at TPK file as a map.

**Step 1** Unzip the TPK file. This creates an array of Entry objects. Depending on your operating system you may have to rename the TPK file to .zip so that it becomes a recognized MIME type.

```js

	//IMPORTANT: Tell zip.js where to find its associated scripts
	zip.workerScriptsPath = locationPath + "/../lib/tpk/"; 
	zip.createReader(new zip.BlobReader(blob), function (zipReader) {
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
**Step 2** Create a new instance of TPKLayer and pass the array of Entry objects from the zip file into the `extend()` method's constructor. Then add the layer to the map. As soon as you extend the layer it will start parsing the TPK file. 


```js

	tpkLayer = new TPKLayer();
	
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
	
	tpkLayer.on("validationError", function(evt){
		//evt.msg is the string message
		//evt.err is the error 
		if(evt.msg == tpkLayer.NO_SUPPORT_ERROR){
			//Let the user know the library isn't supported.
		}
	})
	
	tpkLayer.on("databaseError", function(evt){
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
**Additional Considerations**

There are a few things to keep in mind when working with TPK files and JavaScript.

The following three properties will affect the size of the TPK file. Minimizing all of these will help with application performance. Zoom as close into your area of interest as possible. 

* Number of layers
* Size of the extent
* Minimum and maximum zoom level 

It's a general recommended to keep the size of the local database (IndexedDB) below 75MBs, with a maximum of 100MBs for best performance. Allowing the database to grow to large can result in browser crashes and slow app performance. 

The amount of memory allowed to the browser is dependant on many variables including the available device memory, other applications already running and the number of open browser tabs.



