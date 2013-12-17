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

		expect(g_basemapLayer.goOffline).toEqual(jasmine.any(Function));
		expect(g_basemapLayer.offline.online).toEqual(true);
		g_basemapLayer.goOffline();
		expect(g_basemapLayer.offline.online).toEqual(false);
	});

	it("can go online", function()
	{
		waitsFor(function(){ return initCompleted; });

		expect(g_basemapLayer.goOffline).toEqual(jasmine.any(Function));
		expect(g_basemapLayer.offline.online).toEqual(false);
		g_basemapLayer.goOnline();
		expect(g_basemapLayer.offline.online).toEqual(true);
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
	});

	
});