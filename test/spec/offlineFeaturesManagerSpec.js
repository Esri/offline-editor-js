"use strict";

/*
 * helper functions
 */

function clearFeatureLayer(featureLayer, cb)
{
	g_modules.esriRequest({
		url: featureLayer.url + "/deleteFeatures",
		content: { f: 'json', where: '1=1'},
		handleAs: 'json'
	},{usePost:true}).then( function(response)
	{
		cb && cb(true,response);
	},
	function(error)
	{
		cb && cb(false,error);
	});
}

function countFeatures(featureLayer, cb)
{
	g_modules.esriRequest({
		url: featureLayer.url + "/query",
		content: { f: 'json', where: '1=1', returnCountOnly:true},
		handleAs: 'json'
	},{usePost:true}).then( function(response)
	{
		cb && cb(true,response);
	},
	function(error)
	{
		cb && cb(false,error);
	});
}

function getObjectIds(graphics)
{
	return graphics.map( function(g) { return g.attributes.objectid; });
}

/*
 * tests begin here
 */
var async = new AsyncSpec(this);

describe("Normal online editing - Exercise the feature services", function()
{
	var g1,g2,g3;

	describe("Original applyEdits method", function()
	{
		async.it("clears the feature layers", function(done)
		{
			var count = 0;
			function completedOne()
			{
				count += 1;
				if(count==g_layersIds.length)
					done();
			}

            // Run clear twice because of current bug in ArcGIS Online related to clearing feature services with attachments.
            clearFeatureLayer(g_featureLayers[0], function(success){
                clearFeatureLayer( g_featureLayers[0], function(success,response)
                {
                    expect(success).toBeTruthy();
                    var listener = g_featureLayers[0].on('update-end', function(){ listener.remove(); completedOne();})
                    g_featureLayers[0].refresh();

                });
            });

			//clearFeatureLayer( g_featureLayers[1], function(success,response)
			//{
			//	expect(success).toBeTruthy();
			//	var listener = g_featureLayers[1].on('update-end', function(){ listener.remove(); completedOne();})
			//	g_featureLayers[1].refresh();
			//});
			//clearFeatureLayer( g_featureLayers[2], function(success,response)
			//{
			//	expect(success).toBeTruthy();
			//	var listener = g_featureLayers[2].on('update-end', function(){ listener.remove(); completedOne();})
			//	g_featureLayers[2].refresh();
			//});
		});

		async.it("add test features", function(done)
		{
			expect(g_featureLayers[0].graphics.length).toBe(0);

			//g1 = new g_modules.Graphic({"geometry":{"x":-105400,"y":5137000,"spatialReference":{"wkid":102100}},"attributes":{"symbolname":"Ground Zero","z":null,"additionalinformation":null,"eny":null,"datetimevalid":null,"datetimeexpired":null,"distance":null,"azimuth":null,"uniquedesignation":null,"x":null,"y":null}});
			//g2 = new g_modules.Graphic({"geometry":{"x":-105600,"y":5137000,"spatialReference":{"wkid":102100}},"attributes":{"symbolname":"Ground Zero","z":null,"additionalinformation":null,"eny":null,"datetimevalid":null,"datetimeexpired":null,"distance":null,"azimuth":null,"uniquedesignation":null,"x":null,"y":null}});
			//g3 = new g_modules.Graphic({"geometry":{"x":-105800,"y":5137000,"spatialReference":{"wkid":102100}},"attributes":{"symbolname":"Ground Zero","z":null,"additionalinformation":null,"eny":null,"datetimevalid":null,"datetimeexpired":null,"distance":null,"azimuth":null,"uniquedesignation":null,"x":null,"y":null}});

            g1 = new g_modules.Graphic({"geometry":{"x":-105400,"y":5137000,"spatialReference":{"wkid":102100}},"attributes":{"OBJECTID":1,"lat":0.0,"lng":0.0,"description":"g1"}});
            g2 = new g_modules.Graphic({"geometry":{"x":-105600,"y":5137000,"spatialReference":{"wkid":102100}},"attributes":{"OBJECTID":2,"lat":0.0,"lng":0.0,"description":"g2"}});
            g3 = new g_modules.Graphic({"geometry":{"x":-105800,"y":5137000,"spatialReference":{"wkid":102100}},"attributes":{"OBJECTID":3,"lat":0.0,"lng":0.0,"description":"g3"}});

            var adds = [g1,g2,g3];
			g_featureLayers[0]._applyEdits(adds,null,null,function(addResults,updateResults,deleteResults)
			{
				expect(addResults.length).toBe(3);
				expect(addResults[0].success).toBeTruthy();
				expect(addResults[1].success).toBeTruthy();
				expect(addResults[2].success).toBeTruthy();
				g1.attributes.objectid = addResults[0].objectId;
				g2.attributes.objectid = addResults[1].objectId;
				g3.attributes.objectid = addResults[2].objectId;
				expect(getObjectIds(g_featureLayers[0].graphics)).toEqual(getObjectIds([g1,g2,g3]));
				expect(g_featureLayers[0].graphics.length).toBe(3);
				countFeatures(g_featureLayers[0], function(success,result)
				{
					expect(success).toBeTruthy();
					expect(result.count).toBe(3);
					done();
				});
			},
			function(error)
			{
				expect(true).toBeFalsy();
				done();
			});
		});

		async.it("update test features", function(done)
		{
			expect(getObjectIds(g_featureLayers[0].graphics)).toEqual(getObjectIds([g1,g2,g3]));
			expect(g_featureLayers[0].graphics.length).toBe(3);

			g1.geometry.y += 300;
			g2.geometry.y += 100;
			g3.geometry.y -= 200;
			var updates = [g1,g2,g3];
			g_featureLayers[0]._applyEdits(null,updates,null,function(addResults,updateResults,deleteResults)
			{
				expect(updateResults.length).toBe(3);
				expect(updateResults[0].success).toBeTruthy();
				expect(updateResults[1].success).toBeTruthy();
				expect(updateResults[2].success).toBeTruthy();
				expect(getObjectIds(g_featureLayers[0].graphics)).toEqual(getObjectIds([g1,g2,g3]));
				expect(g_featureLayers[0].graphics.length).toBe(3);
				done();
			},
			function(error)
			{
				expect(true).toBeFalsy();
				done();
			});
		});

		async.it("delete test features", function(done) {
            expect(getObjectIds(g_featureLayers[0].graphics)).toEqual(getObjectIds([g1, g2, g3]));
            expect(g_featureLayers[0].graphics.length).toBe(3);

            var deletes = [g3];
            g_featureLayers[0]._applyEdits(null, null, deletes, function (addResults, updateResults, deleteResults) {
                    expect(deleteResults.length).toBe(1);
                    expect(getObjectIds(g_featureLayers[0].graphics)).toEqual(getObjectIds([g1, g2]));
                    expect(g_featureLayers[0].graphics.length).toBe(2);
                    done();
                },
                function (error) {
                    expect(true).toBeFalsy();
                    done();
                });
        });
		});
	});

