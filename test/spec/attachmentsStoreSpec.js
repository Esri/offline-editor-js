"use strict";

var testData = [
	[ 1000, 1, { name: "attachment1000.txt", type: "text", size: "43", content: "content of the file of attachment 1000 for feature 1", url:""}],
	[ 1001, 1, { name: "attachment1001.txt", type: "text", size: "43", content: "content of the file of attachment 1001 for feature 1", url:""}],
	[ 1002, 2, { name: "attachment1002.txt", type: "text", size: "43", content: "content of the file of attachment 1002 for feature 2", url:""}],
	[ 1003, 3, { name: "attachment1003.txt", type: "text", size: "43", content: "content of the file of attachment 1003 for feature 3", url:""}]
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
					expect(usage.sizeBytes).toBe(0);
					expect(usage.attachmentCount).toBe(0);
					done();
				})
			},1);
		});
	});

	async.it("store one attachment", function(done)
	{
		g_attachmentsStore.store(testData[0][0],testData[0][1],testData[0][2], function(success)
		{
			expect(success).toBeTruthy();
			g_attachmentsStore.getUsage(function(usage)
			{
				expect(usage).not.toBeNull();
				expect(usage.sizeBytes).toBe(159);
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
				expect(usage.sizeBytes).toBe(159 * i);
				expect(usage.attachmentCount).toBe(i);
				if( i == n)
					done();
				else
					g_attachmentsStore.store(testData[i][0],testData[i][1],testData[i][2], addAttachment);
			})
		};
		g_attachmentsStore.store(testData[i][0],testData[i][1],testData[i][2], addAttachment);
	});

	async.it("query attachments of a feature", function(done)
	{
		g_attachmentsStore.getAttachmentsByFeatureId(300, function(attachments)
		{
			expect(attachments.length).toBe(0);
			g_attachmentsStore.getAttachmentsByFeatureId(1, function(attachments)
			{
				expect(attachments.length).toBe(2);
				expect(attachments[0].objectId).toBe(1);
				expect(attachments[1].objectId).toBe(1);
				expect(attachments[0].content).toContain("feature 1");
				expect(attachments[1].content).toContain("feature 1");
				g_attachmentsStore.getAttachmentsByFeatureId(2, function(attachments)
				{
					expect(attachments.length).toBe(1);
					expect(attachments[0].objectId).toBe(2);
					expect(attachments[0].content).toContain("feature 2");
					done();
				});
			});
		});
	});

});