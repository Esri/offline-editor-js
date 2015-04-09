"use strict";

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
    });

    describe("Pack/Unpack array of edits",function()
    {
        // TODO
    });
});

var async = new AsyncSpec(this);

describe("Public Interface", function()
{
    describe("Support detection", function() {
        it("detect IndexedDB support", function () {
            expect(g_editsStore.isSupported()).toBeTruthy();
        });
    });

    describe("Initialize database", function(){

        async.it("initialize database", function (done) {
            g_editsStore.init(function (success) {
                expect(success).toEqual(true);
                done();
            })
        });

        async.it("reset edits queue", function (done) {
            g_editsStore.resetEditsQueue(function (result) {
                expect(result).toEqual(true);

                g_editsStore.pendingEditsCount(function (count) {
                    expect(count).toBe(0);
                    done();
                });

            });
        });
    });

    describe("Edit queue management", function()
    {
        describe("Normal edits", function()
        {
            async.it("add edits to edits queue", function(done)
            {
                g_editsStore.pushEdit(g_editsStore.ADD, 6, g_test.pointFeature, function(result){
                    expect(result).toEqual(true);

                    g_editsStore.pendingEditsCount(function(count){
                        expect(count).toBe(1);
                        done();
                    });
                });
            });

            async.it("update edits to edits queue", function(done)
            {
                g_editsStore.pushEdit(g_editsStore.UPDATE, 3, g_test.polygonFeature, function(result){
                    expect(result).toEqual(true);

                    g_editsStore.pendingEditsCount(function(count){
                        expect(count).toBe(2);
                        done();
                    });
                });
            });

            async.it("delete edits to edits queue", function(done)
            {
                g_editsStore.pushEdit(g_editsStore.DELETE, 2, g_test.lineFeature, function(result){
                    expect(result).toEqual(true);

                    g_editsStore.pendingEditsCount(function(count){
                        expect(count).toBe(3);
                        done();
                    });
                });
            });

            async.it("update existing edit in the queue", function(done)
            {
                require(["esri/graphic"],function(Graphic){
                    g_test.lineFeature = new Graphic( g_test.line, g_test.lineSymbol, {"nombre": "America","objectid":5});
                    g_editsStore.updateExistingEdit(g_editsStore.DELETE,2, g_test.lineFeature, function(result){
                        expect(result).toEqual(true);

                        g_editsStore.pendingEditsCount(function(count){
                            expect(count).toBe(3);
                            done();
                        });
                    });
                });
            });

            async.it("check yes edit already exists", function(done)
            {
                var  id = 6 + "/" + g_test.pointFeature.attributes.objectid;

                g_editsStore.editExists(id).then(function(result){
                    console.log("RESULT does edit exist " + JSON.stringify(result));
                    expect(result.success).toBe(true);
                    done();
                },function(err){
                    expect(err.success).toBe(true);
                    done();
                })
            });

            async.it("check no edit does not exist", function(done)
            {

                var id = 62 + "/" + g_test.pointFeature.attributes.objectid;
                g_editsStore.editExists(id).then(function(result){
                    console.log("RESULT does edit exist " + JSON.stringify(result));
                    expect(result.success).toBe(false);
                    done();
                },function(err){
                    expect(err.success).toBe(false);
                    done();
                })
            });

            async.it("get all edits recursively", function(done)
            {
                g_editsStore.getAllEdits(function(value,message){
                    if(message ==="end")
                    {
                        expect(value).toBe(null);
                        done();
                    }
                    else{
                        console.log("VALUE: " + JSON.stringify(value));
                    }
                })
            });

            async.it("delete an non-existing record from the database", function(done){

                //Then let's delete that new entry
                g_editsStore.delete(21,g_test.pointFeature,function(result){
                    expect(result).toBe(false); console.log("LKJ:LKJ " + result)

                    g_editsStore.pendingEditsCount(function(counts){
                        expect(counts).toBe(3);
                        done();
                    });
                })
            });

            async.it("Add record then delete it from the database", function(done){

                //First we add a new entry
                g_editsStore.pushEdit(g_editsStore.ADD, 22, g_test.pointFeature, function(result){
                    expect(result).toEqual(true);

                    //Then let's delete that new entry
                    g_editsStore.delete(22,g_test.pointFeature,function(result){
                        expect(result).toBe(true);

                        g_editsStore.pendingEditsCount(function(counts){
                            expect(counts).toBe(3);
                            done();
                        });
                    })
                });

            });
        });

        describe("Database storage size", function()
        {
            async.it("get size", function(done){
                g_editsStore.getUsage(function(result,error){
                    console.log("RESULT IS " + result.sizeBytes);
                    expect(result).toEqual(jasmine.any(Object));
                    expect(result.sizeBytes).toEqual(1174);
                    expect(result.editCount).toEqual(3);
                    done();
                })
            })
        });

        describe("Handle Phantom Graphics", function(){
           async.it("add a phantom graphic", function(done){

               g_test.pointFeature2 = new esriGraphic( g_test.point, g_test.pointSymbol, {"name": "the name of the feature", "objectid":200});

               g_editsStore.pushPhantomGraphic(g_test.pointFeature2,function(success,err){
                   expect(success).toBe(true);
                   expect(err).toBe(null); console.log("ADD PHANTOM GRAPHIC 1: " + success)
                   done();
               });
           });

            async.it("add another phantom graphic", function(done){

                g_test.pointFeature3 = new esriGraphic( g_test.point, g_test.pointSymbol, {"name": "the name of the feature", "objectid":300});
                g_editsStore.pushPhantomGraphic(g_test.pointFeature3,function(success,err){
                    expect(success).toBe(true); console.log("ADD PHANTOM GRAPHIC 2: " + success)
                    expect(err).toBe(null);
                    done();
                });
            });

           async.it("get phantom graphics array", function(done){
               g_editsStore.getPhantomGraphicsArray(function(array,message){
                   expect(array.length).toBe(2);
                   expect(message).toBe("end");
                   expect(array[0].id).toBe("phantom-layer|@|200");
                   expect(array[0].graphic.attributes.name).toBe("the name of the feature");
                   expect(array[1].id).toBe("phantom-layer|@|300");
                   expect(array[1].graphic.attributes.name).toBe("the name of the feature");
                   done();
               });
           });

            async.it("get phantom graphics array simple", function(done){
               g_editsStore._getPhantomGraphicsArraySimple(function(array, message){ console.log("LENGHT!!!! " + array.length)
                   expect(array.length).toBe(2);
                   expect(message).toBe("end");
                   expect(array[0]).toBe("phantom-layer|@|200");
                   expect(array[1]).toBe("phantom-layer|@|300");
                   done();
               });
            });

            async.it("delete phantom graphic",function(done){
               g_editsStore.deletePhantomGraphic("phantom-layer|@|200",function(success){
                   expect(success).toBe(true)
                   g_editsStore._getPhantomGraphicsArraySimple(function(array,message){
                       expect(array.length).toBe(1);
                       expect(message).toBe("end");
                       expect(array[0]).toBe("phantom-layer|@|300");
                       done();
                   });
               }) ;
            });

            async.it("reset phantom graphics queue",function(done){
               g_editsStore.resetPhantomGraphicsQueue(function(success){
                   expect(success).toBe(true);
                   g_editsStore._getPhantomGraphicsArraySimple(function(array, message){
                       expect(array.length).toBe(0);
                       expect(message).toBe("end");
                       done();
                   });
               })
            });

            async.it("get size - should be the same", function(done){
                g_editsStore.getUsage(function(success){
                    expect(success).toEqual(jasmine.any(Object));
                    expect(success.sizeBytes).toEqual(1174);
                    expect(success.editCount).toEqual(3);
                    done();
                })
            });

            async.it("add back a new phantom graphic", function(done){

                g_test.pointFeature3 = new esriGraphic( g_test.point, g_test.pointSymbol, {"name": "the name of the feature", "objectId":621});
                g_editsStore.pushPhantomGraphic(g_test.pointFeature3,function(success,err){
                    expect(success).toBe(true);
                    expect(err).toBe(null);
                    done();
                });
            });

            async.it("add a second phantom graphic", function(done){

                g_test.pointFeature3 = new esriGraphic( g_test.point, g_test.pointSymbol, {"name": "the name of the feature", "objectId":622});
                g_editsStore.pushPhantomGraphic(g_test.pointFeature3,function(success,err){
                    expect(success).toBe(true);
                    expect(err).toBe(null);
                    done();
                });
            });

            async.it("delete only phantom graphics - test resetLimitedPhantomGraphicsQueue", function(done){
                var responseObject = {
                    "0":{"id":621,"tempId":[],"addResults":[],"updateResults":[],"deleteResults":[{"objectId":621,"success":true}]},
                    "1":{"id":622,"tempId":[],"addResults":[],"updateResults":[],"deleteResults":[{"objectId":622,"success":true}]}
                };

                g_editsStore.resetLimitedPhantomGraphicsQueue(responseObject,function(result){
                    expect(result).toBe(true);
                    done();
                })
            });

            // This will be 3 because we had 3 non-Phantom Graphics in the database :-)
            async.it("validate number of database entries", function(done){
                g_editsStore.getAllEditsArray(function(array,msg){
                    expect(array.length).toBe(3);
                    expect(msg).toBe("end");
                    done();
                })
            });

            // Size should still be the same as before we started playing with phantom graphics
            async.it("get size", function(done){
                g_editsStore.getUsage(function(result,error){
                    console.log("RESULT IS " + result.sizeBytes);
                    expect(result).toEqual(jasmine.any(Object));
                    expect(result.sizeBytes).toEqual(1549);
                    expect(result.editCount).toEqual(3);
                    done();
                })
            })

        });

        describe("Handle FeatureLayer Service Info in database", function(){

            async.it("set feature layer service info",function(done){
                var obj = {"something":0,"somethingElse":"helloworld"};
                g_editsStore.pushFeatureLayerJSON(obj,function(success,error){
                    expect(success).toBe(true);
                    expect(error).toBe(null);
                    done();
                })
            });

            async.it("get feature layer service info",function(done){
               g_editsStore.getFeatureLayerJSON(function(success,result){
                   expect(success).toBe(true);
                   expect(result).toEqual(jasmine.any(Object));
                   expect(result.id).toEqual(g_editsStore.FEATURE_LAYER_JSON_ID);
                   done();
               })
            });

            async.it("get size", function(done){
                g_editsStore.getUsage(function(success){
                    expect(success).toEqual(jasmine.any(Object));
                    expect(success.sizeBytes).toEqual(1626);
                    expect(success.editCount).toEqual(3);
                    done();
                })
            });

            async.it("delete feature layer service info", function(done){
                g_editsStore.deleteFeatureLayerJSON(function(success,message){
                    expect(success).toBe(true);
                    g_editsStore.getFeatureLayerJSON(function(success,result){
                        expect(success).toBe(false);
                        expect(result).toEqual("nothing found");
                        done();
                    })
                });
            });

            async.it("get size", function(done){
                g_editsStore.getUsage(function(success){
                    expect(success).toEqual(jasmine.any(Object));
                    expect(success.sizeBytes).toEqual(1549);
                    expect(success.editCount).toEqual(3);
                    done();
                })
            });
        });
    })
});

describe("Reset store", function()
{
    it("reset the store", function()
    {
        g_editsStore.resetEditsQueue(function(success){
            expect(success).toBe(true);
        });
    });
    it("size should be zero", function(){

        g_editsStore.getUsage(function(success){
            expect(success).toEqual(jasmine.any(Object));
            expect(success.sizeBytes).toEqual(0);
            expect(success.editCount).toEqual(0);
        });
    });
});

