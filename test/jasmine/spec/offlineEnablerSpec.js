"use strict"

describe("offline enabler library", function()
{
	var initCompleted = false;

    it("validate map", function()
    {
        expect(g_map).toEqual(jasmine.any(Object));
        expect(g_map.id).toEqual("map");
    });

    it("validate tiled layer", function()
    {
        expect(g_basemapLayer).toEqual(jasmine.any(Object));
        expect(g_basemapLayer.tileInfo).toEqual(jasmine.any(Object));
    });

	it("extends the tiled layer object", function()
	{
		expect(g_basemapLayer.goOffline).toBeUndefined();
		g_offlineEnabler.extend(g_basemapLayer,function(success)
		{
			expect(success).toEqual(true);
			expect(g_basemapLayer.goOffline).toEqual(jasmine.any(Function));
			expect(g_basemapLayer.goOnline).toEqual(jasmine.any(Function));
			expect(g_basemapLayer.getTileUrl).toEqual(jasmine.any(Function));
			expect(g_basemapLayer._getTileUrl).toEqual(jasmine.any(Function));
			expect(g_basemapLayer.prepareForOffline).toEqual(jasmine.any(Function));
			expect(g_basemapLayer.storeTile).toEqual(jasmine.any(Function));
			expect(g_basemapLayer.deleteAllTiles).toEqual(jasmine.any(Function));
			expect(g_basemapLayer.offline).toEqual(jasmine.any(Object));
			expect(g_basemapLayer.offline.store).toEqual(jasmine.any(Object));

			g_basemapLayer.offline.proxyPath = "../../tiles/proxy.php";
			initCompleted = true;
		});
	});

	it("can go offline", function()
	{
		waitsFor(function(){ return initCompleted; });

		runs(function()
		{
			expect(g_basemapLayer.goOffline).toEqual(jasmine.any(Function));
			expect(g_basemapLayer.offline.online).toEqual(true);
			g_basemapLayer.goOffline();
			expect(g_basemapLayer.offline.online).toEqual(false);
		});
	});

	it("can go online", function()
	{
		waitsFor(function(){ return initCompleted; });

		runs(function()
		{
			expect(g_basemapLayer.goOffline).toEqual(jasmine.any(Function));
			expect(g_basemapLayer.offline.online).toEqual(false);
			g_basemapLayer.goOnline();
			expect(g_basemapLayer.offline.online).toEqual(true);
		});
	})

	it("delete all tiles", function()
	{
		waitsFor(function(){ return initCompleted; });

		runs(function()
		{
			g_basemapLayer.deleteAllTiles(function(success)
			{
				expect(success).toEqual(true);
				g_basemapLayer.getOfflineUsage(function(usage)
				{
					expect(usage.tileCount).toEqual(0);
				});
			});
		});
	});

	it("stores one tile", function()
	{
		waitsFor(function(){ return initCompleted; });

		runs(function()
		{		
			g_basemapLayer.getOfflineUsage(function(usage)
			{
				expect(usage.tileCount).toEqual(0);
				g_basemapLayer.storeTile(14,6177,8023, function(success)
				{
					expect(success).toEqual(true);
					g_basemapLayer.getOfflineUsage(function(usage)
					{
						expect(usage.tileCount).toEqual(1);
					});
				});
			});
		})
	});

	it("gets level estimation", function()
	{
		waitsFor(function(){ return initCompleted; });

		runs(function()
		{
			require(["esri/geometry/Extent"],function(Extent)
			{			
				var extent = new Extent({"xmin":-822542.2830377579,"ymin":4580841.761960262,"xmax":94702.05638410954,"ymax":5131188.365613382,"spatialReference":{"wkid":102100}});
				var tileSize = g_basemapLayer.estimateTileSize();
				var estimation = g_basemapLayer.getLevelEstimation(extent,10);
				expect(estimation.tileCount).toEqual(375);
				expect(estimation.sizeBytes).toEqual(estimation.tileCount * tileSize);
				var estimation = g_basemapLayer.getLevelEstimation(extent,8);
				expect(estimation.tileCount).toEqual(28);
				expect(estimation.sizeBytes).toEqual(estimation.tileCount * tileSize);
				var estimation = g_basemapLayer.getLevelEstimation(extent,2);
				expect(estimation.tileCount).toEqual(2);
				expect(estimation.sizeBytes).toEqual(estimation.tileCount * tileSize);				
			});
		});
	});

	/*
	it("prepares the layer for offline usage", function()
	{
		var finished = false;

		runs(function()
		{
			require(["esri/geometry/Extent"], function(Extent)
			{			
				g_basemapLayer.deleteAllTiles(function(success)
				{
					var extent = new Extent({"xmin":-822542.2830377579,"ymin":4580841.761960262,"xmax":94702.05638410954,"ymax":5131188.365613382,"spatialReference":{"wkid":102100}});
					var reportProgress = jasmine.createSpy();
					var finishedDownloading = function(err)
					{
						console.log("finishedDownloading");
						expect(err).not.toBeTruthy();
						expect(reportProgress).toHaveBeenCalled();
						expect(reportProgress.callCount).toEqual(21); // 28

						g_basemapLayer.getOfflineUsage(function(usage)
						{
							expect(usage.tileCount).toEqual(28);
							finished = true;
						});
					}

					console.log("preparing");
					g_basemapLayer.prepareForOffline(8,8,extent,reportProgress, finishedDownloading);
					console.log("prepared");
				});
			});
		});

		waitsFor(function(){ return finished; });
	});
	*/
});