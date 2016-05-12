"use strict";

/*
 * Utility library for deleting all features in a feature layer.
 * Use this to reset demo feature layers.
 * WARNING: this will delete EVERYTHING!
 */

function CleanFeatureLayer(featureLayer, callback)
{
    require(["esri/request"], function (esriRequest) {
        esriRequest({
            url: featureLayer.url + "/deleteFeatures",
            content: { f: 'json', where: '1=1'},
            handleAs: 'json'
        },{usePost:true}).then( function(response)
            {
                callback && callback(true,response);
            },
            function(error)
            {
                callback && callback(false,error);
            });
    });
}

function InitCleanFeatureLayer(featureLayer){

    CleanFeatureLayer(featureLayer, function(success){
        CleanFeatureLayer( featureLayer, function(success, response)
        {
            console.log("FeatureLayer cleaned: " + success);
            featureLayer.refresh();
        });
    });
}
