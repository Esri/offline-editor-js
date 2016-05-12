"use strict";

/*
 * helper functions
 */

function clearFeatureLayer(featureLayer, cb)
{
    g_modules.esriRequest({
        url: featureLayer.url + "/deleteFeatures",
        content: { f: 'json', where: '1=1'},
        handleAs: 'json'
    },{usePost:true}).then( function(response)
        {
            cb && cb(true,response);
        },
        function(error)
        {
            cb && cb(false,error);
        });
}

function countFeatures(featureLayer, cb)
{
    g_modules.esriRequest({
        url: featureLayer.url + "/query",
        content: { f: 'json', where: '1=1', returnCountOnly:true},
        handleAs: 'json'
    },{usePost:true}).then( function(response)
        {
            cb && cb(true,response);
        },
        function(error)
        {
            cb && cb(false,error);
        });
}

function getObjectIds(graphics)
{
    return graphics.map( function(g) { return g.attributes[g_offlineEdit.DB_UID]; });
}

/*
 * tests begin here
 */
var async = new AsyncSpec(this);

describe("Normal online editing - Exercise the feature services", function()
{
    var g1,g2,g3;

    describe("Original applyEdits method", function()
    {
        async.it("clears the feature layers", function(done)
        {
            var count = 0;
            function completedOne()
            {
                count += 1;
                if(count==g_layersIds.length){
                    console.log("Before running tests graphic count: " + g_featureLayers[0].graphics.length);
                    done();
                }

            }

            // Run clear twice because of current bug in ArcGIS Online related to clearing feature services with attachments.
            clearFeatureLayer(g_featureLayers[0], function(success){
                clearFeatureLayer( g_featureLayers[0], function(success,response)
                {
                    expect(success).toBeTruthy();
                    var listener = g_featureLayers[0].on('update-end', function(){ listener.remove(); completedOne();})
                    g_featureLayers[0].refresh();
                });
            });
        });

        async.it("add test features", function(done)
        {
            expect(g_featureLayers[0].graphics.length).toBe(0);
            expect(g_featureLayers[0]._nextTempId).toBe(-1);

            g1 = new g_modules.Graphic({"geometry":{"x":-105400,"y":5137000,"spatialReference":{"wkid":102100}},"attributes":{"lat":0.0,"lng":0.0,"description":"g1"}});
            g2 = new g_modules.Graphic({"geometry":{"x":-105600,"y":5137000,"spatialReference":{"wkid":102100}},"attributes":{"lat":0.0,"lng":0.0,"description":"g2"}});
            g3 = new g_modules.Graphic({"geometry":{"x":-105800,"y":5137000,"spatialReference":{"wkid":102100}},"attributes":{"lat":0.0,"lng":0.0,"description":"g3"}});

            var adds = [g1,g2,g3];
            g_featureLayers[0].applyEdits(adds,null,null,function(addResults,updateResults,deleteResults)
                {
                    expect(addResults.length).toBe(3);
                    expect(addResults[0].success).toBeTruthy();
                    expect(addResults[1].success).toBeTruthy();
                    expect(addResults[2].success).toBeTruthy();
                    //g1.attributes.objectid = addResults[0].objectId;
                    //g2.attributes.objectid = addResults[1].objectId;
                    //g3.attributes.objectid = addResults[2].objectId;
                    expect(getObjectIds(g_featureLayers[0].graphics)).toEqual(getObjectIds([g1,g2,g3]));
                    expect(g_featureLayers[0].graphics.length).toBe(3);
                    countFeatures(g_featureLayers[0], function(success,result)
                    {
                        expect(success).toBeTruthy();
                        expect(result.count).toBe(3);
                        done();
                    });
                },
                function(error)
                {
                    expect(true).toBeFalsy();
                    done();
                });
        });

        async.it("update test features", function(done)
        {
            expect(getObjectIds(g_featureLayers[0].graphics)).toEqual(getObjectIds([g1,g2,g3]));
            expect(g_featureLayers[0].graphics.length).toBe(3);

            g1.geometry.y += 300;
            g2.geometry.y += 100;
            g3.geometry.y -= 200;
            var updates = [g1,g2,g3];
            g_featureLayers[0].applyEdits(null,updates,null,function(addResults,updateResults,deleteResults)
                {
                    expect(updateResults.length).toBe(3);
                    expect(updateResults[0].success).toBeTruthy();
                    expect(updateResults[1].success).toBeTruthy();
                    expect(updateResults[2].success).toBeTruthy();
                    expect(getObjectIds(g_featureLayers[0].graphics)).toEqual(getObjectIds([g1,g2,g3]));
                    expect(g_featureLayers[0].graphics.length).toBe(3);
                    done();
                },
                function(error)
                {
                    expect(true).toBeFalsy();
                    done();
                });
        });

        async.it("delete one test feature", function(done) {
            expect(getObjectIds(g_featureLayers[0].graphics)).toEqual(getObjectIds([g1, g2, g3]));
            expect(g_featureLayers[0].graphics.length).toBe(3);

            var deletes = [g3];
            g_featureLayers[0].applyEdits(null, null, deletes, function (addResults, updateResults, deleteResults) {
                    expect(deleteResults.length).toBe(1);
                    expect(getObjectIds(g_featureLayers[0].graphics)).toEqual(getObjectIds([g1, g2]));
                    expect(g_featureLayers[0].graphics.length).toBe(2);
                    done();
                },
                function (error) {
                    expect(true).toBeFalsy();
                    done();
                });
        });
    });
});

