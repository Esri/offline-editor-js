"use strict"

describe("Serialize/Deserialize Graphics", function()
{
	describe("Sanity Check", function()
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
		});

		it("validate symbols", function()
		{
			// symbols
			expect(typeof(g_test.pointSymbol)).toBe("object");
			expect(g_test.pointSymbol.declaredClass).toBe("esri.symbol.SimpleMarkerSymbol");
			expect(g_test.pointSymbol.style).toBe("circle");

			expect(typeof(g_test.lineSymbol)).toBe("object");
			expect(g_test.lineSymbol.declaredClass).toBe("esri.symbol.SimpleLineSymbol");
			expect(g_test.lineSymbol.style).toBe("dot");

			expect(typeof(g_test.polygonSymbol)).toBe("object");
			expect(g_test.polygonSymbol.declaredClass).toBe("esri.symbol.SimpleFillSymbol");
			expect(g_test.polygonSymbol.style).toBe("solid");
		});

		it("validate features", function()
		{
			// features
			expect(typeof(g_test.pointFeature)).toBe("object");
			expect(g_test.pointFeature.declaredClass).toBe("esri.Graphic");
			expect(g_test.pointFeature.geometry).toEqual(g_test.point);
			expect(g_test.pointFeature.symbol).toEqual(g_test.pointSymbol);
			expect(typeof(g_test.pointFeature.attributes)).toBe("object");		

			expect(typeof(g_test.lineFeature)).toBe("object");
			expect(g_test.lineFeature.declaredClass).toBe("esri.Graphic");
			expect(g_test.lineFeature.geometry).toEqual(g_test.line);
			expect(g_test.lineFeature.symbol).toEqual(g_test.lineSymbol);
			expect(typeof(g_test.lineFeature.attributes)).toBe("object");		

			expect(typeof(g_test.polygonFeature)).toBe("object");
			expect(g_test.polygonFeature.declaredClass).toBe("esri.Graphic");
			expect(g_test.polygonFeature.geometry).toEqual(g_test.polygon);
			expect(g_test.polygonFeature.symbol).toEqual(g_test.polygonSymbol);
			expect(typeof(g_test.polygonFeature.attributes)).toBe("object");		
		});			
	});

	describe("Serialize/Deserialize Point", function()
	{
		var str, graphic;

		it("serialize", function()
		{
			str = g_graphicsStore.serialize(g_test.pointFeature);
			expect(typeof(str)).toBe("string");
		});

		it("deserialize", function()
		{
			graphic = g_graphicsStore.deserialize(str);
			expect(typeof(graphic)).toBe("object");
			expect(graphic.declaredClass).toEqual("esri.Graphic");
		});

		it("deserialize - attributes", function()
		{
			expect(graphic.attributes).toEqual(g_test.pointFeature.attributes);
		});

		it("deserialize - geometry", function()
		{
			expect(graphic.geometry).toEqual(g_test.pointFeature.geometry);
		});

		it("deserialize - symbol should be null", function()
		{
			expect(graphic.symbol).toBeNull();
		});

		it("deserialize - infoTemplate should be null", function()
		{
			expect(graphic.infoTemplate).toBeNull();
		});
	});

	describe("Serialize/Deserialize Polyline", function()
	{
		var str, graphic;

		it("serialize", function()
		{
			str = g_graphicsStore.serialize(g_test.lineFeature);
			expect(typeof(str)).toBe("string");
		});

		it("deserialize", function()
		{
			graphic = g_graphicsStore.deserialize(str);
			expect(typeof(graphic)).toBe("object");
			expect(graphic.declaredClass).toEqual("esri.Graphic");
		});

		it("deserialize - attributes", function()
		{
			expect(graphic.attributes).toEqual(g_test.lineFeature.attributes);
		});

		it("deserialize - geometry", function()
		{
			expect(graphic.geometry).toEqual(g_test.lineFeature.geometry);
		});

		it("deserialize - symbol should be null", function()
		{
			expect(graphic.symbol).toBeNull();
		});

		it("deserialize - infoTemplate should be null", function()
		{
			expect(graphic.infoTemplate).toBeNull();
		});
	});

	describe("Serialize/Deserialize Polygon", function()
	{
		var str, graphic;

		it("serialize", function()
		{
			str = g_graphicsStore.serialize(g_test.polygonFeature);
			expect(typeof(str)).toBe("string");
		});

		it("deserialize", function()
		{
			graphic = g_graphicsStore.deserialize(str);
			expect(typeof(graphic)).toBe("object");
			expect(graphic.declaredClass).toEqual("esri.Graphic");
		});

		it("deserialize - attributes", function()
		{
			expect(graphic.attributes).toEqual(g_test.polygonFeature.attributes);
		});

		it("deserialize - geometry", function()
		{
			expect(graphic.geometry).toEqual(g_test.polygonFeature.geometry);
		});

		it("deserialize - symbol should be null", function()
		{
			expect(graphic.symbol).toBeNull();
		});

		it("deserialize - infoTemplate should be null", function()
		{
			expect(graphic.infoTemplate).toBeNull();
		});
	});
});

describe("Edit queue management", function()
{
	it("Reset edits queue", function()
	{
		g_graphicsStore.resetEditsQueue();
		expect(g_graphicsStore.pendingEditsCount()).toBe(0);
	});

	it("Add edits to edits queue", function()
	{
		g_graphicsStore.appendEdit(g_graphicsStore.ADD, 6, g_test.pointFeature);
		expect(g_graphicsStore.pendingEditsCount()).toBe(1);
	});

	it("Pops edit from edits queue", function()
	{
		g_graphicsStore.pop
	});

	it("Undo/Redo management", function()
	{

	});
});