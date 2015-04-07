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
	var g1_online,g2_offline,g3_offline;

	describe("Prepare Test", function()
	{
		async.it("delete all features", function(done)
		{
			clearFeatureLayer( g_featureLayers[3], function(success,response)
			{
				expect(success).toBeTruthy();
				var listener = g_featureLayers[3].on('update-end', function(){ listener.remove(); })
				g_featureLayers[3].refresh();
				done();
			});
		});

		async.it("delete all local attachments", function(done)
		{
			expect(g_offlineFeaturesManager.attachmentsStore).not.toBeUndefined();

			g_offlineFeaturesManager.attachmentsStore.deleteAll(function(success)
			{
				expect(success).toBeTruthy();
				setTimeout(function()
				{
					g_offlineFeaturesManager.attachmentsStore.getUsage(function(usage)
					{
						expect(usage.attachmentCount).toBe(0);
						done();
					});
				},1);
			});
		});

		async.it("add online feature", function(done)
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

		async.it("go offline", function(done)
		{
			expect(g_offlineFeaturesManager.getOnlineStatus()).toBe(g_offlineFeaturesManager.ONLINE);
			g_offlineFeaturesManager.goOffline();
			expect(g_offlineFeaturesManager.getOnlineStatus()).toBe(g_offlineFeaturesManager.OFFLINE);
			done();
		});

		async.it("add offline features", function(done)
		{
			expect(g_featureLayers[3].graphics.length).toBe(1);

			g2_offline = new g_modules.Graphic({
				"geometry": {
					"rings": [[[-518920,4967379],[-474892,4975940],[-439425,5015076],[-377053,5050543],[-290220,5049320],[-271876,5021191],[-417412,4975940],[-510359,4891554],[-670571,4862202],[-682801,4880547],[-665679,4916014],[-518920,4967379]]],
					"spatialReference":{"wkid":102100}
				},
				"attributes":{"ruleid": 3, "name": "Sistema Central"}
			});

			g3_offline = new g_modules.Graphic({
				"geometry":{
					"rings":[[[-275852.307236338,5103437.42576518],[-131539.197833964,5103437.42576518],[-131539.197833964,5003152.04465505],[-275852.307236338,5003152.04465505],[-275852.307236338,5103437.42576518]]],
					"spatialReference":{"wkid":102100}
				},
				"attributes":{"ruleid":2,"name":"to delete"}
			});

			var adds = [g2_offline, g3_offline];
			g_featureLayers[3].applyEdits(adds,null,null,function(addResults,updateResults,deleteResults)
			{
				expect(addResults.length).toBe(2);
				expect(addResults[0].success).toBeTruthy();
				expect(addResults[1].success).toBeTruthy();
				g2_offline.attributes.objectid = addResults[0].objectId;
				g3_offline.attributes.objectid = addResults[1].objectId;
				expect(getObjectIds(g_featureLayers[3].graphics)).toEqual(getObjectIds([g1_online,g2_offline,g3_offline]));
				expect(g_featureLayers[3].graphics.length).toBe(3);
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
			expect(g_featureLayers[3].graphics.length).toBe(3);
			expect(g_offlineFeaturesManager.attachmentsStore).not.toBeUndefined();

			expect(g1_online.attributes.objectid).toBeGreaterThan(0);

			g_featureLayers[3].addAttachment( g1_online.attributes.objectid, g_formNode, 
				function(result)
				{
					expect(result).not.toBeUndefined();
					expect(result.attachmentId).toBeLessThan(0);
					expect(result.objectId).toBe( g1_online.attributes.objectid );
					g_offlineFeaturesManager.attachmentsStore.getUsage(function(usage)
					{
						expect(usage.attachmentCount).toBe(1);
						g_offlineFeaturesManager.attachmentsStore.getAttachmentsByFeatureId(g_featureLayers[3].url, g1_online.attributes.objectid, function(attachments)
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
			expect(g_featureLayers[3].graphics.length).toBe(3);
			expect(g_offlineFeaturesManager.attachmentsStore).not.toBeUndefined();

			expect(g2_offline.attributes.objectid).toBeLessThan(0);

			g_featureLayers[3].addAttachment( g2_offline.attributes.objectid, g_formNode, 
				function(result)
				{
					console.log(result);
					expect(result).not.toBeUndefined();
					expect(result.attachmentId).toBeLessThan(0);
					expect(result.objectId).toBe( g2_offline.attributes.objectid );
					g_offlineFeaturesManager.attachmentsStore.getUsage(function(usage)
					{
						expect(usage.attachmentCount).toBe(2);
						g_offlineFeaturesManager.attachmentsStore.getAttachmentsByFeatureId(g_featureLayers[3].url, g2_offline.attributes.objectid, function(attachments)
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

		async.it("add attachment to (offline) feature (to be deleted)", function(done)
		{
			expect(g_featureLayers[3].graphics.length).toBe(3);
			expect(g_offlineFeaturesManager.attachmentsStore).not.toBeUndefined();

			expect(g3_offline.attributes.objectid).toBeLessThan(0);

			g_featureLayers[3].addAttachment( g3_offline.attributes.objectid, g_formNode, 
				function(result)
				{
					console.log(result);
					expect(result).not.toBeUndefined();
					expect(result.attachmentId).toBeLessThan(0);
					expect(result.objectId).toBe( g3_offline.attributes.objectid );
					g_offlineFeaturesManager.attachmentsStore.getUsage(function(usage)
					{
						expect(usage.attachmentCount).toBe(3);
						g_offlineFeaturesManager.attachmentsStore.getAttachmentsByFeatureId(g_featureLayers[3].url, g3_offline.attributes.objectid, function(attachments)
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

		async.it("query offline attachments of layer", function(done)
		{
			g_offlineFeaturesManager.attachmentsStore.getUsage(function(usage)
			{
				expect(usage.attachmentCount).toBe(3);

				g_offlineFeaturesManager.attachmentsStore.getAttachmentsByFeatureLayer(g_featureLayers[3].url, function(attachments)
				{
					expect(attachments.length).toBe(3);
					var objectIds = attachments.map(function(a){ return a.objectId; }).sort();
					expect(objectIds).toEqual([g1_online.attributes.objectid, g2_offline.attributes.objectid, g3_offline.attributes.objectid].sort());
					done();
				});
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

		async.it("query attachment info - inexistent", function(done)
		{
			var inexistentId = g2_offline.attributes.objectid+1;
			g_featureLayers[3].queryAttachmentInfos(inexistentId, 
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
	});

	describe("delete feature with attachments", function()
	{
		async.it("delete (offline) feature with attachments", function(done)
		{
			var deletes = [g3_offline];
			g_featureLayers[3].applyEdits(null,null,deletes,function(addResults,updateResults,deleteResults)
			{
				expect(deleteResults.length).toBe(1);
				expect(deleteResults[0].success).toBeTruthy();
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

	describe("delete attachments", function()
	{
		var attachmentId;

		async.it("add attachment", function(done)
		{
			expect(g_featureLayers[3].graphics.length).toBe(2);
			expect(g_offlineFeaturesManager.attachmentsStore).not.toBeUndefined();

			expect(g2_offline.attributes.objectid).toBeLessThan(0);

			g_featureLayers[3].addAttachment( g2_offline.attributes.objectid, g_formNode, 
				function(result)
				{
					attachmentId = result.attachmentId;

					console.log(result);
					expect(result).not.toBeUndefined();
					expect(result.attachmentId).toBeLessThan(0);
					expect(result.objectId).toBe( g2_offline.attributes.objectid );
					g_offlineFeaturesManager.attachmentsStore.getUsage(function(usage)
					{
						expect(usage.attachmentCount).toBe(3);
						g_offlineFeaturesManager.attachmentsStore.getAttachmentsByFeatureId(g_featureLayers[3].url, g2_offline.attributes.objectid, function(attachments)
						{
							expect(attachments.length).toBe(2);
							done();
						});
					});
				},
				function(err)
				{
					expect(true).toBeFalsy();
					done();			
				}
			);
		});

		async.it("delete attachment", function(done)
		{
			expect(g_featureLayers[3].graphics.length).toBe(2);
			expect(g_offlineFeaturesManager.attachmentsStore).not.toBeUndefined();

			g_featureLayers[3].deleteAttachments( g2_offline.attributes.objectid, [attachmentId],
				function(result)
				{
					console.log(result);
					expect(result).not.toBeUndefined();

					g_offlineFeaturesManager.attachmentsStore.getUsage(function(usage)
					{
						expect(usage.attachmentCount).toBe(2);
						g_offlineFeaturesManager.attachmentsStore.getAttachmentsByFeatureId(g_featureLayers[3].url, g2_offline.attributes.objectid, function(attachments)
						{
							expect(attachments.length).toBe(1);
							done();
						});
					});
				},
				function(err)
				{
					expect(true).toBeFalsy();
					done();			
				}
			);
		});
	});

	describe("go Online and finish all", function()
	{
		async.it("query offline attachments of layer", function(done)
		{
			g_offlineFeaturesManager.attachmentsStore.getAttachmentsByFeatureLayer(g_featureLayers[3].url, function(attachments)
			{
				expect(attachments.length).toBe(2);
				var objectIds = attachments.map(function(a){ return a.objectId; }).sort();
				expect(objectIds).toEqual([g1_online.attributes.objectid, g2_offline.attributes.objectid].sort());
				done();
			});
		});

		async.it("go Online", function(done)
		{
			expect(g_featureLayers[3].graphics.length).toBe(2);

			var listener = jasmine.createSpy('event listener');
			g_offlineFeaturesManager.on(g_offlineFeaturesManager.events.ALL_EDITS_SENT, listener);

			g_offlineFeaturesManager.goOnline(function(result)
			{
				console.log("went online");
				expect(g_offlineFeaturesManager.getOnlineStatus()).toBe(g_offlineFeaturesManager.ONLINE);
				expect(listener).toHaveBeenCalled();
				expect(result.features.success).toBeTruthy();
				expect(result.attachments.success).toBeTruthy();
				expect(Object.keys(result.features.responses).length).toBe(1);
				expect(Object.keys(result.attachments.responses).length).toBe(2);

				var attachmentResults = result.attachments.responses;
				expect(attachmentResults).not.toBeUndefined();
				expect(attachmentResults.length).toBe(2);
				expect(attachmentResults[0].addAttachmentResult).not.toBeUndefined();
				expect(attachmentResults[0].addAttachmentResult.success).toBeTruthy();
				expect(attachmentResults[1].addAttachmentResult).not.toBeUndefined();
				expect(attachmentResults[1].addAttachmentResult.success).toBeTruthy();

				expect(result.features.responses[0]).not.toBeUndefined();
				var featureResults = result.features.responses[0];
				expect(featureResults.addResults.length).toBe(1);
				expect(featureResults.updateResults.length).toBe(0);
				expect(featureResults.deleteResults.length).toBe(0);
				expect(featureResults.addResults[0].success).toBeTruthy();
				g2_offline.attributes.objectid = featureResults.addResults[0].objectId;

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
			
		it("no edits pending", function(done)
		{
			expect(g_featureLayers[3].pendingEditsCount(function(count){
				expect(count).toBe(0);
			}));
		});

		it("no attachments pending", function(done)
		{
			g_offlineFeaturesManager.attachmentsStore.getUsage(function(usage)
			{
				expect(usage.attachmentCount).toBe(0);
//				done();
			});
		});
		
		it("query attachments info - online - 1", function(done)
		{
			g_featureLayers[3].queryAttachmentInfos(g1_online.attributes.objectid, 
				function(attachmentsInfo)
				{
					expect(attachmentsInfo.length).toBe(1);
					expect(attachmentsInfo[0].objectId).toBe(g1_online.attributes.objectid);
					expect(attachmentsInfo[0].id).toBeGreaterThan(0);
//					done();
				},
				function(err)
				{
					expect(true).toBeFalsy();
//					done();
				});
		});

		it("query attachments info - online - 2", function(done)
		{
			g_featureLayers[3].queryAttachmentInfos(g2_offline.attributes.objectid, 
				function(attachmentsInfo)
				{
					expect(attachmentsInfo.length).toBe(1);
					expect(attachmentsInfo[0].objectId).toBe(g2_offline.attributes.objectid);
					expect(attachmentsInfo[0].id).toBeGreaterThan(0);
//					done();
				},
				function(err)
				{
					expect(true).toBeFalsy();
//					done();
				});
		});
	});
});

