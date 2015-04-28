"use strict";

var testData = [
	[ "layer1", 1000, -1],
	[ "layer1", 1001, -1],
	[ "layer1", 1002, -2],
	[ "layer2", 1003,  1],
	[ "layer2", 1004,  1]
];

describe("attachments store module", function()
{
	var async = new AsyncSpec(this);

	async.it("open the db", function(done)
	{
		g_attachmentsStore.init(function(success)
		{
			expect(success).toBeTruthy();			
			done();
		});
	});

	async.it("delete all attachments", function(done)
	{
		g_attachmentsStore.deleteAll(function(success)
		{
			expect(success).toBeTruthy();
			setTimeout(function()
			{
				g_attachmentsStore.getUsage(function(usage)
				{
					expect(usage).not.toBeNull();
					expect(usage.attachmentCount).toBe(0);
					done();
				})
			},1);
		});
	});

	async.it("prepare attachment file", function(done)
	{
		var file = g_inputNode.files[0];
		testData.forEach(function(e)
		{
			e.push(file);
		});
		console.log("TEST DATA " + JSON.stringify(testData));
		done();
	});

	async.it("store one attachment", function(done)
	{
		g_attachmentsStore.store(testData[0][0],testData[0][1],testData[0][2],testData[0][3], "add",function(success)
		{
			expect(success).toBeTruthy();
			g_attachmentsStore.getUsage(function(usage)
			{
				expect(usage).not.toBeNull();
				expect(usage.attachmentCount).toBe(1);
				done();
			})
		});
	});

	async.it("fail to store attachment", function(done){

		var form = document.getElementById("theForm");

		g_attachmentsStore.store(testData[0][0],testData[0][1],testData[0][2],form,"add", function(success)
		{
			expect(success).toBe(false);
			g_attachmentsStore.getUsage(function(usage)
			{
				expect(usage).not.toBeNull();
				expect(usage.attachmentCount).toBe(1);
				done();
			})
		});
	});

	async.it("store more attachments", function(done)
	{
		var i=1, n=testData.length;

		var addAttachment = function(success)
		{
			i++;
			expect(success).toBeTruthy();
			g_attachmentsStore.getUsage(function(usage)
			{
				expect(usage).not.toBeNull();
				expect(usage.attachmentCount).toBe(i);
				if( i == n)
					done();
				else
					g_attachmentsStore.store(testData[i][0],testData[i][1],testData[i][2],testData[i][3],"add", addAttachment);
			})
		};
		g_attachmentsStore.store(testData[i][0],testData[i][1],testData[i][2],testData[i][3],"add", addAttachment);
	});

    async.it("Check usage", function(done){
        g_attachmentsStore.getUsage(function(usage)
        {
            expect(usage.sizeBytes).toBeGreaterThan(0);
            expect(usage.attachmentCount).toBe(5);
            done();
        })
    });

	async.it("query attachments of a feature", function(done)
	{
		g_attachmentsStore.getAttachmentsByFeatureId("layer1", 300, function(attachments)
		{
			expect(attachments.length).toBe(0);
			g_attachmentsStore.getAttachmentsByFeatureId("layer1", -1, function(attachments)
			{
				expect(attachments.length).toBe(2);
				expect(attachments[0].objectId).toBe(-1);
				expect(attachments[1].objectId).toBe(-1);
				//expect(attachments[0].url).toContain("blob:");
				//expect(attachments[1].url).toContain("blob:");
				g_attachmentsStore.getAttachmentsByFeatureId("layer1", -2, function(attachments)
				{
					expect(attachments.length).toBe(1);
					expect(attachments[0].objectId).toBe(-2);
					//expect(attachments[0].url).toContain("blob:");
					g_attachmentsStore.getAttachmentsByFeatureId("layer2", 1, function(attachments)
					{
						expect(attachments.length).toBe(2);
						expect(attachments[0].objectId).toBe(1);
						expect(attachments[1].objectId).toBe(1);
						//expect(attachments[0].url).toContain("blob:");
						//expect(attachments[1].url).toContain("blob:");
						done();
					});
				});
			});
		});
	});

	async.it("query attachments of a feature layer", function(done)
	{
		g_attachmentsStore.getAttachmentsByFeatureLayer("layer1", function(attachments)
		{
			expect(attachments.length).toBe(3);
			expect(attachments[0].featureId).toContain("layer1/");
			expect(attachments[1].featureId).toContain("layer1/");
			expect(attachments[2].featureId).toContain("layer1/");
			var attachmentIds = attachments.map(function(a){ return a.id; });
			expect(attachmentIds.sort()).toEqual([1000,1001,1002]);
			g_attachmentsStore.getAttachmentsByFeatureLayer("layer2", function(attachments)
			{
				expect(attachments.length).toBe(2);
				expect(attachments[0].featureId).toContain("layer2/");
				expect(attachments[1].featureId).toContain("layer2/");
				expect(attachments[0].id).toBe(1003);
				expect(attachments[1].id).toBe(1004);
				g_attachmentsStore.getAttachmentsByFeatureLayer("layer3", function(attachments)
				{
					expect(attachments.length).toBe(0);
					done();
				});
			});
		});
	});

	async.it("query all attachments", function(done)
	{
		g_attachmentsStore.getAllAttachments(function(attachments)
		{
			expect(attachments.length).toBe(5);
			var attachmentIds = attachments.map(function(a){ return a.id; }).sort();
			expect(attachmentIds.sort()).toEqual([1000,1001,1002,1003,1004]);
			done();
		});
	});

	async.it("replace feature id", function(done)
	{
		g_attachmentsStore.replaceFeatureId("layer1",-1,100, function(success)
		{
			expect(success).toBe(2);
			setTimeout(function()
			{				
				g_attachmentsStore.getAttachmentsByFeatureId("layer1", -1, function(attachments)
				{
					expect(attachments.length).toBe(0);
					g_attachmentsStore.getAttachmentsByFeatureId("layer1", 100, function(attachments)
					{
						expect(attachments.length).toBe(2);
						expect(attachments[0].objectId).toBe(100);
						expect(attachments[1].objectId).toBe(100);
						done();
					});
				});
			},1);	// setTimeout()
		});
	});

	async.it("delete one attachment", function(done)
	{
		g_attachmentsStore.getUsage(function(usage)
		{
			expect(usage).not.toBeNull();
			expect(usage.attachmentCount).toBe(testData.length);
			g_attachmentsStore.delete(1004, function(success)
			{
				expect(success).toBeTruthy();
				setTimeout(function()
				{
					g_attachmentsStore.getUsage(function(usage)
					{
						expect(usage).not.toBeNull();
						expect(usage.attachmentCount).toBe(testData.length-1);
						done();
					});
				});
			});
		});
	});

    async.it("Check usage", function(done){
        g_attachmentsStore.getUsage(function(usage)
        {
            expect(usage.sizeBytes).toBeGreaterThan(0);
            expect(usage.attachmentCount).toBe(4);
            done();
        })
    });

	async.it("delete attachments of a single feature", function(done)
	{
		g_attachmentsStore.deleteAttachmentsByFeatureId("layer1", 300, function(deletedCount)
		{
			expect(deletedCount).toBe(0);
			setTimeout(function()
			{
				g_attachmentsStore.getUsage(function(usage)
				{
					expect(usage).not.toBeNull();
					expect(usage.attachmentCount).toBe(testData.length-1);

					g_attachmentsStore.deleteAttachmentsByFeatureId("layer1", 100, function(deletedCount)
					{
						expect(deletedCount).toBe(2);
						setTimeout(function()
						{
							g_attachmentsStore.getUsage(function(usage)
							{
								expect(usage).not.toBeNull();
								expect(usage.attachmentCount).toBe(testData.length-3);
								done();
							})					
						});
					});
				});
			});
		});
	});

	async.it("delete all attachments", function(done)
	{
		g_attachmentsStore.deleteAll(function(success)
		{
			expect(success).toBeTruthy();
			setTimeout(function()
			{
				g_attachmentsStore.getUsage(function(usage)
				{
					expect(usage).not.toBeNull();
					expect(usage.attachmentCount).toBe(0);
					done();
				})
			},1);
		});
	});

    async.it("Check usage", function(done){
        g_attachmentsStore.getUsage(function(usage)
        {
            expect(usage.sizeBytes).toBe(0);
            expect(usage.attachmentCount).toBe(0);
            done();
        })
    });

});