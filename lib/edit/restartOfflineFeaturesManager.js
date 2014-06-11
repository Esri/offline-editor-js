/**
 * Helper library for handling features during browser restarts or reloads.
 */
define(["esri/graphic"], function(Graphic) {
    "use strict";

    return {

        /**
         * Converts an array of graphics/features into JSON
         * @param features
         * @param updateEndEvent
         * @param callback
         */
        convertGraphicLayerToJSON: function(features,updateEndEvent,callback){
            var layerDefinition = {};
            layerDefinition.objectIdFieldName = updateEndEvent.target.objectIdField;
            layerDefinition.globalIdFieldName = updateEndEvent.target.globalIdField;
            layerDefinition.geometryType = updateEndEvent.target.geometryType;
            layerDefinition.spatialReference = updateEndEvent.target.spatialReference;
            layerDefinition.fields = updateEndEvent.target.fields;

            var length = features.length;
            var jsonArray = [];
            for(var i=0; i < length; i++){
                var jsonGraphic = features[i].toJson();
                jsonArray.push(jsonGraphic);
                if(i == (length - 1)) {
                    var featureJSON = JSON.stringify(jsonArray);
                    var layerDefJSON = JSON.stringify(layerDefinition);
                    callback(featureJSON,layerDefJSON);
                    break;
                }
            }
        },

        /**
         * Create a featureDefinition
         * @param featureLayer
         * @param featuresArr
         * @param geometryType
         * @param callback
         */
        getFeatureDefinition: function(/* Object */ featureLayer,/* Array */ featuresArr,/* String */ geometryType,callback){

            var featureDefinition = {
                "layerDefinition":featureLayer,
                "featureSet":{
                    "features": featuresArr,
                    "geometryType": geometryType
                }

            }

            callback(featureDefinition);
        }
    }
})