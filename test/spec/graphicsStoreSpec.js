"use strict"

describe("Serialize/Deserialize Graphics", function()
{
	it("validate geometry objects", function()
	{
		// sanity checks on test data
		expect(typeof(g_test)).toBe("object");

		// geometry
		expect(typeof(g_test.point)).toBe("object");
		expect(g_test.point.declaredClass).toBe("esri.geometry.Point");
		expect(g_test.point.type).toBe("point");
		expect(g_test.point.spatialReference.wkid).toEqual(4326);

		expect(typeof(g_test.line)).toBe("object");
		expect(g_test.line.declaredClass).toBe("esri.geometry.Polyline");
		expect(g_test.line.type).toBe("polyline");
		expect(g_test.line.spatialReference.wkid).toEqual(4326);

		expect(typeof(g_test.polygon)).toBe("object");
		expect(g_test.polygon.declaredClass).toBe("esri.geometry.Polygon");
		expect(g_test.polygon.type).toBe("polygon");
		expect(g_test.polygon.spatialReference.wkid).toEqual(4326);

		// symbols
		expect(typeof(g_test.pointSymbol)).toBe("object");
		expect(g_test.pointSymbol.declaredClass).toBe("esri.symbol.SimpleMarkerSymbol");
		expect(g_test.pointSymbol.style).toBe("circle");

		// features
		expect(typeof(g_test.pointFeature)).toBe("object");
		expect(g_test.pointFeature.declaredClass).toBe("esri.Graphic");
		expect(g_test.pointFeature.geometry).toEqual(g_test.point);
		expect(g_test.pointFeature.symbol).toEqual(g_test.pointSymbol);
		expect(typeof(g_test.pointFeature.attributes)).toBe("object");		
	});

	var str;

	it("serialize graphic - point", function()
	{
		str = g_graphicsStore.serialize(g_test.pointFeature);
		expect(typeof(str)).toBe("string");
	});

	it("deserialize graphic - point", function()
	{
		var graphic = g_graphicsStore.deserialize(str);
		expect(graphic).toEqual(g_test.pointFeature);
	});
});