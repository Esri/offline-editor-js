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

	describe("Prepare Test", function()
	{
		async.it("prepare layer - delete all features", function(done)
		{
			clearFeatureLayer( g_featureLayers[3], function(success,response)
			{
				expect(success).toBeTruthy();
				var listener = g_featureLayers[3].on('update-end', function(){ listener.remove(); completedOne();})
				g_featureLayers[3].refresh();
				done();
			});
		});

		async.it("prepare attachment store - delete all local attachments", function(done)
		{
			expect(g_featureLayers[3].attachmentsStore).not.toBeUndefined();

			g_featureLayers[3].attachmentsStore.deleteAll(function(success)
			{
				expect(success).toBeTruthy();
				setTimeout(function()
				{
					g_featureLayers[3].attachmentsStore.getUsage(function(usage)
					{
						expect(usage.attachmentCount).toBe(0);
						done();
					})
				},1);
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
	});

	describe("Add and Query offline attachments", function()
	{		
		async.it("query attachment info - 1", function(done)
		{
			g_featureLayers[3].queryAttachmentInfos(g1_online.attributes.objectid, 
				function(attachmentsInfo)
				{
					expect(attachmentsInfo.length).toBe(0);
					done();
				},
				function(err)
				{
					expect(true).toBeFalsy();
					done();
				});
		});

		async.it("query attachment info - 2", function(done)
		{
			g_featureLayers[3].queryAttachmentInfos(g2_offline.attributes.objectid, 
				function(attachmentsInfo)
				{
					expect(attachmentsInfo.length).toBe(0);
					done();
				},
				function(err)
				{
					expect(true).toBeFalsy();
					done();
				});
		});

		async.it("add attachment to (online) feature", function(done)
		{
			expect(g_featureLayers[3].graphics.length).toBe(2);
			expect(g_featureLayers[3].attachmentsStore).not.toBeUndefined();

			expect(g1_online.attributes.objectid).toBeGreaterThan(0);

			g_featureLayers[3].addAttachment( g1_online.attributes.objectid, g_formNode, 
				function(result)
				{
					expect(result).not.toBeUndefined();
					expect(result.attachmentId).toBeLessThan(0);
					expect(result.objectId).toBe( g1_online.attributes.objectid );
					g_featureLayers[3].attachmentsStore.getUsage(function(usage)
					{
						expect(usage.attachmentCount).toBe(1);
						g_featureLayers[3].attachmentsStore.getAttachmentsByFeatureId(g_featureLayers[3].url, g1_online.attributes.objectid, function(attachments)
						{
							expect(attachments.length).toBe(1);
							console.log("attached file:", attachments[0]);
							done();
						});
					});
				},
				function(err)
				{
					expect(true).toBeFalsy();
					done();			
				});
		});

		async.it("add attachment to (offline) feature", function(done)
		{
			expect(g_featureLayers[3].graphics.length).toBe(2);
			expect(g_featureLayers[3].attachmentsStore).not.toBeUndefined();

			expect(g2_offline.attributes.objectid).toBeLessThan(0);

			g_featureLayers[3].addAttachment( g2_offline.attributes.objectid, g_formNode, 
				function(result)
				{
					console.log(result);
					expect(result).not.toBeUndefined();
					expect(result.attachmentId).toBeLessThan(0);
					expect(result.objectId).toBe( g2_offline.attributes.objectid );
					g_featureLayers[3].attachmentsStore.getUsage(function(usage)
					{
						expect(usage.attachmentCount).toBe(2);
						g_featureLayers[3].attachmentsStore.getAttachmentsByFeatureId(g_featureLayers[3].url, g2_offline.attributes.objectid, function(attachments)
						{
							expect(attachments.length).toBe(1);
							console.log("attached file:", attachments[0]);
							done();
						});
					});
				},
				function(err)
				{
					expect(true).toBeFalsy();
					done();			
				});
		});

		async.it("query attachment info - 1", function(done)
		{
			g_featureLayers[3].queryAttachmentInfos(g1_online.attributes.objectid, 
				function(attachmentsInfo)
				{
					expect(attachmentsInfo.length).toBe(1);
					expect(attachmentsInfo[0].objectId).toBe(g1_online.attributes.objectid);
					expect(attachmentsInfo[0].id).toBeLessThan(0);
					done();
				},
				function(err)
				{
					expect(true).toBeFalsy();
					done();
				});
		});

		async.it("query attachment info - 2", function(done)
		{
			g_featureLayers[3].queryAttachmentInfos(g2_offline.attributes.objectid, 
				function(attachmentsInfo)
				{
					expect(attachmentsInfo.length).toBe(1);
					expect(attachmentsInfo[0].objectId).toBe(g2_offline.attributes.objectid);
					expect(attachmentsInfo[0].id).toBeLessThan(0);
					done();
				},
				function(err)
				{
					expect(true).toBeFalsy();
					done();
				});
		});
	});

	describe("delete attachments", function()
	{
		/*
		async.it("delete attachment", function(done)
		{
			expect(false).toBeTruthy(); // not implemented
			done();
		});
		*/
	});

	describe("go Online and finish all", function()
	{
		async.it("go Online", function(done)
		{
			expect(g_featureLayers[3].graphics.length).toBe(2);

			var listener = jasmine.createSpy('event listener');
			g_offlineFeaturesManager.on(g_offlineFeaturesManager.events.ALL_EDITS_SENT, listener);

			g_offlineFeaturesManager.goOnline(function(success,responses)
			{
				console.log("went online");
				expect(g_offlineFeaturesManager.getOnlineStatus()).toBe(g_offlineFeaturesManager.ONLINE);
				expect(listener).toHaveBeenCalled();
				expect(success).toBeTruthy();
				expect(Object.keys(responses).length).toBe(1);
				expect(responses[g_featureLayers[3].url]).not.toBeUndefined();
				var results = responses[g_featureLayers[3].url];
				expect(results.addResults.length).toBe(1);
				expect(results.updateResults.length).toBe(0);
				expect(results.deleteResults.length).toBe(0);
				expect(results.addResults[0].success).toBeTruthy();
				g2_offline.attributes.objectid = results.addResults[0].objectId;

				expect(getObjectIds(g_featureLayers[3].graphics)).toEqual(getObjectIds([g1_online,g2_offline]));			
				expect(getObjectIds(g_featureLayers[3].graphics).filter(function(id){ return id<0; })).toEqual([]); //all of them are positive
				expect(g_featureLayers[3].graphics.length).toBe(2);
				countFeatures(g_featureLayers[3], function(success,result)
				{
					expect(success).toBeTruthy();
					expect(result.count).toBe(2);
			 		done();
			 	});
			});
			expect(g_offlineFeaturesManager.getOnlineStatus()).toBe(g_offlineFeaturesManager.RECONNECTING);
		});
			
		async.it("no edits pending", function(done)
		{
			expect(g_editsStore.pendingEditsCount()).toBe(0);
			done();
		});
		/*
		async.it("no attachments pending", function(done)
		{
			g_featureLayers[3].attachmentsStore.getUsage(function(usage)
			{
				expect(usage.attachmentCount).toBe(0);
				done();
			});
		});

		async.it("query attachments info - online - 1", function(done)
		{
			g_featureLayers[3].queryAttachmentInfos(g1_online.attributes.objectid, 
				function(attachmentsInfo)
				{
					expect(attachmentsInfo.length).toBe(1);
					expect(attachmentsInfo[0].objectId).toBe(g1_online.attributes.objectid);
					expect(attachmentsInfo[0].id).toBeLessThan(0);
					done();
				},
				function(err)
				{
					expect(true).toBeFalsy();
					done();
				});
		});

		async.it("query attachments info - online - 2", function(done)
		{
			g_featureLayers[3].queryAttachmentInfos(g2_offline.attributes.objectid, 
				function(attachmentsInfo)
				{
					expect(attachmentsInfo.length).toBe(1);
					expect(attachmentsInfo[0].objectId).toBe(g2_offline.attributes.objectid);
					expect(attachmentsInfo[0].id).toBeLessThan(0);
					done();
				},
				function(err)
				{
					expect(true).toBeFalsy();
					done();
				});
		});
		//*/
	})
});

