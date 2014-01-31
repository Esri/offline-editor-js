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
			expect(g_featureLayers[0].graphics.length).toBe(3);

			var deletes = [g3];
			g_featureLayers[0]._applyEdits(null,null,deletes,function(addResults,updateResults,deleteResults)
			{
				expect(deleteResults.length).toBe(1);
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
				console.log(g_featureLayers[0].graphics);
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
			expect(g_featureLayers[0].graphics.length).toBe(3);

			var deletes = [g3];
			g_featureLayers[0].applyEdits(null,null,deletes,function(addResults,updateResults,deleteResults)
			{
				expect(deleteResults.length).toBe(1);
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

	async.it("clear feature Layers", function(done)
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

	async.it("add some features", function(done)
	{
		expect(g_offlineFeaturesManager.getOnlineStatus()).toBe(g_offlineFeaturesManager.ONLINE);

		g1 = new g_modules.Graphic({"geometry":{"x":-105400,"y":5137000,"spatialReference":{"wkid":102100}},"attributes":{"symbolname":"Ground Zero","z":null,"additionalinformation":null,"eny":null,"datetimevalid":null,"datetimeexpired":null,"distance":null,"azimuth":null,"uniquedesignation":null,"x":null,"y":null}});
		g2 = new g_modules.Graphic({"geometry":{"x":-105600,"y":5137000,"spatialReference":{"wkid":102100}},"attributes":{"symbolname":"Ground Zero","z":null,"additionalinformation":null,"eny":null,"datetimevalid":null,"datetimeexpired":null,"distance":null,"azimuth":null,"uniquedesignation":null,"x":null,"y":null}});
		g3 = new g_modules.Graphic({"geometry":{"x":-105800,"y":5137000,"spatialReference":{"wkid":102100}},"attributes":{"symbolname":"Ground Zero","z":null,"additionalinformation":null,"eny":null,"datetimevalid":null,"datetimeexpired":null,"distance":null,"azimuth":null,"uniquedesignation":null,"x":null,"y":null}});

		var adds = [g1,g2,g3];
		g_featureLayers[0].applyEdits(adds,null,null,function(addResults,updateResults,deleteResults)
		{
			expect(addResults.length).toBe(3);
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

	async.it("go Offline", function(done)
	{
		expect(g_offlineFeaturesManager.getOnlineStatus()).toBe(g_offlineFeaturesManager.ONLINE);
		g_offlineFeaturesManager.goOffline();
		expect(g_offlineFeaturesManager.getOnlineStatus()).toBe(g_offlineFeaturesManager.OFFLINE);
		done();
	});

	async.it("Update existing features", function(done)
	{
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
	
	async.it("Update existing features again", function(done)
	{
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
			expect(g_featureLayers[0].graphics.length).toBe(3);
			expect(g_editsStore.pendingEditsCount()).toBe(6);
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
	
	async.it("Delete existing features", function(done)
	{
		expect(g_featureLayers[0].graphics.length).toBe(3);

		var deletes = [g3];
		g_featureLayers[0].applyEdits(null,null,deletes,function(addResults,updateResults,deleteResults)
		{
			expect(deleteResults.length).toBe(1);
			expect(g_featureLayers[0].graphics.length).toBe(2);
			expect(g_editsStore.pendingEditsCount()).toBe(7);
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

	async.it("Add new features", function(done)
	{
		expect(g_featureLayers[0].graphics.length).toBe(2);
		expect(g_offlineFeaturesManager.getOnlineStatus()).toBe(g_offlineFeaturesManager.OFFLINE);

		g4 = new g_modules.Graphic({"geometry":{"x":-109100,"y":5137000,"spatialReference":{"wkid":102100}},"attributes":{"symbolname":"Reference Point DLRP","z":null,"additionalinformation":null,"eny":null,"datetimevalid":null,"datetimeexpired":null,"distance":null,"azimuth":null,"uniquedesignation":null,"x":null,"y":null}} );
		g5 = new g_modules.Graphic({"geometry":{"x":-109500,"y":5137000,"spatialReference":{"wkid":102100}},"attributes":{"symbolname":"Reference Point DLRP","z":null,"additionalinformation":null,"eny":null,"datetimevalid":null,"datetimeexpired":null,"distance":null,"azimuth":null,"uniquedesignation":null,"x":null,"y":null}} );
		g6 = new g_modules.Graphic({"geometry":{"x":-109900,"y":5137000,"spatialReference":{"wkid":102100}},"attributes":{"symbolname":"Reference Point DLRP","z":null,"additionalinformation":null,"eny":null,"datetimevalid":null,"datetimeexpired":null,"distance":null,"azimuth":null,"uniquedesignation":null,"x":null,"y":null}} );

		var adds = [g4,g5,g6];
		g_featureLayers[0].applyEdits(adds,null,null,function(addResults,updateResults,deleteResults)
		{
			expect(addResults.length).toBe(3);
			expect(g_editsStore.pendingEditsCount()).toBe(10);
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

	async.it("Update new features", function(done)
	{
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
			expect(g_featureLayers[0].graphics.length).toBe(5);
			expect(g_editsStore.pendingEditsCount()).toBe(13);
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
	
	async.it("Delete new features", function(done)
	{
		expect(g_featureLayers[0].graphics.length).toBe(5);
		expect(g_offlineFeaturesManager.getOnlineStatus()).toBe(g_offlineFeaturesManager.OFFLINE);

		var deletes = [g5];
		g_featureLayers[0].applyEdits(null,null,deletes,function(addResults,updateResults,deleteResults)
		{
			expect(deleteResults.length).toBe(1);
			expect(deleteResults[0].success).toBeTruthy();
			expect(g_featureLayers[0].graphics.length).toBe(4);
			expect(g_editsStore.pendingEditsCount()).toBe(14);
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

	async.it("Go Online", function(done)
	{
		console.log(g_featureLayers[0].graphics.map(function(g) { return [g.attributes.objectid, g.geometry.x, g.geometry.y];}));
		expect(g_featureLayers[0].graphics.length).toBe(4);

		g_offlineFeaturesManager.goOnline(function()
		{
			expect(g_offlineFeaturesManager.getOnlineStatus()).toBe(g_offlineFeaturesManager.ONLINE);
			expect(g_editsStore.pendingEditsCount()).toBe(0);
			console.log(g_featureLayers[0].graphics.map(function(g) { return [g.attributes.objectid, g.geometry.x, g.geometry.y];}));
			expect(g_featureLayers[0].graphics.length).toBe(4);
			countFeatures(g_featureLayers[0], function(success,result)
			{
				expect(success).toBeTruthy();
				expect(result.count).toBe(4);
				done();
			});
			done();
		});;
		expect(g_offlineFeaturesManager.getOnlineStatus()).toBe(g_offlineFeaturesManager.RECONNECTING);
	});
});
