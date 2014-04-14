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

/* move into separate test suite, so that we can have an <input> to use during tests */
describe("Attachments", function()
{
	var g1_online,g2_offline;

	async.it("prepare layer - delete", function(done)
	{
		clearFeatureLayer( g_featureLayers[3], function(success,response)
		{
			expect(success).toBeTruthy();
			var listener = g_featureLayers[3].on('update-end', function(){ listener.remove(); completedOne();})
			g_featureLayers[3].refresh();
			done();
		});
	});

	async.it("prepare layer - add online feature", function(done)
	{
		expect(g_featureLayers[3].graphics.length).toBe(0);

		g1_online = new g_modules.Graphic({
			"geometry": {"rings": [[[-109922,5108923],[-94801,5119577],[-86348,5107580],[-101470,5096926],[-109922,5108923]]],"spatialReference":{"wkid":102100}},
			"attributes":{"ruleid": 2, "name": "Zaragoza"}
		});

		var adds = [g1_online];
		g_featureLayers[3].applyEdits(adds,null,null,function(addResults,updateResults,deleteResults)
		{
			expect(addResults.length).toBe(1);
			expect(addResults[0].success).toBeTruthy();
			g1_online.attributes.objectid = addResults[0].objectId;
			expect(getObjectIds(g_featureLayers[3].graphics)).toEqual(getObjectIds([g1_online]));
			expect(g_featureLayers[3].graphics.length).toBe(1);
			done();
		},
		function(error)
		{
			expect(true).toBeFalsy();
			done();			
		});
	});

	async.it("go Offline", function(done)
	{
		expect(g_offlineFeaturesManager.getOnlineStatus()).toBe(g_offlineFeaturesManager.ONLINE);
		g_offlineFeaturesManager.goOffline();
		expect(g_offlineFeaturesManager.getOnlineStatus()).toBe(g_offlineFeaturesManager.OFFLINE);
		done();
	});

	async.it("prepare layer - add offline feature", function(done)
	{
		expect(g_featureLayers[3].graphics.length).toBe(1);

		g2_offline = new g_modules.Graphic({
			"geometry": {
				"rings": [[[-518920,4967379],[-474892,4975940],[-439425,5015076],[-377053,5050543],[-290220,5049320],[-271876,5021191],[-417412,4975940],[-510359,4891554],[-670571,4862202],[-682801,4880547],[-665679,4916014],[-518920,4967379]]],
				"spatialReference":{"wkid":102100}
			},
			"attributes":{"ruleid": 3, "name": "Sistema Central"}
		});

		var adds = [g2_offline];
		g_featureLayers[3].applyEdits(adds,null,null,function(addResults,updateResults,deleteResults)
		{
			expect(addResults.length).toBe(1);
			expect(addResults[0].success).toBeTruthy();
			g2_offline.attributes.objectid = addResults[0].objectId;
			expect(getObjectIds(g_featureLayers[3].graphics)).toEqual(getObjectIds([g1_online,g2_offline]));
			expect(g_featureLayers[3].graphics.length).toBe(2);
			done();
		},
		function(error)
		{
			expect(true).toBeFalsy();
			done();			
		});
	});


	async.it("add attachment to (online) feature", function(done)
	{
		expect(g_featureLayers[3].graphics.length).toBe(2);

		expect(false).toBeTruthy(); // not implemented
		done();
	});

	async.it("add attachment to (offline) feature", function(done)
	{
		expect(false).toBeTruthy(); // not implemented
		done();
	});

	/*

	async.it("query attachment info", function(done)
	{
		expect(false).toBeTruthy(); // not implemented
		done();
	});

	async.it("delete attachment", function(done)
	{
		expect(false).toBeTruthy(); // not implemented
		done();
	});

	*/

	async.it("go Online", function(done)
	{
		// expect(g_featureLayers[0].graphics.length).toBe(4);
		// expect(g_featureLayers[1].graphics.length).toBe(3);

		var listener = jasmine.createSpy('event listener');
		g_offlineFeaturesManager.on(g_offlineFeaturesManager.events.ALL_EDITS_SENT, listener);

		g_offlineFeaturesManager.goOnline(function(success,responses)
		{
			console.log("went online");
			expect(g_offlineFeaturesManager.getOnlineStatus()).toBe(g_offlineFeaturesManager.ONLINE);
			expect(listener).toHaveBeenCalled();
			expect(success).toBeTruthy();
			expect(Object.keys(responses).length).toBe(0);
			expect(g_editsStore.pendingEditsCount()).toBe(0);
			// how to get the final id of g4 and g6 ?
			//expect(getObjectIds(g_featureLayers[0].graphics)).toEqual(getObjectIds([g1_online,g2_offline,g4,g6]));
			// all of them are positive
			// expect(getObjectIds(g_featureLayers[0].graphics).filter(function(id){ return id<0; })).toEqual([]);
			// expect(getObjectIds(g_featureLayers[1].graphics).filter(function(id){ return id<0; })).toEqual([]);
			// expect(g_featureLayers[0].graphics.length).toBe(4);
			// expect(g_featureLayers[1].graphics.length).toBe(3);
			// countFeatures(g_featureLayers[0], function(success,result)
			// {
			// 	expect(success).toBeTruthy();
			// 	expect(result.count).toBe(4);
			// 	countFeatures(g_featureLayers[1], function(success,result)
			// 	{
			// 		expect(success).toBeTruthy();
			// 		expect(result.count).toBe(3);
			// 		done();
			// 	});
			// });
			done();
		});
		expect(g_offlineFeaturesManager.getOnlineStatus()).toBe(g_offlineFeaturesManager.ONLINE);
	});
});