//describe("Online attachments", function(){
//    async.it("Add image attachment", function(done){
//
//
//        var xhr = new XMLHttpRequest();
//        xhr.open("GET","../samples/images/blue-pin.png",true);
//        xhr.responseType = "blob";
//
//        xhr.onload = function()
//        {
//            if( xhr.status === 200)
//            {
//                var blob = new Blob([this.response],{type: 'image/png'});
//
//                // Verify our image is a PNG file!
//                var reader = new FileReader();
//                reader.onload = function (evt) {
//                    file = evt.target.result;
//                    var test = file.slice(0,4);
//                    expect(test).toContain("PNG");
//                };
//                reader.readAsBinaryString(blob);
//
//                var parts = [blob,"test", new ArrayBuffer(blob.size)];
//
//                var file = new File(parts,"blue-pin.png",{
//                    lastModified: new Date(0),
//                    type: "image/png"
//                });
//
//                var formNode = {
//                    elements:[
//                        {type:"file",
//                            files:[file]}
//                    ]
//                };
//
//                g_offlineFeaturesManager.initAttachments(function(success){
//                    expect(success).toBe(true);
//                    if(success){
//
//                        done();
//                        //g_featureLayers[0].addAttachment(/* objectid */1,/* form node */ formNode,function(event){
//                        //    expect(event.attachmentId).toBe(-4);
//                        //    expect(event.objectId).toBe(1);
//                        //    expect(event.success).toBe(true);
//                        //    //console.log("ATTACHMENTS: " + JSON.stringify(event));
//                        //    done();
//                        //},function(error){
//                        //    expect(error).toBe(true); // we want to fail if there is an error!
//                        //    done();
//                        //});
//                    }
//                });
//            }
//            else
//            {
//                console.log("Test attachments failed");
//            }
//        };
//        xhr.onerror = function(e)
//        {
//            console.log("Test attachments failed: " + JSON.stringify(e));
//        };
//
//        xhr.send(null);
//    });
//});