describe("Offline Editing", function()
{

    var g1,g2,g3;
    var g4,g5,g6;

    describe("Prep db and feature service", function()
    {
        async.it("detect IndexedDB support", function (done) {
            expect(g_editsStore.isSupported()).toBeTruthy();
            done();
        });

        async.it("initialize database", function (done) {
            g_editsStore.init(function (success) {
                expect(success).toEqual(true);
                done();
            })
        });

        async.it("Prepare feature service. Clear database",function(done)
        {
            g_featureLayers[0].resetDatabase(function (result) {
                expect(result).toEqual(true);

                g_featureLayers[0].pendingEditsCount(function (count) {
                    expect(count).toBe(0);
                    done();
                });

            });
        });

        async.it("Prepare feature service. Clear feature Layers - points - lines", function(done)
        {
            var count = 0;
            function completedOne()
            {
                count += 1;

                if(count==g_layersIds.length){
                    console.log("Before running tests graphic count 2: " + g_featureLayers[0].graphics.length);
                    done();
                }
            }
            clearFeatureLayer( g_featureLayers[0], function(success,response)
            {
                expect(success).toBeTruthy();
                var listener = g_featureLayers[0].on('update-end', function(){ listener.remove(); completedOne();})
                g_featureLayers[0].refresh();
            });
        });

        async.it("Prepare feature service. Add some features online - points", function(done)
        {
            expect(g_offlineEdit.getOnlineStatus()).toBe(g_offlineEdit.ONLINE);

            g1 = new g_modules.Graphic({"geometry":{"x":-105400,"y":5137000,"spatialReference":{"wkid":102100}},"attributes":{"OBJECTID":1,"lat":0.0,"lng":0.0,"description":"g1"}});
            g2 = new g_modules.Graphic({"geometry":{"x":-105600,"y":5137000,"spatialReference":{"wkid":102100}},"attributes":{"OBJECTID":2,"lat":0.0,"lng":0.0,"description":"g2"}});
            g3 = new g_modules.Graphic({"geometry":{"x":-105800,"y":5137000,"spatialReference":{"wkid":102100}},"attributes":{"OBJECTID":3,"lat":0.0,"lng":0.0,"description":"g3"}});

            var adds = [g1,g2,g3];
            g_featureLayers[0].applyEdits(adds,null,null,function(addResults,updateResults,deleteResults)
                {
                    expect(addResults.length).toBe(3);
                    console.log("OBJECT IDs Before going offline: " + JSON.stringify(getObjectIds(g_featureLayers[0].graphics)));
                    expect(getObjectIds(g_featureLayers[0].graphics)).toEqual(getObjectIds([g1,g2,g3]));
                    expect(g_featureLayers[0].graphics.length).toBe(3);
                    countFeatures(g_featureLayers[0], function(success,result)
                    {
                        expect(success).toBeTruthy();
                        expect(result.count).toBe(3);

                        done();
                    });
                },
                function(error)
                {
                    expect(true).toBeFalsy();
                });
        });
    });

    describe("Go offline", function()
    {
        async.it("go Offline", function(done)
        {
            expect(g_offlineEdit.getOnlineStatus()).toBe(g_offlineEdit.ONLINE);
            g_offlineEdit.goOffline();
            expect(g_offlineEdit.getOnlineStatus()).toBe(g_offlineEdit.OFFLINE);
            done();
        });

        async.it("update existing features - points", function(done)
        {

            var listener = jasmine.createSpy('event listener edits enqueued');

            g_offlineEdit.on(g_offlineEdit.events.EDITS_ENQUEUED,listener);


            expect(getObjectIds(g_featureLayers[0].graphics)).toEqual(getObjectIds([g1,g2,g3]));
            expect(g_featureLayers[0].graphics.length).toBe(3);
            expect(g_offlineEdit.getOnlineStatus()).toBe(g_offlineEdit.OFFLINE);

            g1.geometry.y += 300;
            g2.geometry.y += 100;
            g3.geometry.y -= 200;
            var updates = [g1,g2,g3];
            g_featureLayers[0].applyEdits(null,updates,null,function(addResults,updateResults,deleteResults)
                {   console.log("update existing features - points: " + JSON.stringify(updateResults))
                    expect(updateResults.length).toBe(3);
                    expect(updateResults[0].success).toBeTruthy();
                    expect(updateResults[1].success).toBeTruthy();
                    expect(updateResults[2].success).toBeTruthy();
                    expect(getObjectIds(g_featureLayers[0].graphics)).toEqual(getObjectIds([g1,g2,g3]));
                    expect(g_featureLayers[0].graphics.length).toBe(3);
                    expect(listener).toHaveBeenCalled();
                    g_editsStore.pendingEditsCount(function(result){
                        expect(result).toBe(3);
                        done();
                    });
                },
                function(error)
                {
                    expect(true).toBeFalsy();
                    done();
                });
        });

        async.it("delete existing features - points", function(done)
        {
            expect(getObjectIds(g_featureLayers[0].graphics)).toEqual(getObjectIds([g1,g2,g3]));
            expect(g_featureLayers[0].graphics.length).toBe(3);

            var deletes = [g3]; console.log("Graphic " + JSON.stringify(g3.toJson()));
            g_featureLayers[0].applyEdits(null,null,deletes,function(addResults,updateResults,deleteResults)
                {
                    expect(deleteResults.length).toBe(1);
                    expect(getObjectIds(g_featureLayers[0].graphics)).toEqual(getObjectIds([g1,g2]));
                    expect(g_featureLayers[0].graphics.length).toBe(2);
                    g_editsStore.pendingEditsCount(function(result){

                        // Expected count will stil be 6! This record is the database gets overwritten
                        // with the latest edit request. Last edit wins.
                        expect(result).toBe(3);
                        done();
                    });
                },
                function(error)
                {
                    expect(true).toBeFalsy();
                    done();
                });
        });

        async.it("add new features offline - points", function(done)
        {
            expect(getObjectIds(g_featureLayers[0].graphics)).toEqual(getObjectIds([g1,g2]));
            expect(g_featureLayers[0].graphics.length).toBe(2);
            expect(g_offlineEdit.getOnlineStatus()).toBe(g_offlineEdit.OFFLINE);

            //g4 = new g_modules.Graphic({"geometry":{"x":-109100,"y":5137000,"spatialReference":{"wkid":102100}},"attributes":{"symbolname":"Reference Point DLRP","z":null,"additionalinformation":null,"eny":null,"datetimevalid":null,"datetimeexpired":null,"distance":null,"azimuth":null,"uniquedesignation":null,"x":null,"y":null}} );
            //g5 = new g_modules.Graphic({"geometry":{"x":-109500,"y":5137000,"spatialReference":{"wkid":102100}},"attributes":{"symbolname":"Reference Point DLRP","z":null,"additionalinformation":null,"eny":null,"datetimevalid":null,"datetimeexpired":null,"distance":null,"azimuth":null,"uniquedesignation":null,"x":null,"y":null}} );
            //g6 = new g_modules.Graphic({"geometry":{"x":-109900,"y":5137000,"spatialReference":{"wkid":102100}},"attributes":{"symbolname":"Reference Point DLRP","z":null,"additionalinformation":null,"eny":null,"datetimevalid":null,"datetimeexpired":null,"distance":null,"azimuth":null,"uniquedesignation":null,"x":null,"y":null}} );

            g4 = new g_modules.Graphic({"geometry":{"x":-109100,"y":5137000,"spatialReference":{"wkid":102100}},"attributes":{"OBJECTID":4,"lat":0.0,"lng":0.0,"description":"g4"}});
            g5 = new g_modules.Graphic({"geometry":{"x":-109500,"y":5137000,"spatialReference":{"wkid":102100}},"attributes":{"OBJECTID":5,"lat":0.0,"lng":0.0,"description":"g5"}});
            g6 = new g_modules.Graphic({"geometry":{"x":-109900,"y":5137000,"spatialReference":{"wkid":102100}},"attributes":{"OBJECTID":6,"lat":0.0,"lng":0.0,"description":"g6"}});

            var adds = [g4,g5,g6];
            g_featureLayers[0].applyEdits(adds,null,null,function(addResults,updateResults,deleteResults)
                {
                    expect(addResults.length).toBe(3);

                    g_editsStore.pendingEditsCount(function(result){

                        // Should be 9 since we added 3 three edits and we had 6 edits in the previous test
                        expect(result).toBe(6);
                        done();
                    });

                    expect(getObjectIds(g_featureLayers[0].graphics)).toEqual(getObjectIds([g1,g2,g4,g5,g6]));
                    expect(g_featureLayers[0].graphics.length).toBe(5);
                    //g4.attributes.objectid = addResults[0].objectId;
                    //g5.attributes.objectid = addResults[1].objectId;
                    //g6.attributes.objectid = addResults[2].objectId;
                    expect(addResults[0].objectId).toBeLessThan(0);
                    expect(addResults[1].objectId).toEqual(-2);
                    expect(addResults[2].objectId).toEqual(-3);
                },
                function(error)
                {
                    expect(true).toBeFalsy();
                });
        });

        async.it("Update new feature offline - point", function(done){

            // Let's make a change to g6 attributes
            g6.attributes.additionalinformation = null;
            var updates = [g6];
            g_featureLayers[0].applyEdits(null,updates,null,function(addResults,updateResults,deleteResults)
                {
                    expect(updateResults.length).toBe(1);

                    console.log("OBJECT IDs after updating new offline feature: " + JSON.stringify(getObjectIds(g_featureLayers[0].graphics)));
                    expect(getObjectIds(g_featureLayers[0].graphics)).toEqual(getObjectIds([g1,g2,g4,g5,g6]));

                    g_editsStore.pendingEditsCount(function(result){

                        // Should be the exact same as previous test
                        // An update to a new feature should be a single entry in the database.
                        // We simply update the existing entry with the new information.
                        expect(result).toBe(6);
                        done();
                    });
                },
                function(error)
                {
                    expect(true).toBeFalsy();
                });
        });

        async.it("validate non-existent feature - ADD", function(done){

            var testGraphic = new g_modules.Graphic({"geometry":{"x":-109100,"y":5137000,"spatialReference":{"wkid":102100}},"attributes":{"symbolname":"Reference Point DLRP","z":null,"additionalinformation":null,"eny":null,"datetimevalid":null,"datetimeexpired":null,"distance":null,"azimuth":null,"uniquedesignation":null,"x":null,"y":null}} );

            g_featureLayers[0]._validateFeature(testGraphic,g_featureLayers[0].url,"add")
                .then(function(result){
                    expect(result.success).toBe(true);
                    expect(testGraphic).toEqual(result.graphic);
                    expect(result.operation).toEqual("add");
                    done();
                },function(error){
                    console.log("Validate feature error: " + error);
                });
        });

        async.it("validate feature that exists in db - ADD", function(done){
            var id = getObjectIds([g6]).toString();
            expect(id).toEqual("-3");
            g_featureLayers[0]._validateFeature(g6,g_featureLayers[0].url,"add")
                .then(function(result){
                    expect(result.success).toBe(true);
                    expect(g6).toEqual(result.graphic);
                    expect(JSON.stringify(g6.toJson()) === JSON.stringify(result.graphic.toJson())).toBeTruthy();
                    expect(result.operation).toEqual("add");
                    done();
                },function(error){
                    console.log("Validate feature error: " + error);
                });
        });

        // This UPDATE should be converted in an ADD
        async.it("validate feature that exists in db - UPDATE", function(done){
            var id = getObjectIds([g6]).toString();
            expect(id).toEqual("-3");
            g_featureLayers[0]._validateFeature(g6,g_featureLayers[0].url,"update")
                .then(function(result){
                    expect(result.success).toBe(true);
                    expect(g6).toEqual(result.graphic);

                    // we swap the operation type when updating an edit that hasn't
                    // been submitted to the server yet.
                    expect(result.operation).toBe("add");
                    expect(JSON.stringify(g6.toJson()) === JSON.stringify(result.graphic.toJson())).toBeTruthy();
                    expect(result.operation).toEqual("add");
                    done();
                },function(error){
                    console.log("Validate feature error: " + error);
                });
        });

        // Checking for errors and error handling
        async.it("delete a non-existing feature directly from db", function(done){

            var fakeGraphic = new g_modules.Graphic({"geometry":{"x":-10910,"y":513700,"spatialReference":{"wkid":102100}},"attributes":{"symbolname":"Reference Point 1234","z":null,"additionalinformation":null,"eny":null,"datetimevalid":null,"datetimeexpired":null,"distance":null,"azimuth":null,"uniquedesignation":null,"x":null,"y":null}} );
            g_editsStore.delete(g_featureLayers[0].url,fakeGraphic,function(success,error){
                expect(success).toBe(false);
                done();
            });
        });

        // Checking for errors and error handling
        async.it("delete a non-existing feature using extended feature layer", function(done){

            var fakeGraphic = new g_modules.Graphic({"geometry":{"x":-10910,"y":513700,"spatialReference":{"wkid":102100}},"attributes":{"symbolname":"Reference Point 1234","z":null,"additionalinformation":null,"eny":null,"datetimevalid":null,"datetimeexpired":null,"distance":null,"azimuth":null,"uniquedesignation":null,"x":null,"y":null}} );
            g_featureLayers[0]._deleteTemporaryFeature(fakeGraphic,function(results){
                expect(results).toBe(false);
                done();
            });
        });

        async.it("check db size before offline delete", function(done){
            g_featureLayers[0].getUsage(function(usage,error){
                expect(usage.sizeBytes).toBe(2498);
                expect(usage.editCount).toBe(6);
                expect(error).toBe(null);
                done();
            })
        });

        // This private function deletes a temporary graphic and it's associated phantom graphic
        async.it("delete an existing feature from db using extended feature layer", function(done){
            var id = getObjectIds([g5]).toString();
            expect(id).toEqual("-2");
            g_featureLayers[0]._deleteTemporaryFeature(g5,function(results){

                // We only deleted data from database NOT from the featurelayer!
                console.log("OBJECT IDs after deleting offline feature: " + JSON.stringify(getObjectIds(g_featureLayers[0].graphics)));
                expect(getObjectIds(g_featureLayers[0].graphics)).toEqual(getObjectIds([g1,g2,g4,g5,g6]));

                expect(results).toBe(true);
                done();
            });
        });

        async.it("check db size after offline delete", function(done){
            g_featureLayers[0].getUsage(function(usage,error){
                expect(usage.sizeBytes).toBe(2090);
                expect(usage.editCount).toBe(5);
                expect(error).toBe(null);
                done();
            })
        });
    });

    describe("Before going online", function(){
        async.it("Before going online validate graphic layer properties", function(done){
            // Remember we deleted g3! So our total count is 8 not 9. HOWEVER, there should be 9 records in the database!
            expect(getObjectIds(g_featureLayers[0].graphics)).toEqual(getObjectIds([g1,g2,g4,g5,g6]));
            //expect(getObjectIds(g_featureLayers[1].graphics)).toEqual(getObjectIds([l1,l2,l3]));
            expect(g_featureLayers[0].graphics.length).toBe(5);
            //expect(g_featureLayers[1].graphics.length).toBe(3);
            //expect(g_featureLayers[2].graphics.length).toBe(0);
            done();
        });

        // Here's a list of what we should have for pending edits:
        // -1 = add
        // -3 = add
        // update
        // update
        // delete
        async.it("Retrieve edits array from the layer", function(done){
            g_featureLayers[0].getAllEditsArray(function(success,array){
                expect(success).toBe(true); console.log("Pending edits prior to going back online: " + JSON.stringify(array))
                expect(array.length).toBe(5);
                done();
            });
        });

        async.it("Verify feature layer graphic counts",function(done){
            // all of them are positive
            console.log("OBJECT IDs Before Online: " + JSON.stringify(getObjectIds(g_featureLayers[0].graphics)));
            expect(getObjectIds(g_featureLayers[0].graphics).filter(function(id){ return id<0; })).toEqual([-1,-2,-3]);
            expect(g_featureLayers[0].graphics.length).toBe(5);
            done();
        });

        async.it("Verify feature count from the feature layer's REST endpoint",function(done){
            countFeatures(g_featureLayers[0], function(success,result)
            {
                expect(success).toBeTruthy();
                expect(result.count).toBe(3);
                done();
            });
        });
    });

    describe("go Online", function()
    {
        async.it("go Online", function(done)
        {

            var listener = jasmine.createSpy('event listener all edits sent');

            //g_offlineEdit.on(g_offlineEdit.events.ALL_EDITS_SENT,listener);

            g_offlineEdit.goOnline(function(success,results) {
                console.log("Library is now back online");
                expect(g_offlineEdit.getOnlineStatus()).toBe(g_offlineEdit.ONLINE);
                //expect(listener).toHaveBeenCalled();
                expect(success).toBeTruthy();

                //console.log("RESPONSES " + JSON.stringify(responses) + ", " + JSON.stringify(results))

                //expect(Object.keys(results.responses).length).toBe(5);
                for (var key in results) {

                    var response = results[key];

                    console.log("RESPONSE " + JSON.stringify(response))

                    //var layerId = response.layer.substring(response.layer.lastIndexOf('/') + 1);
                    //
                    //expect(typeof response.tempId).toBe("object");
                    //expect(typeof response.updateResults).toBe("object");
                    //expect(typeof response.deleteResults).toBe("object");
                    //expect(typeof response.addResults).toBe("object");
                    //expect(typeof response.id).toBe("string");
                    //expect(typeof response.layer).toBe("string");
                    //
                    //if(response.updateResults.length > 0){
                    //    expect(response.updateResults[0].success).toBe(true);
                    //    expect(response.updateResults[0].objectId).toBeGreaterThan(0);
                    //}
                    //if(response.deleteResults.length > 0){
                    //    expect(response.deleteResults[0].success).toBe(true);
                    //    expect(response.deleteResults[0].objectId).toBeGreaterThan(0);
                    //}
                    //if(response.addResults.length > 0){
                    //    expect(response.addResults[0].success).toBe(true);
                    //    expect(response.addResults[0].objectId).toBeGreaterThan(0);
                    //}
                }
                done();
            });
        });
    });

    describe("After online", function(){
        async.it("After online - verify feature layer graphic counts",function(done){
            console.log("After Online feature layers graphic count before clear: " + g_featureLayers[0].graphics.length);

            countFeatures(g_featureLayers[0], function(success,result)
            {
                expect(success).toBeTruthy();
                expect(result.count).toBe(4);
                done();
            });

            //done();
        });

        async.it("Retrieve edits array from the layer", function(done){
            g_featureLayers[0].getAllEditsArray(function(success,array){
                expect(success).toBe(true); console.log("ARRAY should be empty " + JSON.stringify(array))
                expect(array.length).toBe(0);
                done();
            });
        });

        async.it("After online - verify online status",function(done){
            expect(g_offlineEdit.getOnlineStatus()).toBe(g_offlineEdit.ONLINE);
            done();
        });

        async.it("After online - check pending edits count 0",function(done){
            g_editsStore.pendingEditsCount(function(result){
                expect(result).toBe(0);
                done();
            });
        });
    });
});