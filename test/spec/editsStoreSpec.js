"use strict";

var KEY_PREFIX = "__LOCAL_STORAGE_TEST__";
var EDITS_QUEUE_KEY = "esriEditsQueue";
var REDO_STACK_KEY  = "esriRedoStack";

var EXECUTE_LONG_TESTS = true;

describe("Internal Methods", function()
{
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
				str = g_editsStore._serialize(g_test.pointFeature);
				expect(typeof(str)).toBe("string");
			});

			it("deserialize", function()
			{
				graphic = g_editsStore._deserialize(str);
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
				str = g_editsStore._serialize(g_test.lineFeature);
				expect(typeof(str)).toBe("string");
			});

			it("deserialize", function()
			{
				graphic = g_editsStore._deserialize(str);
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
				str = g_editsStore._serialize(g_test.polygonFeature);
				expect(typeof(str)).toBe("string");
			});

			it("deserialize", function()
			{
				graphic = g_editsStore._deserialize(str);
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

	describe("Pack/Unpack array of edits",function()
	{
		// TODO
	});
});

describe("Public Interface", function()
{
	describe("Support detection", function()
	{
		it("detect local storage support", function()
		{
			expect(g_editsStore.isSupported()).toBeTruthy();
		})
	});
	
	describe("Edit queue management", function()
	{
		describe("Normal edits", function()
		{
			it("reset edits queue", function()
			{
				for( var key in window.localStorage )
				{
					if( key.indexOf(KEY_PREFIX)==0 )
						window.localStorage.removeItem(key);
				}

				g_editsStore.resetEditsQueue();
				expect(g_editsStore.pendingEditsCount()).toBe(0);
			});

			it("add edits to edits queue", function()
			{
				var result;
				result = g_editsStore.pushEdit(g_editsStore.ADD, 6, g_test.pointFeature);
				expect(result.success).toBeTruthy();
				expect(g_editsStore.pendingEditsCount()).toBe(1);
				result = g_editsStore.pushEdit(g_editsStore.UPDATE, 3, g_test.polygonFeature);
				expect(result.success).toBeTruthy();
				expect(g_editsStore.pendingEditsCount()).toBe(2);
				result = g_editsStore.pushEdit(g_editsStore.DELETE, 2, g_test.lineFeature);
				expect(result.success).toBeTruthy();
				expect(g_editsStore.pendingEditsCount()).toBe(3);
			});

			it("pending edits", function()
			{
				expect(g_editsStore.hasPendingEdits()).toBeTruthy();
			});

			it("pop edit from edits queue - 1", function()
			{
				var firstEdit = g_editsStore.popFirstEdit();
				expect(g_editsStore.pendingEditsCount()).toBe(2);
				expect(typeof(firstEdit)).toBe("object");
				expect(firstEdit.operation).toBe(g_editsStore.ADD);
				expect(firstEdit.layer).toBe(6);
				expect(firstEdit.graphic.attributes).toEqual(g_test.pointFeature.attributes);
				expect(firstEdit.graphic.geometry).toEqual(g_test.pointFeature.geometry);
				expect(firstEdit.graphic.symbol).toEqual(null);
			});

			it("pop edit from edits queue - 2", function()
			{
				var secondEdit = g_editsStore.popFirstEdit();
				expect(g_editsStore.pendingEditsCount()).toBe(1);
				expect(typeof(secondEdit)).toBe("object");
				expect(secondEdit.operation).toBe(g_editsStore.UPDATE);
				expect(secondEdit.layer).toBe(3);
				expect(secondEdit.graphic.attributes).toEqual(g_test.polygonFeature.attributes);
				expect(secondEdit.graphic.geometry).toEqual(g_test.polygonFeature.geometry);
				expect(secondEdit.graphic.symbol).toEqual(null);
			});

			it("pop edit from edits queue - 3", function()
			{
				var thirdEdit = g_editsStore.popFirstEdit();
				expect(g_editsStore.pendingEditsCount()).toBe(0);
				expect(typeof(thirdEdit)).toBe("object");
				expect(thirdEdit.operation).toBe(g_editsStore.DELETE);
				expect(thirdEdit.layer).toBe(2);
				expect(thirdEdit.graphic.attributes).toEqual(g_test.lineFeature.attributes);
				expect(thirdEdit.graphic.geometry).toEqual(g_test.lineFeature.geometry);
				expect(thirdEdit.graphic.symbol).toEqual(null);
			});

			it("pending edits", function()
			{
				expect(g_editsStore.hasPendingEdits()).toBeFalsy();
			});
		});

	});

	describe("Local Storage size", function()
	{
		var usedBytes, totalBytes;

		it("reset edits queue", function()
		{
			g_editsStore.resetEditsQueue();
			expect(g_editsStore.pendingEditsCount()).toBe(0);
		});

		it("add edits", function()
		{
			var result;
			result = g_editsStore.pushEdit(g_editsStore.ADD, 6, g_test.pointFeature);
			expect(g_editsStore.pendingEditsCount()).toBe(1);
			expect(result.success).toBeTruthy();
			expect(result.error).toBeUndefined();
			result = g_editsStore.pushEdit(g_editsStore.UPDATE, 3, g_test.polygonFeature);
			expect(result.success).toBeTruthy();
			expect(result.error).toBeUndefined();
			expect(g_editsStore.pendingEditsCount()).toBe(2);
		});

		it("report edit store size", function()
		{
			usedBytes = g_editsStore.getEditsStoreSizeBytes();
			expect(usedBytes).toBe(505);
		});

		it("report total local storage size", function()
		{
			totalBytes = g_editsStore.getLocalStorageSizeBytes();
			expect(usedBytes).not.toBeGreaterThan(totalBytes);
		});

		it("report edit store size when uninitalized", function()
		{
			window.localStorage.removeItem( EDITS_QUEUE_KEY );
			window.localStorage.removeItem( REDO_STACK_KEY );
			var usedBytes = g_editsStore.getEditsStoreSizeBytes();
			expect(usedBytes).toBe(0);
		});

		if( EXECUTE_LONG_TESTS )
		{
			it("exhaust localStorage capacity", function()
			{
				window.localStorage.clear();
                console.log("this will take some time");

				// clean everything before
				for( var key in window.localStorage )
				{
					if( key.indexOf(KEY_PREFIX)==0 )
						window.localStorage.removeItem(key);
				}

				var sizeBefore = g_editsStore.getLocalStorageSizeBytes();
				if( sizeBefore == 0)
				{
					// if not initialized, create the empty elements
					window.localStorage.setItem( EDITS_QUEUE_KEY, "");
					window.localStorage.setItem( REDO_STACK_KEY, "");
					sizeBefore = g_editsStore.getLocalStorageSizeBytes();
				}

				// first, fill localStorage up to max capacity
                var error = null;

				try
				{
					var index = 0;
					var value = "0123456789";
					var value8 = value + value + value + value + value + value + value + value;
					while(true)
					{
						var key = KEY_PREFIX + index;
						window.localStorage.setItem(key, value8 + value8 + value8 + value8);
						index += 1;

						if( index % 1000 == 0)
							console.log(index, g_editsStore.getLocalStorageSizeBytes());
					}				
				}
				catch(err)
				{
					console.log(err);
                    error = err;
				}

                expect(error).not.toBe(null);

				// now, try to push one edit
				var result = g_editsStore.pushEdit(g_editsStore.ADD, 20, g_test.polygonFeature);
				expect(result.success).toBeFalsy();
				expect(result.error.code).toEqual(1000);
				expect(result.error.description).toEqual(g_editsStore.ERROR_LOCALSTORAGE_FULL);

				// clean everything
				for( var key in window.localStorage )
				{
					if( key.indexOf(KEY_PREFIX)==0 )
						window.localStorage.removeItem(key);
				}

				var sizeAfter = g_editsStore.getLocalStorageSizeBytes();
				expect(sizeBefore).toEqual(sizeAfter);				
			});	
		}
		else
		{
			it("exhaust localStorage capacity - LONG TEST NOT EXECUTED", function()
			{				
			});
		}
	})
});

describe("Reset store", function()
{
	it("reset the store", function()
	{
		g_editsStore.resetEditsQueue();
	})
});
