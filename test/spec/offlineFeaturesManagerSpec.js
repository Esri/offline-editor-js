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

describe("Normal online editing", function()
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
				if(count==3)
					done();
			}
			clearFeatureLayer( g_featureLayers[0], function(success,response)
			{
				expect(success).toBeTruthy();
				var listener = g_featureLayers[0].on('update-end', function(){ listener.remove(); completedOne();})
				g_featureLayers[0].refresh();
				
			});
			clearFeatureLayer( g_featureLayers[1], function(success,response)
			{
				expect(success).toBeTruthy();
				var listener = g_featureLayers[1].on('update-end', function(){ listener.remove(); completedOne();})
				g_featureLayers[1].refresh();
			});
			clearFeatureLayer( g_featureLayers[2], function(success,response)
			{
				expect(success).toBeTruthy();
				var listener = g_featureLayers[2].on('update-end', function(){ listener.remove(); completedOne();})
				g_featureLayers[2].refresh();
			});
		});

		async.it("add test features", function(done)
		{
			expect(g_featureLayers[0].graphics.length).toBe(0);

			g1 = new g_modules.Graphic({"geometry":{"x":-105400,"y":5137000,"spatialReference":{"wkid":102100}},"attributes":{"symbolname":"Ground Zero","z":null,"additionalinformation":null,"eny":null,"datetimevalid":null,"datetimeexpired":null,"distance":null,"azimuth":null,"uniquedesignation":null,"x":null,"y":null}});
			g2 = new g_modules.Graphic({"geometry":{"x":-105600,"y":5137000,"spatialReference":{"wkid":102100}},"attributes":{"symbolname":"Ground Zero","z":null,"additionalinformation":null,"eny":null,"datetimevalid":null,"datetimeexpired":null,"distance":null,"azimuth":null,"uniquedesignation":null,"x":null,"y":null}});
			g3 = new g_modules.Graphic({"geometry":{"x":-105800,"y":5137000,"spatialReference":{"wkid":102100}},"attributes":{"symbolname":"Ground Zero","z":null,"additionalinformation":null,"eny":null,"datetimevalid":null,"datetimeexpired":null,"distance":null,"azimuth":null,"uniquedesignation":null,"x":null,"y":null}});

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

		async.it("delete test features", function(done)
		{
			expect(getObjectIds(g_featureLayers[0].graphics)).toEqual(getObjectIds([g1,g2,g3]));
			expect(g_featureLayers[0].graphics.length).toBe(3);

			var deletes = [g3];
			g_featureLayers[0]._applyEdits(null,null,deletes,function(addResults,updateResults,deleteResults)
			{
				expect(deleteResults.length).toBe(1);
				expect(getObjectIds(g_featureLayers[0].graphics)).toEqual(getObjectIds([g1,g2]));
				expect(g_featureLayers[0].graphics.length).toBe(2);
				done();
			},
			function(error)
			{
				expect(true).toBeFalsy();
				done();
			});
		});
	});

	describe("Extended applyEdits method (online)", function()
	{
		async.it("clears the feature layers", function(done)
		{
			var count = 0;
			function completedOne()
			{
				count += 1;
				console.log(count);
				if(count==3)
					done();
			}
			clearFeatureLayer( g_featureLayers[0], function(success,response)
			{
				expect(success).toBeTruthy();
				var listener = g_featureLayers[0].on('update-end', function(){ listener.remove(); completedOne();})
				g_featureLayers[0].refresh();
				
			});
			clearFeatureLayer( g_featureLayers[1], function(success,response)
			{
				expect(success).toBeTruthy();
				var listener = g_featureLayers[1].on('update-end', function(){ listener.remove(); completedOne();})
				g_featureLayers[1].refresh();
			});
			clearFeatureLayer( g_featureLayers[2], function(success,response)
			{
				expect(success).toBeTruthy();
				var listener = g_featureLayers[2].on('update-end', function(){ listener.remove(); completedOne();})
				g_featureLayers[2].refresh();
			});
		});

		async.it("add test features", function(done)
		{
			expect(g_featureLayers[0].graphics.length).toBe(0);

			g1 = new g_modules.Graphic({"geometry":{"x":-105400,"y":5137000,"spatialReference":{"wkid":102100}},"attributes":{"symbolname":"Ground Zero","z":null,"additionalinformation":null,"eny":null,"datetimevalid":null,"datetimeexpired":null,"distance":null,"azimuth":null,"uniquedesignation":null,"x":null,"y":null}});
			g2 = new g_modules.Graphic({"geometry":{"x":-105600,"y":5137000,"spatialReference":{"wkid":102100}},"attributes":{"symbolname":"Ground Zero","z":null,"additionalinformation":null,"eny":null,"datetimevalid":null,"datetimeexpired":null,"distance":null,"azimuth":null,"uniquedesignation":null,"x":null,"y":null}});
			g3 = new g_modules.Graphic({"geometry":{"x":-105800,"y":5137000,"spatialReference":{"wkid":102100}},"attributes":{"symbolname":"Ground Zero","z":null,"additionalinformation":null,"eny":null,"datetimevalid":null,"datetimeexpired":null,"distance":null,"azimuth":null,"uniquedesignation":null,"x":null,"y":null}});

			var adds = [g1,g2,g3];
			g_featureLayers[0].applyEdits(adds,null,null,function(addResults,updateResults,deleteResults)
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
			g_featureLayers[0].applyEdits(null,updates,null,function(addResults,updateResults,deleteResults)
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

		async.it("delete test features", function(done)
		{
			expect(getObjectIds(g_featureLayers[0].graphics)).toEqual(getObjectIds([g1,g2,g3]));
			expect(g_featureLayers[0].graphics.length).toBe(3);

			var deletes = [g3];
			g_featureLayers[0].applyEdits(null,null,deletes,function(addResults,updateResults,deleteResults)
			{
				expect(deleteResults.length).toBe(1);
				expect(getObjectIds(g_featureLayers[0].graphics)).toEqual(getObjectIds([g1,g2]));
				expect(g_featureLayers[0].graphics.length).toBe(2);
				done();
			},
			function(error)
			{
				expect(true).toBeFalsy();
				done();
			});
		});
	});
});

describe("Offline Editing", function()
{
	var g1,g2,g3;
	var g4,g5,g6;
	var l1,l2,l3;

	async.it("clear feature Layers - points - lines", function(done)
	{
		var count = 0;
		function completedOne()
		{
			count += 1;
			if(count==3)
				done();
		}
		clearFeatureLayer( g_featureLayers[0], function(success,response)
		{
			expect(success).toBeTruthy();
			var listener = g_featureLayers[0].on('update-end', function(){ listener.remove(); completedOne();})
			g_featureLayers[0].refresh();
			
		});
		clearFeatureLayer( g_featureLayers[1], function(success,response)
		{
			expect(success).toBeTruthy();
			var listener = g_featureLayers[1].on('update-end', function(){ listener.remove(); completedOne();})
			g_featureLayers[1].refresh();
		});
		clearFeatureLayer( g_featureLayers[2], function(success,response)
		{
			expect(success).toBeTruthy();
			var listener = g_featureLayers[2].on('update-end', function(){ listener.remove(); completedOne();})
			g_featureLayers[2].refresh();
		});
	});

	async.it("clear local store - points - lines",function(done)
	{
		g_editsStore.resetEditsQueue();
		expect(g_editsStore.hasPendingEdits()).toBeFalsy();
		done();
	});

	async.it("add some features - points", function(done)
	{
		expect(g_offlineFeaturesManager.getOnlineStatus()).toBe(g_offlineFeaturesManager.ONLINE);

		g1 = new g_modules.Graphic({"geometry":{"x":-105400,"y":5137000,"spatialReference":{"wkid":102100}},"attributes":{"symbolname":"Ground Zero","z":null,"additionalinformation":null,"eny":null,"datetimevalid":null,"datetimeexpired":null,"distance":null,"azimuth":null,"uniquedesignation":null,"x":null,"y":null}});
		g2 = new g_modules.Graphic({"geometry":{"x":-105600,"y":5137000,"spatialReference":{"wkid":102100}},"attributes":{"symbolname":"Ground Zero","z":null,"additionalinformation":null,"eny":null,"datetimevalid":null,"datetimeexpired":null,"distance":null,"azimuth":null,"uniquedesignation":null,"x":null,"y":null}});
		g3 = new g_modules.Graphic({"geometry":{"x":-105800,"y":5137000,"spatialReference":{"wkid":102100}},"attributes":{"symbolname":"Ground Zero","z":null,"additionalinformation":null,"eny":null,"datetimevalid":null,"datetimeexpired":null,"distance":null,"azimuth":null,"uniquedesignation":null,"x":null,"y":null}});

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

	async.it("add some features - lines", function(done)
	{
		expect(g_offlineFeaturesManager.getOnlineStatus()).toBe(g_offlineFeaturesManager.ONLINE);

		l1 = new g_modules.Graphic({"geometry":{"paths":[[[-101300,5136900],[-108400,5136900]]],"spatialReference":{"wkid":102100}},"attributes":{"ruleid":40,"zmax":null,"additionalinformation":null,"eny":null,"uniquedesignation":null,"datetimevalid":null,"datetimeexpired":null,"distance":null,"azimuth":null,"echelon":null,"x":null,"y":null,"z":null,"zmin":null}});
		l2 = new g_modules.Graphic({"geometry":{"paths":[[[-101300,5136800],[-108400,5136800]]],"spatialReference":{"wkid":102100}},"attributes":{"ruleid":40,"zmax":null,"additionalinformation":null,"eny":null,"uniquedesignation":null,"datetimevalid":null,"datetimeexpired":null,"distance":null,"azimuth":null,"echelon":null,"x":null,"y":null,"z":null,"zmin":null}});
		l3 = new g_modules.Graphic({"geometry":{"paths":[[[-101300,5136700],[-108400,5136700]]],"spatialReference":{"wkid":102100}},"attributes":{"ruleid":40,"zmax":null,"additionalinformation":null,"eny":null,"uniquedesignation":null,"datetimevalid":null,"datetimeexpired":null,"distance":null,"azimuth":null,"echelon":null,"x":null,"y":null,"z":null,"zmin":null}});

		var adds = [l1,l2,l3];
		g_featureLayers[1].applyEdits(adds,null,null,function(addResults,updateResults,deleteResults)
		{
			expect(addResults.length).toBe(3);
			expect(getObjectIds(g_featureLayers[1].graphics)).toEqual(getObjectIds([l1,l2,l3]));
			expect(g_featureLayers[1].graphics.length).toBe(3);
			countFeatures(g_featureLayers[1], function(success,result)
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

	async.it("go Offline", function(done)
	{
		expect(g_offlineFeaturesManager.getOnlineStatus()).toBe(g_offlineFeaturesManager.ONLINE);
		g_offlineFeaturesManager.goOffline();
		expect(g_offlineFeaturesManager.getOnlineStatus()).toBe(g_offlineFeaturesManager.OFFLINE);
		done();
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
		{
			expect(updateResults.length).toBe(3);
			expect(updateResults[0].success).toBeTruthy();
			expect(updateResults[1].success).toBeTruthy();
			expect(updateResults[2].success).toBeTruthy();
			expect(getObjectIds(g_featureLayers[0].graphics)).toEqual(getObjectIds([g1,g2,g3]));
			expect(g_featureLayers[0].graphics.length).toBe(3);
			expect(g_editsStore.pendingEditsCount()).toBe(3);
			done();
		},
		function(error)
		{
			expect(true).toBeFalsy();
			done();
		});
	});
	
	async.it("update existing features - lines", function(done)
	{
		expect(getObjectIds(g_featureLayers[1].graphics)).toEqual(getObjectIds([l1,l2,l3]));
		expect(g_featureLayers[1].graphics.length).toBe(3);
		expect(g_offlineFeaturesManager.getOnlineStatus()).toBe(g_offlineFeaturesManager.OFFLINE);

		/*
		l1.geometry.y += 300; // jabadia: change
		l2.geometry.y += 100;
		l3.geometry.y -= 200;
		*/
		var updates = [l1,l2,l3];
		g_featureLayers[1].applyEdits(null,updates,null,function(addResults,updateResults,deleteResults)
		{
			expect(updateResults.length).toBe(3);
			expect(updateResults[0].success).toBeTruthy();
			expect(updateResults[1].success).toBeTruthy();
			expect(updateResults[2].success).toBeTruthy();
			expect(getObjectIds(g_featureLayers[1].graphics)).toEqual(getObjectIds([l1,l2,l3]));
			expect(g_featureLayers[1].graphics.length).toBe(3);
			expect(g_editsStore.pendingEditsCount()).toBe(6);
			done();
		},
		function(error)
		{
			expect(true).toBeFalsy();
			done();
		});
	});
	
	async.it("update existing features again - points", function(done)
	{
		expect(getObjectIds(g_featureLayers[0].graphics)).toEqual(getObjectIds([g1,g2,g3]));
		expect(g_featureLayers[0].graphics.length).toBe(3);
		expect(g_offlineFeaturesManager.getOnlineStatus()).toBe(g_offlineFeaturesManager.OFFLINE);

		g1.geometry.y += 50;
		g2.geometry.y += 50;
		g3.geometry.y -= 50;
		var updates = [g1,g2,g3];
		g_featureLayers[0].applyEdits(null,updates,null,function(addResults,updateResults,deleteResults)
		{
			expect(updateResults.length).toBe(3);
			expect(updateResults[0].success).toBeTruthy();
			expect(updateResults[1].success).toBeTruthy();
			expect(updateResults[2].success).toBeTruthy();
			expect(getObjectIds(g_featureLayers[0].graphics)).toEqual(getObjectIds([g1,g2,g3]));
			expect(g_featureLayers[0].graphics.length).toBe(3);
			expect(g_editsStore.pendingEditsCount()).toBe(9);
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
	
	async.it("delete existing features - points", function(done)
	{
		expect(getObjectIds(g_featureLayers[0].graphics)).toEqual(getObjectIds([g1,g2,g3]));
		expect(g_featureLayers[0].graphics.length).toBe(3);

		var deletes = [g3];
		g_featureLayers[0].applyEdits(null,null,deletes,function(addResults,updateResults,deleteResults)
		{
			expect(deleteResults.length).toBe(1);
			expect(getObjectIds(g_featureLayers[0].graphics)).toEqual(getObjectIds([g1,g2]));
			expect(g_featureLayers[0].graphics.length).toBe(2);
			expect(g_editsStore.pendingEditsCount()).toBe(10);
			countFeatures(g_featureLayers[0], function(success,result)
			{
				expect(success).toBeTruthy();
				expect(result.count).toBe(3); // still 3, the delete is still offline
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

		g4 = new g_modules.Graphic({"geometry":{"x":-109100,"y":5137000,"spatialReference":{"wkid":102100}},"attributes":{"symbolname":"Reference Point DLRP","z":null,"additionalinformation":null,"eny":null,"datetimevalid":null,"datetimeexpired":null,"distance":null,"azimuth":null,"uniquedesignation":null,"x":null,"y":null}} );
		g5 = new g_modules.Graphic({"geometry":{"x":-109500,"y":5137000,"spatialReference":{"wkid":102100}},"attributes":{"symbolname":"Reference Point DLRP","z":null,"additionalinformation":null,"eny":null,"datetimevalid":null,"datetimeexpired":null,"distance":null,"azimuth":null,"uniquedesignation":null,"x":null,"y":null}} );
		g6 = new g_modules.Graphic({"geometry":{"x":-109900,"y":5137000,"spatialReference":{"wkid":102100}},"attributes":{"symbolname":"Reference Point DLRP","z":null,"additionalinformation":null,"eny":null,"datetimevalid":null,"datetimeexpired":null,"distance":null,"azimuth":null,"uniquedesignation":null,"x":null,"y":null}} );

		var adds = [g4,g5,g6];
		g_featureLayers[0].applyEdits(adds,null,null,function(addResults,updateResults,deleteResults)
		{
			expect(addResults.length).toBe(3);
			expect(g_editsStore.pendingEditsCount()).toBe(13);
			expect(getObjectIds(g_featureLayers[0].graphics)).toEqual(getObjectIds([g1,g2,g4,g5,g6]));
			expect(g_featureLayers[0].graphics.length).toBe(5);
			g4.attributes.objectid = addResults[0].objectId;
			g5.attributes.objectid = addResults[1].objectId;
			g6.attributes.objectid = addResults[2].objectId;
			expect(g4.attributes.objectid).toBeLessThan(0);
			expect(g5.attributes.objectid).toBeLessThan(g4.attributes.objectid);
			expect(g6.attributes.objectid).toBeLessThan(g5.attributes.objectid);
			countFeatures(g_featureLayers[0], function(success,result)
			{
				expect(success).toBeTruthy();
				expect(result.count).toBe(3); // still 3
				done();
			});
		},
		function(error)
		{
			expect(true).toBeFalsy();
		});
	});

	async.it("update new features - points", function(done)
	{
		expect(getObjectIds(g_featureLayers[0].graphics)).toEqual(getObjectIds([g1,g2,g4,g5,g6]));
		expect(g_featureLayers[0].graphics.length).toBe(5);
		expect(g_offlineFeaturesManager.getOnlineStatus()).toBe(g_offlineFeaturesManager.OFFLINE);

		g4.geometry.y += 100;
		g5.geometry.y += 50;
		g6.geometry.y -= 50;
		var updates = [g4,g5,g6];
		g_featureLayers[0].applyEdits(null,updates,null,function(addResults,updateResults,deleteResults)
		{
			expect(updateResults.length).toBe(3);
			expect(updateResults[0].success).toBeTruthy();
			expect(updateResults[1].success).toBeTruthy();
			expect(updateResults[2].success).toBeTruthy();
			expect(getObjectIds(g_featureLayers[0].graphics)).toEqual(getObjectIds([g1,g2,g4,g5,g6]));
			expect(g_featureLayers[0].graphics.length).toBe(5);
			expect(g_editsStore.pendingEditsCount()).toBe(16);

            var queue = g_editsStore.retrieveEditsQueue();
            expect(queue.length).toBe(16);

			countFeatures(g_featureLayers[0], function(success,result)
			{
				expect(success).toBeTruthy();
				expect(result.count).toBe(3); // still 3
				done();
			});
		},
		function(error)
		{
			expect(true).toBeFalsy();
			done();
		});
	});
	
	async.it("delete new features - points", function(done)
	{
		expect(getObjectIds(g_featureLayers[0].graphics)).toEqual(getObjectIds([g1,g2,g4,g5,g6]));
		expect(g_featureLayers[0].graphics.length).toBe(5);
		expect(g_offlineFeaturesManager.getOnlineStatus()).toBe(g_offlineFeaturesManager.OFFLINE);

		var deletes = [g5];
		g_featureLayers[0].applyEdits(null,null,deletes,function(addResults,updateResults,deleteResults)
		{
			expect(deleteResults.length).toBe(1);
			expect(deleteResults[0].success).toBeTruthy();
			expect(getObjectIds(g_featureLayers[0].graphics)).toEqual(getObjectIds([g1,g2,g4,g6]));
			expect(g_featureLayers[0].graphics.length).toBe(4);
			expect(g_editsStore.pendingEditsCount()).toBe(17);
			countFeatures(g_featureLayers[0], function(success,result)
			{
				expect(success).toBeTruthy();
				expect(result.count).toBe(3); // still 3, the delete is still offline
				done();
			});
		},
		function(error)
		{
			expect(true).toBeFalsy();
			done();
		});
	});

	async.it("go Online", function(done)
	{
		expect(getObjectIds(g_featureLayers[0].graphics)).toEqual(getObjectIds([g1,g2,g4,g6]));
		expect(getObjectIds(g_featureLayers[1].graphics)).toEqual(getObjectIds([l1,l2,l3]));
		expect(g_featureLayers[0].graphics.length).toBe(4);
		expect(g_featureLayers[1].graphics.length).toBe(3);

		var listener = jasmine.createSpy('event listener');
		g_offlineFeaturesManager.on(g_offlineFeaturesManager.events.ALL_EDITS_SENT, listener);
		
		g_offlineFeaturesManager.goOnline(function(results)
		{
			console.log("went online");
			expect(g_offlineFeaturesManager.getOnlineStatus()).toBe(g_offlineFeaturesManager.ONLINE);
			expect(listener).toHaveBeenCalled();
			expect(results.features.success).toBeTruthy();
			expect(Object.keys(results.features.responses).length).toBe(2);
			for(var layerUrl in results.features.responses)
			{
				if( !results.features.responses.hasOwnProperty(layerUrl))
					continue;
				
				var layerResponses = results.features.responses[layerUrl];
				var layerId = layerUrl.substring(layerUrl.lastIndexOf('/')+1);
				console.log(layerId, layerResponses);
				if( layerId == "1")
				{
					expect(layerResponses.addResults.length).toBe(2); // two adds (three offline adds minus one delete)
					expect(layerResponses.updateResults.length).toBe(2); // two updates (three updates to existing features minus one delete)
					expect(layerResponses.deleteResults.length).toBe(1); // one delete (one delete to an already existing feature)

					expect(layerResponses.addResults.filter(function(r){return !r.success;})).toEqual([]);
					expect(layerResponses.updateResults.filter(function(r){return !r.success;})).toEqual([]);
					expect(layerResponses.deleteResults.filter(function(r){return !r.success;})).toEqual([]);
				}
				else if( layerId == "2")
				{
					expect(layerResponses.addResults.length).toBe(0); // no adds
					expect(layerResponses.updateResults.length).toBe(3); // three updates
					expect(layerResponses.deleteResults.length).toBe(0); // no deletes

					expect(layerResponses.addResults.filter(function(r){return !r.success;})).toEqual([]);
					expect(layerResponses.updateResults.filter(function(r){return !r.success;})).toEqual([]);
					expect(layerResponses.deleteResults.filter(function(r){return !r.success;})).toEqual([]);
				}
			}
			expect(g_editsStore.pendingEditsCount()).toBe(0);

            var queue = g_editsStore.retrieveEditsQueue();
            expect(queue.length).toBe(0);

			// how to get the final id of g4 and g6 ?
			//expect(getObjectIds(g_featureLayers[0].graphics)).toEqual(getObjectIds([g1,g2,g4,g6]));
			// all of them are positive
			expect(getObjectIds(g_featureLayers[0].graphics).filter(function(id){ return id<0; })).toEqual([]);
			expect(getObjectIds(g_featureLayers[1].graphics).filter(function(id){ return id<0; })).toEqual([]);
			expect(g_featureLayers[0].graphics.length).toBe(4);
			expect(g_featureLayers[1].graphics.length).toBe(3);
			countFeatures(g_featureLayers[0], function(success,result)
			{
				expect(success).toBeTruthy();
				expect(result.count).toBe(4);
				countFeatures(g_featureLayers[1], function(success,result)
				{
					expect(success).toBeTruthy();
					expect(result.count).toBe(3);
					done();
				});
			});
		});;
		expect(g_offlineFeaturesManager.getOnlineStatus()).toBe(g_offlineFeaturesManager.RECONNECTING);
	});
});

describe("Offline edits optimized in zero edits", function()
{
	var g7;

	async.it("go Offline", function(done)
	{
		expect(g_offlineFeaturesManager.getOnlineStatus()).toBe(g_offlineFeaturesManager.ONLINE);
		g_offlineFeaturesManager.goOffline();
		expect(g_offlineFeaturesManager.getOnlineStatus()).toBe(g_offlineFeaturesManager.OFFLINE);
		done();
	});

	async.it("create one feature", function(done)
	{
		expect(g_featureLayers[0].graphics.length).toBe(4);
		expect(g_offlineFeaturesManager.getOnlineStatus()).toBe(g_offlineFeaturesManager.OFFLINE);

		g7 = new g_modules.Graphic({"geometry":{"x":-108100,"y":5137000,"spatialReference":{"wkid":102100}},"attributes":{"symbolname":"Reference Point DLRP","z":null,"additionalinformation":null,"eny":null,"datetimevalid":null,"datetimeexpired":null,"distance":null,"azimuth":null,"uniquedesignation":null,"x":null,"y":null}} );

		var adds = [g7];
		g_featureLayers[0].applyEdits(adds,null,null,function(addResults,updateResults,deleteResults)
		{
			expect(addResults.length).toBe(1);
			expect(g_editsStore.pendingEditsCount()).toBe(1);
			expect(g_featureLayers[0].graphics.length).toBe(5);
			g7.attributes.objectid = addResults[0].objectId;
			expect(g7.attributes.objectid).toBeLessThan(0);
			countFeatures(g_featureLayers[0], function(success,result)
			{
				expect(success).toBeTruthy();
				expect(result.count).toBe(4); // still 4
				done();
			});
		},
		function(error)
		{
			expect(true).toBeFalsy();
			done();
		});
	});

	async.it("delete the feature", function(done)
	{
		expect(g_featureLayers[0].graphics.length).toBe(5);
		expect(g_offlineFeaturesManager.getOnlineStatus()).toBe(g_offlineFeaturesManager.OFFLINE);

		var deletes = [g7];
		g_featureLayers[0].applyEdits(null,null,deletes,function(addResults,updateResults,deleteResults)
		{
			expect(deleteResults.length).toBe(1);
			expect(g_editsStore.pendingEditsCount()).toBe(2);
			expect(g_featureLayers[0].graphics.length).toBe(4);
			countFeatures(g_featureLayers[0], function(success,result)
			{
				expect(success).toBeTruthy();
				expect(result.count).toBe(4); // still 4
				done();
			});
		},
		function(error)
		{
			expect(true).toBeFalsy();
			done();
		});
	});

	async.it("go Online", function(done)
	{
		expect(g_featureLayers[0].graphics.length).toBe(4);
		expect(g_featureLayers[1].graphics.length).toBe(3);

		var listener = jasmine.createSpy('event listener');
		g_offlineFeaturesManager.on(g_offlineFeaturesManager.events.ALL_EDITS_SENT, listener);

		g_offlineFeaturesManager.goOnline(function(results)
		{
			console.log("went online");
			expect(g_offlineFeaturesManager.getOnlineStatus()).toBe(g_offlineFeaturesManager.ONLINE);
			expect(listener).toHaveBeenCalled();
			expect(results.features.success).toBeTruthy();
			expect(Object.keys(results.features.responses).length).toBe(0);
			expect(g_editsStore.pendingEditsCount()).toBe(0);
			// how to get the final id of g4 and g6 ?
			//expect(getObjectIds(g_featureLayers[0].graphics)).toEqual(getObjectIds([g1,g2,g4,g6]));
			// all of them are positive
			expect(getObjectIds(g_featureLayers[0].graphics).filter(function(id){ return id<0; })).toEqual([]);
			expect(getObjectIds(g_featureLayers[1].graphics).filter(function(id){ return id<0; })).toEqual([]);
			expect(g_featureLayers[0].graphics.length).toBe(4);
			expect(g_featureLayers[1].graphics.length).toBe(3);
			countFeatures(g_featureLayers[0], function(success,result)
			{
				expect(success).toBeTruthy();
				expect(result.count).toBe(4);
				countFeatures(g_featureLayers[1], function(success,result)
				{
					expect(success).toBeTruthy();
					expect(result.count).toBe(3);
					done();
				});
			});
		});
		expect(g_offlineFeaturesManager.getOnlineStatus()).toBe(g_offlineFeaturesManager.ONLINE);
	});

});
