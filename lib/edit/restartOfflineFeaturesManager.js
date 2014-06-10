define(["esri/graphic"], function(Graphic) {
    "use strict";

    return {

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
                    callback(jsonArray,layerDefinition);
                    break;
                }
            }
        },

        reconstituteGraphicsLayer: function(featureLayer,featuresArr,callback){

            if(featureLayer == null){
                alert("No features available available locally.")
            }
            else{
                var featureDefinition = {
                    "layerDefinition":featureLayer,
                    "featureSet":{
                        "features": featuresArr,
                        "geometryType": "esriGeometryPoint"
                    }

                }

                var newFeatureLayer = new FeatureLayer(featureDefinition,{
                    mode: FeatureLayer.MODE_SNAPSHOT,
                    outFields: ["OBJECTID","BSID","ROUTES","STOPNAME"]
                });

                // Set the graphics to red boxes to make it easy to click on them
                // on a mobile device.
                newFeatureLayer.setRenderer(new SimpleRenderer(defaultSymbol));

//                var mapListen = map.on("update-end",function(evt){
//                    console.log("Feature has been added back to the map while offline.")
//                    mapListen.remove();
//                })
//                map.addLayer(busStopsFeatureLayer);
                callback(newFeatureLayer);
            }
        }
    }
})