describe("Offline Editing", function()
{

    var g1,g2,g3;
    var g4,g5,g6;
    var l1,l2,l3;

    describe("Prep db and feature service", function()
    {
        async.it("detect IndexedDB support", function (done) {
            expect(g_editsStore.isSupported()).toBeTruthy();
            done();
        });

        async.it("initialize database", function (done) {
            g_editsStore.init(function (success) {
                expect(success).toEqual(true);
                done();
            })
        });

        async.it("Get feature layer options object", function(done){
            g_featureLayers[0].getFeatureLayerJSONDataStore(function(success,message){
                expect(success).toBe(true);
                expect(message.zoom).toEqual(10);
                done();
            })
        });

        async.it("Modify feature layer options object", function(done){
            var object = {
                "zoom":9
            };
            g_featureLayers[0].setFeatureLayerJSONDataStore(object,function(success,message){
                expect(success).toBe(true);

                g_featureLayers[0].getFeatureLayerJSONDataStore(function(success,message){
                    expect(success).toBe(true);
                    expect(message.zoom).toEqual(9);

                    var graphics = JSON.parse(message.graphics);

                    //Verify that we did not overwrite the options object.
                    //If this tests passes then it's still there!
                    expect(graphics.layerDefinition.id).toEqual(0);

                    done();
                });
            })
        });

        async.it("Prepare feature service. Clear database",function(done)
        {
            g_featureLayers[0].resetDatabase(function (result) {
                expect(result).toEqual(true);

                g_featureLayers[0].pendingEditsCount(function (count) {
                    expect(count).toBe(0);
                    done();
                });

            });
        });

        async.it("Prepare feature service. Clear feature Layers - points - lines", function(done)
        {
            var count = 0;
            function completedOne()
            {
                count += 1;
                if(count== g_layersIds.length)
                    done();
            }
            clearFeatureLayer( g_featureLayers[0], function(success,response)
            {
                expect(success).toBeTruthy();
                var listener = g_featureLayers[0].on('update-end', function(){ listener.remove(); completedOne();})
                g_featureLayers[0].refresh();

            });
            //clearFeatureLayer( g_featureLayers[1], function(success,response)
            //{
            //    expect(success).toBeTruthy();
            //    var listener = g_featureLayers[1].on('update-end', function(){ listener.remove(); completedOne();})
            //    g_featureLayers[1].refresh();
            //});
            //clearFeatureLayer( g_featureLayers[2], function(success,response)
            //{
            //    expect(success).toBeTruthy();
            //    var listener = g_featureLayers[2].on('update-end', function(){ listener.remove(); completedOne();})
            //    g_featureLayers[2].refresh();
            //});
        });

        async.it("Prepare feature service. Add some features online - points", function(done)
        {
            expect(g_offlineFeaturesManager.getOnlineStatus()).toBe(g_offlineFeaturesManager.ONLINE);

            //g1 = new g_modules.Graphic({"geometry":{"x":-105400,"y":5137000,"spatialReference":{"wkid":102100}},"attributes":{"symbolname":"Ground Zero","z":null,"additionalinformation":null,"eny":null,"datetimevalid":null,"datetimeexpired":null,"distance":null,"azimuth":null,"uniquedesignation":null,"x":null,"y":null}});
            //g2 = new g_modules.Graphic({"geometry":{"x":-105600,"y":5137000,"spatialReference":{"wkid":102100}},"attributes":{"symbolname":"Ground Zero","z":null,"additionalinformation":null,"eny":null,"datetimevalid":null,"datetimeexpired":null,"distance":null,"azimuth":null,"uniquedesignation":null,"x":null,"y":null}});
            //g3 = new g_modules.Graphic({"geometry":{"x":-105800,"y":5137000,"spatialReference":{"wkid":102100}},"attributes":{"symbolname":"Ground Zero","z":null,"additionalinformation":null,"eny":null,"datetimevalid":null,"datetimeexpired":null,"distance":null,"azimuth":null,"uniquedesignation":null,"x":null,"y":null}});


            g1 = new g_modules.Graphic({"geometry":{"x":-105400,"y":5137000,"spatialReference":{"wkid":102100}},"attributes":{"OBJECTID":1,"lat":0.0,"lng":0.0,"description":"g1"}});
            g2 = new g_modules.Graphic({"geometry":{"x":-105600,"y":5137000,"spatialReference":{"wkid":102100}},"attributes":{"OBJECTID":2,"lat":0.0,"lng":0.0,"description":"g2"}});
            g3 = new g_modules.Graphic({"geometry":{"x":-105800,"y":5137000,"spatialReference":{"wkid":102100}},"attributes":{"OBJECTID":3,"lat":0.0,"lng":0.0,"description":"g3"}});

            var adds = [g1,g2,g3];
            g_featureLayers[0].applyEdits(adds,null,null,function(addResults,updateResults,deleteResults)
                {
                    expect(addResults.length).toBe(3);
                    expect(getObjectIds(g_featureLayers[0].graphics)).toEqual(getObjectIds([g1,g2,g3]));
                    expect(g_featureLayers[0].graphics.length).toBe(3);
                    countFeatures(g_featureLayers[0], function(success,result)
                    {
                        expect(success).toBeTruthy();
                        expect(result.count).toBe(3);
                        done();
                    });
                },
                function(error)
                {
                    expect(true).toBeFalsy();
                });
        });

        // Temporarily comment out. We have switched to a Point-based service only that accepts attachments
        //async.it("Prepare feature service. Add some features online - lines", function(done)
        //{
        //    expect(g_offlineFeaturesManager.getOnlineStatus()).toBe(g_offlineFeaturesManager.ONLINE);
        //
        //    l1 = new g_modules.Graphic({"geometry":{"paths":[[[-101300,5136900],[-108400,5136900]]],"spatialReference":{"wkid":102100}},"attributes":{"ruleid":40,"zmax":null,"additionalinformation":null,"eny":null,"uniquedesignation":null,"datetimevalid":null,"datetimeexpired":null,"distance":null,"azimuth":null,"echelon":null,"x":null,"y":null,"z":null,"zmin":null}});
        //    l2 = new g_modules.Graphic({"geometry":{"paths":[[[-101300,5136800],[-108400,5136800]]],"spatialReference":{"wkid":102100}},"attributes":{"ruleid":40,"zmax":null,"additionalinformation":null,"eny":null,"uniquedesignation":null,"datetimevalid":null,"datetimeexpired":null,"distance":null,"azimuth":null,"echelon":null,"x":null,"y":null,"z":null,"zmin":null}});
        //    l3 = new g_modules.Graphic({"geometry":{"paths":[[[-101300,5136700],[-108400,5136700]]],"spatialReference":{"wkid":102100}},"attributes":{"ruleid":40,"zmax":null,"additionalinformation":null,"eny":null,"uniquedesignation":null,"datetimevalid":null,"datetimeexpired":null,"distance":null,"azimuth":null,"echelon":null,"x":null,"y":null,"z":null,"zmin":null}});
        //
        //    var adds = [l1,l2,l3];
        //    g_featureLayers[1].applyEdits(adds,null,null,function(addResults,updateResults,deleteResults)
        //        {
        //            expect(addResults.length).toBe(3);
        //            expect(getObjectIds(g_featureLayers[1].graphics)).toEqual(getObjectIds([l1,l2,l3]));
        //            expect(g_featureLayers[1].graphics.length).toBe(3);
        //            countFeatures(g_featureLayers[1], function(success,result)
        //            {
        //                expect(success).toBeTruthy();
        //                expect(result.count).toBe(3);
        //                done();
        //            });
        //        },
        //        function(error)
        //        {
        //            expect(true).toBeFalsy();
        //        });
        //});
    });

    describe("Go offline", function()
    {
        async.it("go Offline", function(done)
        {
            expect(g_offlineFeaturesManager.getOnlineStatus()).toBe(g_offlineFeaturesManager.ONLINE);
            g_offlineFeaturesManager.goOffline();
            expect(g_offlineFeaturesManager.getOnlineStatus()).toBe(g_offlineFeaturesManager.OFFLINE);
            done();
        });

        async.it("Convert feature array into JSON", function(done){

            var adds = [g1,g2,g3];
            g_offlineFeaturesManager.serializeFeatureGraphicsArray(adds,function(JSONString){
                expect(typeof JSONString).toBe("string");
                var object = JSON.parse(JSONString);
                expect(typeof object).toBe("object");
                expect(object[0].geometry.x).toEqual(-105400);
                expect(object[1].geometry.x).toEqual(-105600);
                expect(object[2].geometry.x).toEqual(-105800);
                done();
            });

        });

        async.it("update existing features - points", function(done)
        {
            expect(getObjectIds(g_featureLayers[0].graphics)).toEqual(getObjectIds([g1,g2,g3]));
            expect(g_featureLayers[0].graphics.length).toBe(3);
            expect(g_offlineFeaturesManager.getOnlineStatus()).toBe(g_offlineFeaturesManager.OFFLINE);

            g1.geometry.y += 300;
            g2.geometry.y += 100;
            g3.geometry.y -= 200;
            var updates = [g1,g2,g3];
            g_featureLayers[0].applyEdits(null,updates,null,function(addResults,updateResults,deleteResults)
                {   console.log("update existing features - points: " + JSON.stringify(updateResults))
                    expect(updateResults.length).toBe(3);
                    expect(updateResults[0].success).toBeTruthy();
                    expect(updateResults[1].success).toBeTruthy();
                    expect(updateResults[2].success).toBeTruthy();
                    expect(getObjectIds(g_featureLayers[0].graphics)).toEqual(getObjectIds([g1,g2,g3]));
                    expect(g_featureLayers[0].graphics.length).toBe(3);
                    g_editsStore.pendingEditsCount(function(result){
                        expect(result).toBe(3);
                        done();
                    });
                },
                function(error)
                {
                    expect(true).toBeFalsy();
                    done();
                });
        });

        // NOTE: We are only dealing with points!
        //async.it("update existing features - lines", function(done)
        //{
        //    expect(getObjectIds(g_featureLayers[0].graphics)).toEqual(getObjectIds([l1,l2,l3]));
        //    expect(g_featureLayers[1].graphics.length).toBe(3);
        //    expect(g_offlineFeaturesManager.getOnlineStatus()).toBe(g_offlineFeaturesManager.OFFLINE);
        //
        //
        //    l1.geometry.y += 300; // jabadia: change
        //    l2.geometry.y += 100;
        //    l3.geometry.y -= 200;
        //
        //    var updates = [l1,l2,l3];
        //    g_featureLayers[1].applyEdits(null,updates,null,function(addResults,updateResults,deleteResults)
        //        {
        //            expect(updateResults.length).toBe(3);
        //            expect(updateResults[0].success).toBeTruthy();
        //            expect(updateResults[1].success).toBeTruthy();
        //            expect(updateResults[2].success).toBeTruthy();
        //            expect(getObjectIds(g_featureLayers[1].graphics)).toEqual(getObjectIds([l1,l2,l3]));
        //            expect(g_featureLayers[1].graphics.length).toBe(3);
        //            g_editsStore.pendingEditsCount(function(result){
        //                expect(result).toBe(6);
        //                done();
        //            });
        //        },
        //        function(error)
        //        {
        //            expect(true).toBeFalsy();
        //            done();
        //        });
        //});

        async.it("delete existing features - points", function(done)
        {
            expect(getObjectIds(g_featureLayers[0].graphics)).toEqual(getObjectIds([g1,g2,g3]));
            expect(g_featureLayers[0].graphics.length).toBe(3);

            var deletes = [g3]; console.log("Graphic " + JSON.stringify(g3.toJson()));
            g_featureLayers[0].applyEdits(null,null,deletes,function(addResults,updateResults,deleteResults)
                {
                    expect(deleteResults.length).toBe(1);
                    expect(getObjectIds(g_featureLayers[0].graphics)).toEqual(getObjectIds([g1,g2]));
                    expect(g_featureLayers[0].graphics.length).toBe(2);
                    g_editsStore.pendingEditsCount(function(result){

                        // Expected count will stil be 6! This record is the database gets overwritten
                        // with the latest edit request. Last edit wins.
                        expect(result).toBe(3);
                        done();
                    });
                },
                function(error)
                {
                    expect(true).toBeFalsy();
                    done();
                });
        });

        async.it("add new features offline - points", function(done)
        {
            expect(getObjectIds(g_featureLayers[0].graphics)).toEqual(getObjectIds([g1,g2]));
            expect(g_featureLayers[0].graphics.length).toBe(2);
            expect(g_offlineFeaturesManager.getOnlineStatus()).toBe(g_offlineFeaturesManager.OFFLINE);

            //g4 = new g_modules.Graphic({"geometry":{"x":-109100,"y":5137000,"spatialReference":{"wkid":102100}},"attributes":{"symbolname":"Reference Point DLRP","z":null,"additionalinformation":null,"eny":null,"datetimevalid":null,"datetimeexpired":null,"distance":null,"azimuth":null,"uniquedesignation":null,"x":null,"y":null}} );
            //g5 = new g_modules.Graphic({"geometry":{"x":-109500,"y":5137000,"spatialReference":{"wkid":102100}},"attributes":{"symbolname":"Reference Point DLRP","z":null,"additionalinformation":null,"eny":null,"datetimevalid":null,"datetimeexpired":null,"distance":null,"azimuth":null,"uniquedesignation":null,"x":null,"y":null}} );
            //g6 = new g_modules.Graphic({"geometry":{"x":-109900,"y":5137000,"spatialReference":{"wkid":102100}},"attributes":{"symbolname":"Reference Point DLRP","z":null,"additionalinformation":null,"eny":null,"datetimevalid":null,"datetimeexpired":null,"distance":null,"azimuth":null,"uniquedesignation":null,"x":null,"y":null}} );

            g4 = new g_modules.Graphic({"geometry":{"x":-109100,"y":5137000,"spatialReference":{"wkid":102100}},"attributes":{"OBJECTID":4,"lat":0.0,"lng":0.0,"description":"g4"}});
            g5 = new g_modules.Graphic({"geometry":{"x":-109500,"y":5137000,"spatialReference":{"wkid":102100}},"attributes":{"OBJECTID":5,"lat":0.0,"lng":0.0,"description":"g5"}});
            g6 = new g_modules.Graphic({"geometry":{"x":-109900,"y":5137000,"spatialReference":{"wkid":102100}},"attributes":{"OBJECTID":6,"lat":0.0,"lng":0.0,"description":"g6"}});

            var adds = [g4,g5,g6];
            g_featureLayers[0].applyEdits(adds,null,null,function(addResults,updateResults,deleteResults)
                {
                    expect(addResults.length).toBe(3);

                    g_editsStore.pendingEditsCount(function(result){

                        // Should be 9 since we added 3 three edits and we had 6 edits in the previous test
                        expect(result).toBe(6);
                        done();
                    });

                    expect(getObjectIds(g_featureLayers[0].graphics)).toEqual(getObjectIds([g1,g2,g4,g5,g6]));
                    expect(g_featureLayers[0].graphics.length).toBe(5);
                    g4.attributes.objectid = addResults[0].objectId;
                    g5.attributes.objectid = addResults[1].objectId;
                    g6.attributes.objectid = addResults[2].objectId;
                    expect(g4.attributes.objectid).toBeLessThan(0);
                    expect(g5.attributes.objectid).toBeLessThan(g4.attributes.objectid);
                    expect(g6.attributes.objectid).toBeLessThan(g5.attributes.objectid);
                },
                function(error)
                {
                    expect(true).toBeFalsy();
                });
        });

        async.it("Update new feature offline - point", function(done){

            // Let's make a change to g6 attributes
            g6.attributes.additionalinformation = "TEST123";
            var updates = [g6];
            g_featureLayers[0].applyEdits(null,updates,null,function(addResults,updateResults,deleteResults)
                {
                    expect(updateResults.length).toBe(1);

                    g_editsStore.pendingEditsCount(function(result){

                        // Should be the exact same as previous test
                        // An update to a new feature should be a single entry in the database.
                        // We simply update the existing entry with the new information.
                        expect(result).toBe(6);
                        done();
                    });
                },
                function(error)
                {
                    expect(true).toBeFalsy();
                });
        });

        async.it("validate non-existent feature - ADD", function(done){

            var testGraphic = new g_modules.Graphic({"geometry":{"x":-109100,"y":5137000,"spatialReference":{"wkid":102100}},"attributes":{"symbolname":"Reference Point DLRP","z":null,"additionalinformation":null,"eny":null,"datetimevalid":null,"datetimeexpired":null,"distance":null,"azimuth":null,"uniquedesignation":null,"x":null,"y":null}} );

            g_featureLayers[0]._validateFeature(testGraphic,g_featureLayers[0].url,"add")
                .then(function(result){
                    expect(result.success).toBe(true);
                    expect(testGraphic).toEqual(result.graphic);
                    expect(result.operation).toEqual("add");
                    done();
                },function(error){
                    console.log("Validate feature error: " + error);
                });
        });

        async.it("validate feature that exists in db - ADD", function(done){
            var id = getObjectIds([g6]).toString();
            expect(id).toEqual("-3");
            g_featureLayers[0]._validateFeature(g6,g_featureLayers[0].url,"add")
                .then(function(result){
                    expect(result.success).toBe(true);
                    expect(g6).toEqual(result.graphic);
                    expect(JSON.stringify(g6.toJson()) === JSON.stringify(result.graphic.toJson())).toBeTruthy();
                    expect(result.operation).toEqual("add");
                    done();
                },function(error){
                    console.log("Validate feature error: " + error);
                });
        });

        // This UPDATE should be converted in an ADD
        async.it("validate feature that exists in db - UPDATE", function(done){
            var id = getObjectIds([g6]).toString();
            expect(id).toEqual("-3");
            g_featureLayers[0]._validateFeature(g6,g_featureLayers[0].url,"update")
                .then(function(result){
                    expect(result.success).toBe(true);
                    expect(g6).toEqual(result.graphic);

                    // we swap the operation type when updating an edit that hasn't
                    // been submitted to the server yet.
                    expect(result.operation).toBe("add");
                    expect(JSON.stringify(g6.toJson()) === JSON.stringify(result.graphic.toJson())).toBeTruthy();
                    expect(result.operation).toEqual("add");
                    done();
                },function(error){
                    console.log("Validate feature error: " + error);
                });
        });

        // Checking for errors and error handling
        async.it("delete a non-existing feature directly from db", function(done){

            var fakeGraphic = new g_modules.Graphic({"geometry":{"x":-10910,"y":513700,"spatialReference":{"wkid":102100}},"attributes":{"symbolname":"Reference Point 1234","z":null,"additionalinformation":null,"eny":null,"datetimevalid":null,"datetimeexpired":null,"distance":null,"azimuth":null,"uniquedesignation":null,"x":null,"y":null}} );
            g_editsStore.delete(g_featureLayers[0].url,fakeGraphic,function(success,error){
                expect(success).toBe(false);
                done();
            });
        });

        // Checking for errors and error handling
        async.it("delete a non-existing feature using extended feature layer", function(done){

            var fakeGraphic = new g_modules.Graphic({"geometry":{"x":-10910,"y":513700,"spatialReference":{"wkid":102100}},"attributes":{"symbolname":"Reference Point 1234","z":null,"additionalinformation":null,"eny":null,"datetimevalid":null,"datetimeexpired":null,"distance":null,"azimuth":null,"uniquedesignation":null,"x":null,"y":null}} );
            g_featureLayers[0]._deleteTemporaryFeature(fakeGraphic,function(results){
                expect(results[0]).toBe(false);
                expect(results[1]).toBe(false);
                done();
            });
        });

        // This private function deletes a temporary graphic and it's associated phantom graphic
        async.it("delete an existing feature using extended feature layer", function(done){

            g_featureLayers[0]._deleteTemporaryFeature(g5,function(results){
                expect(results[0]).toBe(true);
                expect(results[1]).toBe(true);
                done();
            });
        });

        async.it("check db size", function(done){
            g_featureLayers[0].getUsage(function(usage,error){
                expect(usage.sizeBytes).toBe(3847);
                expect(usage.editCount).toBe(5);
                expect(error).toBe(null);
                done();
            })
        });
    });

    // TO-DO!!
    describe("Test attachments", function(){
        async.it("Add image attachment", function(done){


            var xhr = new XMLHttpRequest();
            xhr.open("GET","../samples/images/blue-pin.png",true);
            xhr.responseType = "blob";

            xhr.onload = function()
            {
                if( xhr.status === 200)
                {
                    var blob = new Blob([this.response],{type: 'image/png'});

                    // Verify our image is a PNG file!
                    var reader = new FileReader();
                    reader.onload = function (evt) {
                        file = evt.target.result;
                        var test = file.slice(0,4);
                        expect(test).toContain("PNG");
                    };
                    reader.readAsBinaryString(blob);

                    var parts = [blob,"test", new ArrayBuffer(blob.size)];

                    var file = new File(parts,"blue-pin.png",{
                        lastModified: new Date(0),
                        type: "image/png"
                    });

                    var formNode = {
                        elements:[
                            {type:"file",
                                files:[file]}
                        ]
                    };

                    g_offlineFeaturesManager.initAttachments(function(success){
                        expect(success).toBe(true);
                        if(success){

                            g_featureLayers[0].addAttachment(/* objectid */1,/* form node */ formNode,function(event){
                                expect(event.attachmentId).toBe(-4);
                                expect(event.objectId).toBe(1);
                                expect(event.success).toBe(true);
                                //console.log("ATTACHMENTS: " + JSON.stringify(event));
                                done();
                            },function(error){
                                expect(error).toBe(true); // we want to fail if there is an error!
                                done();
                            });
                        }
                    });
                }
                else
                {
                    console.log("Test attachments failed");
                }
            };
            xhr.onerror = function(e)
            {
                console.log("Test attachments failed: " + JSON.stringify(e));
            };

            xhr.send(null);
        });

        // Change the image to a GIF
        async.it("Update image attachment", function(done){

            var xhr = new XMLHttpRequest();
            xhr.open("GET","../samples/images/loading.gif",true);
            xhr.responseType = "blob";

            xhr.onload = function()
            {
                if( xhr.status === 200)
                {
                    var blob = new Blob([this.response],{type: 'image/png'});

                    // Verify our image is a GIF file!
                    var reader = new FileReader();
                    reader.onload = function (evt) {
                        file = evt.target.result;
                        var test = file.slice(0,6);
                        expect(test).toContain("GIF89a");
                    };
                    reader.readAsBinaryString(blob);

                    var parts = [blob,"test", new ArrayBuffer(blob.size)];

                    var file = new File(parts,"loading.gif",{
                        lastModified: new Date(0),
                        type: "image/png"
                    });

                    var formNode = {
                        elements:[
                            {type:"file",
                                files:[file]}
                        ]
                    };

                    g_featureLayers[0].updateAttachment(/* objectid */1,/* attachmentId */-4,/* form node */ formNode,function(event){
                        expect(event.attachmentId).toBe(-4);
                        expect(event.objectId).toBe(1);
                        expect(event.success).toBe(true);
                        //console.log("ATTACHMENTS: " + JSON.stringify(event));
                        done();
                    },function(error){
                        expect(error).toBe(true); // we want to fail if there is an error!
                        done();
                    });

                }
                else
                {
                    console.log("Test attachments failed");
                }
            };
            xhr.onerror = function(e)
            {
                console.log("Test attachments failed: " + JSON.stringify(e));
            };

            xhr.send(null);
        });

        async.it("Delete image attachment", function(done){
            g_featureLayers[0].deleteAttachments(1,[-4],function(event) {
                expect(event[0].attachmentId).toBe(-4);
                expect(event[0].objectId).toBe(1);
                expect(event[0].success).toBe(true);
                console.log("DELETE DELETE " + JSON.stringify(event));
                done();
            }, function(error) {
                expect(error).toBe(true);
                done();
            });
        });
    });

    describe("Test PhantomGraphicsLayer using editsStore directly", function()
    {
        async.it("Get PhantomLayerGraphics array via editsStore", function(done){
            g_editsStore.getPhantomGraphicsArray(function(results,errors){

                // Should be the same size as the number of edits!!
                expect(results.length).toBe(5);
                expect(results[0].id).toBe("phantom-layer|@|-1");
                //expect(results[1].id).toBe("phantom-layer|@|-2");
                expect(results[1].id).toBe("phantom-layer|@|-3");
                expect((results[2].id).indexOf(g_editsStore.PHANTOM_GRAPHIC_PREFIX)).toBe(0);
                expect((results[3].id).indexOf(g_editsStore.PHANTOM_GRAPHIC_PREFIX)).toBe(0);
                expect((results[4].id).indexOf(g_editsStore.PHANTOM_GRAPHIC_PREFIX)).toBe(0);
                //expect((results[5].id).indexOf(g_editsStore.PHANTOM_GRAPHIC_PREFIX)).toBe(0);
                //expect((results[6].id).indexOf(g_editsStore.PHANTOM_GRAPHIC_PREFIX)).toBe(0);
                //expect((results[8].id).indexOf(g_editsStore.PHANTOM_GRAPHIC_PREFIX)).toBe(0);
                expect(errors).toBe("end");
                done();
            })
        });

        // offlineFeaturesManager results should be the same as getting results directly from database
        async.it("Get PhantomLayerGraphics via the layer", function(done){
            g_featureLayers[0].getPhantomGraphicsArray(function(result,array){
                expect(result).toBe(true);
                expect(typeof array).toBe("object");
                expect(array.length).toBe(5);
                expect(array[0].id).toBe("phantom-layer|@|-1");
                //expect(results[1].id).toBe("phantom-layer|@|-2");
                expect(array[1].id).toBe("phantom-layer|@|-3");
                expect((array[2].id).indexOf(g_editsStore.PHANTOM_GRAPHIC_PREFIX)).toBe(0);
                expect((array[3].id).indexOf(g_editsStore.PHANTOM_GRAPHIC_PREFIX)).toBe(0);
                expect((array[4].id).indexOf(g_editsStore.PHANTOM_GRAPHIC_PREFIX)).toBe(0);
                //expect((array[5].id).indexOf(g_editsStore.PHANTOM_GRAPHIC_PREFIX)).toBe(0);
                //expect((array[6].id).indexOf(g_editsStore.PHANTOM_GRAPHIC_PREFIX)).toBe(0);
                //expect((results[8].id).indexOf(g_editsStore.PHANTOM_GRAPHIC_PREFIX)).toBe(0);
                done();
            });
        });

        async.it("Set PhantomLayerGraphic", function(done){
            var graphic = new g_modules.Graphic({"geometry":{"x":-109900,"y":5137000,"spatialReference":{"wkid":102100}},"attributes":{"objectid":"test001","symbolname":"Reference Point DLRP","z":null,"additionalinformation":null,"eny":null,"datetimevalid":null,"datetimeexpired":null,"distance":null,"azimuth":null,"uniquedesignation":null,"x":null,"y":null}} );
            g_editsStore.pushPhantomGraphic(graphic,function(result,error){
                expect(result).toBe(true);
                expect(error).toBe(null);
                done();
            });
        });

        async.it("Get simple PhantomLayerGraphics array (internal)", function(done){
           g_editsStore._getPhantomGraphicsArraySimple(function(results,errors){

               // Should be the previous size + 1 additional phantom graphic.
               expect(results.length).toBe(6);
               expect(results[0]).toBe("phantom-layer|@|-1");
               expect(results[1]).toBe("phantom-layer|@|-3");
               expect((results[2]).indexOf(g_editsStore.PHANTOM_GRAPHIC_PREFIX)).toBe(0);
               expect((results[3]).indexOf(g_editsStore.PHANTOM_GRAPHIC_PREFIX)).toBe(0);
               expect((results[4]).indexOf(g_editsStore.PHANTOM_GRAPHIC_PREFIX)).toBe(0);
               //expect((results[5]).indexOf(g_editsStore.PHANTOM_GRAPHIC_PREFIX)).toBe(0);
               //expect((results[6]).indexOf(g_editsStore.PHANTOM_GRAPHIC_PREFIX)).toBe(0);
               //expect((results[7]).indexOf(g_editsStore.PHANTOM_GRAPHIC_PREFIX)).toBe(0);
               expect(results[5]).toBe("phantom-layer|@|test001");
               expect(errors).toBe("end");
               done();
           })
        });

        async.it("Add two more PhantomLayer graphics to database", function(done){
            var graphic = new g_modules.Graphic({"geometry":{"x":-109901,"y":5137000,"spatialReference":{"wkid":102100}},"attributes":{"objectid":"test002","symbolname":"Reference Point DLRP","z":null,"additionalinformation":null,"eny":null,"datetimevalid":null,"datetimeexpired":null,"distance":null,"azimuth":null,"uniquedesignation":null,"x":null,"y":null}} );

            g_editsStore.pushPhantomGraphic(graphic,function(result,error){
                expect(result).toBe(true);
                expect(error).toBe(null);

                var graphic2 = new g_modules.Graphic({"geometry":{"x":-109901,"y":5137001,"spatialReference":{"wkid":102100}},"attributes":{"objectid":"test003","symbolname":"Reference Point DLRP","z":null,"additionalinformation":null,"eny":null,"datetimevalid":null,"datetimeexpired":null,"distance":null,"azimuth":null,"uniquedesignation":null,"x":null,"y":null}} );

                g_editsStore.pushPhantomGraphic(graphic2,function(result,error){
                    expect(result).toBe(true);
                    expect(error).toBe(null);
                    done();
                });
            });
        });

        async.it("Get simple PhantomLayerGraphics array (internal)", function(done){
            g_editsStore._getPhantomGraphicsArraySimple(function(results,errors){

                // We added two phantom graphics to previous result
                expect(results.length).toBe(8);
                expect(results[0]).toBe("phantom-layer|@|-1");
                //expect(results[1]).toBe("phantom-layer|@|-2");
                expect(results[1]).toBe("phantom-layer|@|-3");
                expect((results[2]).indexOf(g_editsStore.PHANTOM_GRAPHIC_PREFIX)).toBe(0);
                expect((results[3]).indexOf(g_editsStore.PHANTOM_GRAPHIC_PREFIX)).toBe(0);
                expect((results[4]).indexOf(g_editsStore.PHANTOM_GRAPHIC_PREFIX)).toBe(0);
                //expect((results[5]).indexOf(g_editsStore.PHANTOM_GRAPHIC_PREFIX)).toBe(0);
                //expect((results[6]).indexOf(g_editsStore.PHANTOM_GRAPHIC_PREFIX)).toBe(0);
                //expect((results[7]).indexOf(g_editsStore.PHANTOM_GRAPHIC_PREFIX)).toBe(0);
                expect(results[5]).toBe("phantom-layer|@|test001");
                expect(results[6]).toBe("phantom-layer|@|test002");
                expect(results[7]).toBe("phantom-layer|@|test003");
                expect(errors).toBe("end");
                done();
            })
        });

        async.it("Delete a single graphic in the phantom graphics layer", function(done){
           g_editsStore.deletePhantomGraphic("phantom-layer|@|test001",function(success){
               expect(success).toBe(true);

               g_editsStore._getPhantomGraphicsArraySimple(function(results,errors){

                   // We remove one graphic from the previous result of 12
                   expect(results.length).toBe(7);
                   expect(results[0]).toBe("phantom-layer|@|-1");
                   //expect(results[1]).toBe("phantom-layer|@|-2");
                   expect(results[1]).toBe("phantom-layer|@|-3");
                   expect((results[2]).indexOf(g_editsStore.PHANTOM_GRAPHIC_PREFIX)).toBe(0);
                   expect((results[3]).indexOf(g_editsStore.PHANTOM_GRAPHIC_PREFIX)).toBe(0);
                   expect((results[4]).indexOf(g_editsStore.PHANTOM_GRAPHIC_PREFIX)).toBe(0);
                   //expect((results[5]).indexOf(g_editsStore.PHANTOM_GRAPHIC_PREFIX)).toBe(0);
                   //expect((results[6]).indexOf(g_editsStore.PHANTOM_GRAPHIC_PREFIX)).toBe(0);
                   //expect((results[7]).indexOf(g_editsStore.PHANTOM_GRAPHIC_PREFIX)).toBe(0);
                   expect(results[5]).toBe("phantom-layer|@|test002");
                   expect(results[6]).toBe("phantom-layer|@|test003");
                   expect(errors).toBe("end");
                   done();
               })
           })
        });

        //async.it("delete temporary feature", function(done){
        //    g_featureLayers[0]._deleteTemporaryFeature(g6,function(results){
        //        expect(results[0]).toBe(true);
        //        expect(results[1]).toBe(true);
        //        done();
        //    });
        //});

        async.it("Delete one of the phantom graphics using resetLimitedPhantomGraphicsQueue()", function(done){
            var responseObject = {
                0:{
                    "id":-1,
                    "updateResults":[
                        {
                        "success":false
                        }
                    ],
                    "addResults":[
                        {
                            "success":true
                        }
                    ],
                    "deleteResults":[
                        {
                            "success":false
                        }
                    ]
                }
            };

            g_editsStore.resetLimitedPhantomGraphicsQueue(responseObject,function(success){
                expect(success).toBe(true);
                done();
            });
        });

        async.it("Reverify total number of phantom graphics", function(done){
            g_editsStore._getPhantomGraphicsArraySimple(function(results,errors){

                // We remove one graphic from the previous result and should now be @ 9
                expect(results.length).toBe(6);
                //expect(results[0]).toBe("phantom-layer|@|-1");
                expect(results[0]).toBe("phantom-layer|@|-3");
                expect((results[1]).indexOf(g_editsStore.PHANTOM_GRAPHIC_PREFIX)).toBe(0);
                expect((results[2]).indexOf(g_editsStore.PHANTOM_GRAPHIC_PREFIX)).toBe(0);
                expect((results[3]).indexOf(g_editsStore.PHANTOM_GRAPHIC_PREFIX)).toBe(0);
                //expect((results[4]).indexOf(g_editsStore.PHANTOM_GRAPHIC_PREFIX)).toBe(0);
                //expect((results[5]).indexOf(g_editsStore.PHANTOM_GRAPHIC_PREFIX)).toBe(0);
                //expect((results[6]).indexOf(g_editsStore.PHANTOM_GRAPHIC_PREFIX)).toBe(0);
                expect(results[4]).toBe("phantom-layer|@|test002");
                expect(results[5]).toBe("phantom-layer|@|test003");
                expect(errors).toBe("end");
                done();
            })
        });

        async.it("Delete all PhantomLayerGraphics", function(done){

           g_editsStore.resetPhantomGraphicsQueue(function(result){
               expect(result).toBe(true);

               g_editsStore._getPhantomGraphicsArraySimple(function(results,errors){
                   expect(results.length).toBe(0);
                   expect(errors).toBe("end");
                   done();
               })
           })
        });
    });

    describe("Test FeatureLayerJSON store", function()
    {

        async.it("delete non-existent FeatureLayer data", function(done){
            g_editsStore.deleteFeatureLayerJSON(function(success, msg){
                expect(success).toBe(false);
                expect(msg.message).toBe("id does not exist");

                g_editsStore.getFeatureLayerJSON(function(success,msg){
                    expect(success).toBe(false);
                    expect(msg).toBe("nothing found");
                    done();
                });
            })
        });

        async.it("store FeatureLayerJSON data using editsStore directly", function(done){
            var dataObject = {
                graphics: {test:1},
                renderer: {test:2}
            };
            g_editsStore.pushFeatureLayerJSON(dataObject,function(result){
                expect(result).toBe(true);
                done();
            });
        });

        async.it("retrieve FeatureLayerJSON data", function(done){
            g_editsStore.getFeatureLayerJSON(function(success,data){
                expect(success).toBe(true);
                expect(data.id).toBe(g_editsStore.FEATURE_LAYER_JSON_ID);
                expect(typeof data.graphics).toBe("object");
                expect(typeof data.renderer).toBe("object");
                done();
            });
        });

        async.it("update FeatureLayerJSON data", function(done){
            var dataObject = {
                graphics: {test: 2}
            };
            g_editsStore.pushFeatureLayerJSON(dataObject,function(success,result){
                expect(success).toBe(true);
                expect(result).toBe(null);

                g_editsStore.getFeatureLayerJSON(function(success,data){
                    expect(success).toBe(true);
                    expect(data.id).toBe(g_editsStore.FEATURE_LAYER_JSON_ID);
                    expect(data.graphics.test).toBe(2);
                    done();
                });
            })
        });

        async.it("delete FeatureLayerJSON data", function(done){
            g_editsStore.deleteFeatureLayerJSON(function(success, msg){
                expect(success).toBe(true);
                expect(msg.message).toBe("id does not exist");

                g_editsStore.getFeatureLayerJSON(function(success,msg){
                    expect(success).toBe(false);
                    expect(msg).toBe("nothing found");
                    done();
                });
            })
        });
    });

    describe("Before going online", function(){
        async.it("Before going online validate graphic layer properties", function(done){
            // Remember we deleted g3! So our total count is 8 not 9. HOWEVER, there should be 9 records in the database!
            expect(getObjectIds(g_featureLayers[0].graphics)).toEqual(getObjectIds([g1,g2,g4,g5,g6]));
            //expect(getObjectIds(g_featureLayers[1].graphics)).toEqual(getObjectIds([l1,l2,l3]));
            expect(g_featureLayers[0].graphics.length).toBe(5);
            //expect(g_featureLayers[1].graphics.length).toBe(3);
            //expect(g_featureLayers[2].graphics.length).toBe(0);
            done();
        });

        async.it("Retrieve edits array from the layer", function(done){
            g_featureLayers[0].getAllEditsArray(function(success,array){
                expect(success).toBe(true); console.log("ARRAY " + JSON.stringify(array))
                expect(array.length).toBe(5);
                done();
            });
        });
    });

    describe("go Online", function()
    {
        async.it("go Online", function(done)
        {

            var listener = jasmine.createSpy('event listener all edits sent');
            var listener_editsSent = jasmine.createSpy('event listener edits sent');

            g_offlineFeaturesManager.on(g_offlineFeaturesManager.events.ALL_EDITS_SENT,listener);

            g_offlineFeaturesManager.goOnline(function(results) {
                console.log("Library is now back online");
                expect(g_offlineFeaturesManager.getOnlineStatus()).toBe(g_offlineFeaturesManager.ONLINE);
                expect(listener).toHaveBeenCalled();
                expect(results.features.success).toBeTruthy();

                //console.log("RESPONSES " + JSON.stringify(responses) + ", " + JSON.stringify(results))

                expect(Object.keys(results.features.responses).length).toBe(5);
                for (var key in results.features.responses) {

                    var response = results.features.responses[key];

                    console.log("RESPONSE " + JSON.stringify(response))

                    var layerId = response.layer.substring(response.layer.lastIndexOf('/') + 1);

                    expect(typeof response.tempId).toBe("object");
                    expect(typeof response.updateResults).toBe("object");
                    expect(typeof response.deleteResults).toBe("object");
                    expect(typeof response.addResults).toBe("object");
                    expect(typeof response.id).toBe("string");
                    expect(typeof response.layer).toBe("string");

                    if(response.updateResults.length > 0){
                        expect(response.updateResults[0].success).toBe(true);
                        expect(response.updateResults[0].objectId).toBeGreaterThan(0);
                    }
                    if(response.deleteResults.length > 0){
                        expect(response.deleteResults[0].success).toBe(true);
                        expect(response.deleteResults[0].objectId).toBeGreaterThan(0);
                    }
                    if(response.addResults.length > 0){
                        expect(response.addResults[0].success).toBe(true);
                        expect(response.addResults[0].objectId).toBeGreaterThan(0);
                    }
                }
                done();
            });
        });
    });

    describe("After online", function(){
        async.it("After online - verify feature layer graphic counts",function(done){
            // all of them are positive
            expect(getObjectIds(g_featureLayers[0].graphics).filter(function(id){ return id<0; })).toEqual([-2,-3]);
            //expect(getObjectIds(g_featureLayers[1].graphics).filter(function(id){ return id<0; })).toEqual([]);
            expect(g_featureLayers[0].graphics.length).toBe(5);
            //expect(g_featureLayers[1].graphics.length).toBe(3);
            countFeatures(g_featureLayers[0], function(success,result)
            {
                expect(success).toBeTruthy();
                expect(result.count).toBe(4);
                done();
            });
        });

        async.it("Retrieve edits array from the layer", function(done){
            g_featureLayers[0].getAllEditsArray(function(success,array){
                expect(success).toBe(true); console.log("ARRAY " + JSON.stringify(array))
                expect(array.length).toBe(0);
                done();
            });
        });

        async.it("After online - verify online status",function(done){
            expect(g_offlineFeaturesManager.getOnlineStatus()).toBe(g_offlineFeaturesManager.ONLINE);
            done();
        });

        async.it("After online - check pending edits count 0",function(done){
            g_editsStore.pendingEditsCount(function(result){
                expect(result).toBe(0);
                done();
            });
        });
    });
});