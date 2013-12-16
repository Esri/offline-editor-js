"use strict"

describe("offline enabler library", function()
{
    it("validate map", function()
    {
        expect(g_map.id).toEqual("map");
        expect(g_map).toEqual(jasmine.any(Object));
    });

	it("extends the tiled layer object", function()
	{
		expect(g_basemapLayer.goOffline).toBeUndefined();
		g_offlineEnabler.extend(g_basemapLayer);
		expect(g_basemapLayer.goOffline).not.toBeUndefined();
	});

	it("can go offline", function()
	{
		
	});

	it("delete all tiles", function()
	{

	});
});