"use strict"

describe("offline enabler library", function()
{
	var async = new AsyncSpec(this);

    async.it("validate map", function(done)
    {
        expect(g_map).toEqual(jasmine.any(Object));
        expect(g_map.id).toEqual("map");
        done();
    });

    async.it("validate tiled layer", function(done)
    {
        expect(g_basemapLayer).toEqual(jasmine.any(Object));
        expect(g_basemapLayer.tileInfo).toEqual(jasmine.any(Object));
        done();
    });

	async.it("extends the tiled layer object", function(done)
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

			g_basemapLayer.offline.proxyPath = "../lib/proxy.php";
	        done();
		});
	});

	async.it("can go offline", function(done)
	{
		expect(g_basemapLayer.goOffline).toEqual(jasmine.any(Function));
		expect(g_basemapLayer.offline.online).toEqual(true);
		g_basemapLayer.goOffline();
		expect(g_basemapLayer.offline.online).toEqual(false);
        done();
	});

	async.it("can go online", function(done)
	{
		expect(g_basemapLayer.goOffline).toEqual(jasmine.any(Function));
		expect(g_basemapLayer.offline.online).toEqual(false);
		g_basemapLayer.goOnline();
		expect(g_basemapLayer.offline.online).toEqual(true);
        done();
	})

	async.it("delete all tiles", function(done)
	{
		g_basemapLayer.deleteAllTiles(function(success)
		{
			expect(success).toEqual(true);
			setTimeout(function()
			{
				g_basemapLayer.getOfflineUsage(function(usage)
				{
					expect(usage.tileCount).toEqual(0);
			        done();
				});				
			},1);
		});
	});

	async.it("stores one tile", function(done)
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
			        done();
				});
			});
		});
	});

	async.it("gets level estimation", function(done)
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
	        done();
		});
	});

	async.it("prepares the layer for offline usage", function(done)
	{
		require(["esri/geometry/Extent"], function(Extent)
		{			
			g_basemapLayer.deleteAllTiles(function(success)
			{
				expect(success).toEqual(true);
				var extent = new Extent({"xmin":-822542.2830377579,"ymin":4580841.761960262,"xmax":94702.05638410954,"ymax":5131188.365613382,"spatialReference":{"wkid":102100}});
				var callCount = 0;
				var reportProgress = function(progress)
				{
					callCount += 1;
					expect(progress.error).not.toBeDefined();

					if( progress.finishedDownloading )
					{
						g_basemapLayer.getOfflineUsage(function(usage)
						{
							expect(usage.tileCount).toEqual(28);
							expect(callCount).toEqual(29);
					        done();
						});
					}

					return false; // cancelRequested = false;
				}

				g_basemapLayer.prepareForOffline(8,8,extent,reportProgress);
			});
		});
	});

	async.it("returns placeholder urls when offline", function(done)
	{
		require(["dojo/dom"], function(dom)
		{
			var fakeTile = dom.byId('fakeTile');

			g_basemapLayer.goOnline();
			var onlineUrl = g_basemapLayer.getTileUrl(14,6178,8023);
			expect(onlineUrl).toEqual('http://services.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/14/6178/8023');
			
			g_basemapLayer.goOffline();
			var offlineUrl = fakeTile.src = g_basemapLayer.getTileUrl(14,6178,8023);
			expect(offlineUrl).toEqual('void:14-6178-8023');
			done();
		})
	});

});