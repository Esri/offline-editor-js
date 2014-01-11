describe("Initialize Offline Library", function() {
    it("validate map", function(){
        expect(map.id).toEqual("map");
        expect(map).toEqual(jasmine.any(Object));
    })

    it("get graphics layer by id", function(){
        var layer = offlineStore._getGraphicsLayerById(6);
        expect(layer).toEqual(jasmine.any(Object));
    })

    it("provide local storage in MBs", function() {

        var mb = offlineStore.getlocalStorageUsed();
        expect(mb).toEqual(jasmine.any(Number));

    });

    it("delete local storage", function() {
        var store = offlineStore._deleteTempLocalStore();
        expect(store).toEqual(true);

    })

    it("check add enum", function(){
        var add = offlineStore.enum().ADD;
        expect(add).toEqual("add");
    })

    it("check update enum", function(){
        var add = offlineStore.enum().UPDATE;
        expect(add).toEqual("update");
    })

    it("check delete enum", function(){
        var add = offlineStore.enum().DELETE;
        expect(add).toEqual("delete");
    })

    it("get local storage is null", function() {
        var store = offlineStore.getStore();
        expect(store).toBeNull();
    })

    it("delete local storage index", function() {
        var index = offlineStore._deleteLocalStoreIndex();
        expect(index).toEqual(true);
    })

    it("get local storage index is null", function() {
        var index = offlineStore.getLocalStoreIndex();
        expect(index).toBeNull();
    })

    it("check internet", function() {
        var net = offlineStore.getInternet();
        expect(net).toEqual(true);
    })

    it("validate feature layer available", function() {
        var layer = offlineStore.layers[0];
        expect(layer.type).toEqual("Feature Layer");
    })

});

describe("Serialize/Deserialize Graphic - simple Point Graphic", function(){
    var jsonFromArr;

    it("serialize a graphic", function(){
        var json = offlineStore._serializeGraphic(simplePtGraphic,landusePointLayer,offlineStore.enum().ADD);
        expect(json).not.toBeUndefined();
    })

    it("deserialize a graphic", function(){
        var json = offlineStore._serializeGraphic(simplePtGraphic,landusePointLayer,offlineStore.enum().ADD);
        var portion = json.substring(0, json.length - 3); //remove tokens
        var graphic = offlineStore._deserializeGraphic(portion);
        expect(graphic.graphic).toEqual(jasmine.any(Object));
        expect(graphic.layer).toEqual(jasmine.any(Number));
        expect(graphic.enumValue).toEqual(jasmine.any(String));
    })

    it("re-serialize a graphics array", function(){
        jsonFromArr = offlineStore._reserializeGraphicsArray(serializedGraphicsArr);
        expect(jsonFromArr).toEqual(jasmine.any(String));
    })

    it("set re-serialized graphic in local storage", function(){
        var setItem = offlineStore._setTempLocalStore(jsonFromArr);
        expect(setItem).toEqual(true);
    })

    it("get re-serialized graphic from local storage", function(){
        var data = localStorage.getItem(offlineStore._localEnum().STORAGE_KEY);
        expect(data).not.toBeNull();
    })

    it("delete one graphic from local storage", function(){
        var value = null;
        var attempt = offlineStore._deleteItemInLocalStore("42749",function(evt){
            value = evt;
        }.bind(this))
        expect(value).toEqual(true);
    })
});

describe("Serialize/Deserialize Graphic - complex Point Graphic", function(){
    it("serialize a graphic", function(){
        var json = offlineStore._serializeGraphic(complexPtGraphic,landusePointLayer,offlineStore.enum().ADD);
        expect(json).not.toBeUndefined();
    })

    it("deserialize a graphic", function(){
        var json = offlineStore._serializeGraphic(complexPtGraphic,landusePointLayer,offlineStore.enum().ADD);
        var portion = json.substring(0, json.length - 3); //remove tokens
        var graphic = offlineStore._deserializeGraphic(portion);
        expect(graphic.graphic).toEqual(jasmine.any(Object));
        expect(graphic.layer).toEqual(jasmine.any(Number));
        expect(graphic.enumValue).toEqual(jasmine.any(String));
    })
});

describe("Serialize/Deserialize Graphic - simple Line Graphic", function(){
    it("serialize a graphic", function(){
        var json = offlineStore._serializeGraphic(simpleLineGraphic,landusePointLayer,offlineStore.enum().ADD);
        expect(json).not.toBeUndefined();
    })

    it("deserialize a graphic", function(){
        var json = offlineStore._serializeGraphic(simpleLineGraphic,landusePointLayer,offlineStore.enum().ADD);
        var portion = json.substring(0, json.length - 3); //remove tokens
        var graphic = offlineStore._deserializeGraphic(portion);
        expect(graphic.graphic).toEqual(jasmine.any(Object));
        expect(graphic.layer).toEqual(jasmine.any(Number));
        expect(graphic.enumValue).toEqual(jasmine.any(String));
    })
});

describe("Serialize/Deserialize Graphic - complex Line Graphic", function(){
    it("serialize a graphic", function(){
        var json = offlineStore._serializeGraphic(complexLineGraphic,landusePointLayer,offlineStore.enum().ADD);
        expect(json).not.toBeUndefined();
    })

    it("deserialize a graphic", function(){
        var json = offlineStore._serializeGraphic(complexLineGraphic,landusePointLayer,offlineStore.enum().ADD);
        var portion = json.substring(0, json.length - 3); //remove tokens
        var graphic = offlineStore._deserializeGraphic(portion);
        expect(graphic.graphic).toEqual(jasmine.any(Object));
        expect(graphic.layer).toEqual(jasmine.any(Number));
        expect(graphic.enumValue).toEqual(jasmine.any(String));
    })
});

describe("Serialize/Deserialize Graphic - simple Polygon Graphic", function(){
    it("serialize a graphic", function(){
        var json = offlineStore._serializeGraphic(simplePolygonGraphic,landusePointLayer,offlineStore.enum().ADD);
        expect(json).not.toBeUndefined();
    })

    it("deserialize a graphic", function(){
        var json = offlineStore._serializeGraphic(simplePolygonGraphic,landusePointLayer,offlineStore.enum().ADD);
        var portion = json.substring(0, json.length - 3); //remove tokens
        var graphic = offlineStore._deserializeGraphic(portion);
        expect(graphic.graphic).toEqual(jasmine.any(Object));
        expect(graphic.layer).toEqual(jasmine.any(Number));
        expect(graphic.enumValue).toEqual(jasmine.any(String));
    })
});

describe("Serialize/Deserialize Graphic - complex Polygon Graphic", function(){
    it("serialize a graphic", function(){
        var json = offlineStore._serializeGraphic(complexPolygonGraphic,landusePointLayer,offlineStore.enum().ADD);
        expect(json).not.toBeUndefined();
    })

    it("deserialize a graphic", function(){
        var json = offlineStore._serializeGraphic(complexPolygonGraphic,landusePointLayer,offlineStore.enum().ADD);
        var portion = json.substring(0, json.length - 3); //remove tokens
        var graphic = offlineStore._deserializeGraphic(portion);
        expect(graphic.graphic).toEqual(jasmine.any(Object));
        expect(graphic.layer).toEqual(jasmine.any(Number));
        expect(graphic.enumValue).toEqual(jasmine.any(String));
    })
});

describe("Validate local storage functionality - simple Point Graphic",function(){

    it("set item in local storage", function(){
        var json = offlineStore._serializeGraphic(simplePtGraphic,landusePointLayer,offlineStore.enum().ADD);
        var setItem = offlineStore._setTempLocalStore(json);
        expect(setItem).toEqual(true);
    })

    it("get item directly from local storage", function(){
        var data = localStorage.getItem(offlineStore._localEnum().STORAGE_KEY);
        expect(data).not.toBeNull();
    })

    it("get item from local storage using getStore()", function(){
        var data = offlineStore.getStore();
        var type = Object.prototype.toString.call( data ); // === '[object Array]';
        expect(type).toEqual('[object Array]');
    })

    it("add item to existing local storage - duplicate", function(){
        var json = offlineStore._serializeGraphic(simplePtGraphic,landusePointLayer,offlineStore.enum().ADD);
        var test = offlineStore._updateExistingLocalStore(json);
        expect(test).toBe(false);
    })

    it("add additional item to local storage - not a duplicate", function(){
        var json = offlineStore._serializeGraphic(simplePolygonGraphic,landusePointLayer,offlineStore.enum().ADD);
        var test = offlineStore._updateExistingLocalStore(json);
        expect(test).toBe(true);
    })

    it("get item from local storage using getStore()", function(){
        var data = offlineStore.getStore();
        var type = Object.prototype.toString.call( data ); // === '[object Array]';
        expect(type).toEqual('[object Array]');
    })

    it("delete local storage", function() {
        var store = offlineStore._deleteTempLocalStore();
        expect(store).toEqual(true);
    })
})

describe("Validate local storage functionality - complex Point Graphic",function(){

    it("set item in local storage", function(){
        var json = offlineStore._serializeGraphic(complexPtGraphic,landusePointLayer,offlineStore.enum().ADD);
        var setItem = offlineStore._setTempLocalStore(json);
        expect(setItem).toEqual(true);
    })

    it("get item directly from local storage", function(){
        var data = localStorage.getItem(offlineStore._localEnum().STORAGE_KEY);
        expect(data).not.toBeNull();
    })

    it("get item from local storage using getStore()", function(){
        var data = offlineStore.getStore();
        var type = Object.prototype.toString.call( data ); // === '[object Array]';
        expect(type).toEqual('[object Array]');
    })

    it("add item to existing local storage - duplicate", function(){
        var json = offlineStore._serializeGraphic(complexPtGraphic,landusePointLayer,offlineStore.enum().ADD);
        var test = offlineStore._updateExistingLocalStore(json);
        expect(test).toBe(false);
    })

    it("add additional item to local storage - not a duplicate", function(){
        var json = offlineStore._serializeGraphic(simplePolygonGraphic,landusePointLayer,offlineStore.enum().ADD);
        var test = offlineStore._updateExistingLocalStore(json);
        expect(test).toBe(true);
    })

    it("get item from local storage using getStore()", function(){
        var data = offlineStore.getStore();
        var type = Object.prototype.toString.call( data ); // === '[object Array]';
        expect(type).toEqual('[object Array]');
    })

    it("delete local storage", function() {
        var store = offlineStore._deleteTempLocalStore();
        expect(store).toEqual(true);
    })
})

describe("Validate local storage functionality - simple Line Graphic",function(){

    it("set item in local storage", function(){
        var json = offlineStore._serializeGraphic(simpleLineGraphic,landusePointLayer,offlineStore.enum().ADD);
        var setItem = offlineStore._setTempLocalStore(json);
        expect(setItem).toEqual(true);
    })

    it("get item directly from local storage", function(){
        var data = localStorage.getItem(offlineStore._localEnum().STORAGE_KEY);
        expect(data).not.toBeNull();
    })

    it("get item from local storage using getStore()", function(){
        var data = offlineStore.getStore();
        var type = Object.prototype.toString.call( data ); // === '[object Array]';
        expect(type).toEqual('[object Array]');
    })

    it("add item to existing local storage - duplicate", function(){
        var json = offlineStore._serializeGraphic(simpleLineGraphic,landusePointLayer,offlineStore.enum().ADD);
        var test = offlineStore._updateExistingLocalStore(json);
        expect(test).toBe(false);
    })

    it("add additional item to local storage - not a duplicate", function(){
        var json = offlineStore._serializeGraphic(simplePolygonGraphic,landusePointLayer,offlineStore.enum().ADD);
        var test = offlineStore._updateExistingLocalStore(json);
        expect(test).toBe(true);
    })

    it("get item from local storage using getStore()", function(){
        var data = offlineStore.getStore();
        var type = Object.prototype.toString.call( data ); // === '[object Array]';
        expect(type).toEqual('[object Array]');
    })

    it("delete local storage", function() {
        var store = offlineStore._deleteTempLocalStore();
        expect(store).toEqual(true);
    })
})

describe("Validate local storage functionality - complex Line Graphic",function(){

    it("set item in local storage", function(){
        var json = offlineStore._serializeGraphic(complexLineGraphic,landusePointLayer,offlineStore.enum().ADD);
        var setItem = offlineStore._setTempLocalStore(json);
        expect(setItem).toEqual(true);
    })

    it("get item directly from local storage", function(){
        var data = localStorage.getItem(offlineStore._localEnum().STORAGE_KEY);
        expect(data).not.toBeNull();
    })

    it("get item from local storage using getStore()", function(){
        var data = offlineStore.getStore();
        var type = Object.prototype.toString.call( data ); // === '[object Array]';
        expect(type).toEqual('[object Array]');
    })

    it("add item to existing local storage - duplicate", function(){
        var json = offlineStore._serializeGraphic(complexLineGraphic,landusePointLayer,offlineStore.enum().ADD);
        var test = offlineStore._updateExistingLocalStore(json);
        expect(test).toBe(false);
    })

    it("add additional item to local storage - not a duplicate", function(){
        var json = offlineStore._serializeGraphic(simplePolygonGraphic,landusePointLayer,offlineStore.enum().ADD);
        var test = offlineStore._updateExistingLocalStore(json);
        expect(test).toBe(true);
    })

    it("get item from local storage using getStore()", function(){
        var data = offlineStore.getStore();
        var type = Object.prototype.toString.call( data ); // === '[object Array]';
        expect(type).toEqual('[object Array]');
    })

    it("delete local storage", function() {
        var store = offlineStore._deleteTempLocalStore();
        expect(store).toEqual(true);
    })
})

describe("Validate local storage functionality - simple Polygon Graphic",function(){

    it("set item in local storage", function(){
        var json = offlineStore._serializeGraphic(simplePolygonGraphic,landusePointLayer,offlineStore.enum().ADD);
        var setItem = offlineStore._setTempLocalStore(json);
        expect(setItem).toEqual(true);
    })

    it("get item directly from local storage", function(){
        var data = localStorage.getItem(offlineStore._localEnum().STORAGE_KEY);
        expect(data).not.toBeNull();
    })

    it("get item from local storage using getStore()", function(){
        var data = offlineStore.getStore();
        var type = Object.prototype.toString.call( data ); // === '[object Array]';
        expect(type).toEqual('[object Array]');
    })

    it("add item to existing local storage - duplicate", function(){
        var json = offlineStore._serializeGraphic(simplePolygonGraphic,landusePointLayer,offlineStore.enum().ADD);
        var test = offlineStore._updateExistingLocalStore(json);
        expect(test).toBe(false);
    })

    it("add additional item to local storage - not a duplicate", function(){
        var json = offlineStore._serializeGraphic(complexPolygonGraphic,landusePointLayer,offlineStore.enum().ADD);
        var test = offlineStore._updateExistingLocalStore(json);
        expect(test).toBe(true);
    })

    it("get item from local storage using getStore()", function(){
        var data = offlineStore.getStore();
        var type = Object.prototype.toString.call( data ); // === '[object Array]';
        expect(type).toEqual('[object Array]');
    })

    it("delete local storage", function() {
        var store = offlineStore._deleteTempLocalStore();
        expect(store).toEqual(true);
    })
})

describe("Validate local storage functionality - complex Polygon Graphic",function(){

    it("set item in local storage", function(){
        var json = offlineStore._serializeGraphic(complexPolygonGraphic,landusePointLayer,offlineStore.enum().ADD);
        var setItem = offlineStore._setTempLocalStore(json);
        expect(setItem).toEqual(true);
    })

    it("get item directly from local storage", function(){
        var data = localStorage.getItem(offlineStore._localEnum().STORAGE_KEY);
        expect(data).not.toBeNull();
    })

    it("get item from local storage using getStore()", function(){
        var data = offlineStore.getStore();
        var type = Object.prototype.toString.call( data ); // === '[object Array]';
        expect(type).toEqual('[object Array]');
    })

    it("add item to existing local storage - duplicate", function(){
        var json = offlineStore._serializeGraphic(complexPolygonGraphic,landusePointLayer,offlineStore.enum().ADD);
        var test = offlineStore._updateExistingLocalStore(json);
        expect(test).toBe(false);
    })

    it("add additional item to local storage - not a duplicate", function(){
        var json = offlineStore._serializeGraphic(complexPtGraphic,landusePointLayer,offlineStore.enum().ADD);
        var test = offlineStore._updateExistingLocalStore(json);
        expect(test).toBe(true);
    })

    it("get item from local storage using getStore()", function(){
        var data = offlineStore.getStore();
        var type = Object.prototype.toString.call( data ); // === '[object Array]';
        expect(type).toEqual('[object Array]');
    })

    it("delete local storage", function() {
        var store = offlineStore._deleteTempLocalStore();
        expect(store).toEqual(true);
    })
})

describe("Validate local storage index functionality",function(){

    it("set item in local storage index", function(){

        var indexObject = new offlineStore._indexObject("6","testIdString","testTypeString",true,"polygon","1/20/30")
        var item = offlineStore._setItemLocalStoreIndexObject(indexObject);
        expect(item).toEqual(true);
    })

    it("get item from local storage index", function(){
        var item = offlineStore._isItemLocalStoreIndex("testIdString");
        expect(item).toEqual(true);
    })

    it("verify Id matches inserted value in storage index", function() {
        var item = offlineStore._getItemLocalStoreIndex("testIdString");
        expect("testIdString").toEqual(item.id);
    })

    it("verify layerId matches inserted value in storage index", function() {
        var item = offlineStore._getItemLocalStoreIndex("testIdString");
        expect("6").toEqual(item.layerId);
    })

    it("delete local storage index", function() {
        var index = offlineStore._deleteLocalStoreIndex();
        expect(index).toEqual(true);
    })

    it("get local storage index is null", function() {
        var index = offlineStore.getLocalStoreIndex();
        expect(index).toBeNull();
    })

    it("get item from local storage index (internal) is false", function(){
        var item = offlineStore._isItemLocalStoreIndex("testIdString");
        expect(item).toEqual(false);
    })
})

describe("Reestablish internet", function(){
    it("reestablish internet handler with empty store", function(){
        var validate = null;
        offlineStore._reestablishedInternet(function(evt){
            validate = evt;
        });
        expect(validate).toEqual(false);
    })
})

describe("Test custom event handling", function(){

    function testTrue(evt){
        validate = evt.detail.message;
        document.removeEventListener(offlineStore._localEnum().INTERNET_STATUS_EVENT,testTrue,false);
        expect(validate).toEqual(true);
    }

    function testFalse(evt){
        validate = evt.detail.message;
        document.removeEventListener(offlineStore._localEnum().INTERNET_STATUS_EVENT,testFalse,false);
        expect(validate).toEqual(false);
    }

    it("send and receive true event", function(){
        var validate = null;

        document.addEventListener(offlineStore._localEnum().INTERNET_STATUS_EVENT,testTrue,false);

        offlineStore._dispatchEvent(true,offlineStore._localEnum().INTERNET_STATUS_EVENT);
    })
    it("send and receive false event", function(){
        var validate = null;

        document.addEventListener(offlineStore._localEnum().INTERNET_STATUS_EVENT,testFalse,false);

        offlineStore._dispatchEvent(false,offlineStore._localEnum().INTERNET_STATUS_EVENT);
    })
})

describe("Test using phonegap device storage", function(){
    it("verify if phonegap installed and database available", function(){
        var validate = null;
        validate = phonegap.getDBVersion();

        expect(validate).toBeNull();
    })
})

/**
 * PROBLEM: This should throw an error BUT it fails silently. Maybe be a bug in the JS API. Needs further investigation.
 */
describe("Apply edits", function(){

    var graphicId = null;

    it("improper input - null values - delete", function(){
        var validate = null;
        offlineStore._layerEditManager(null,null,offlineStore.enum().DELETE,offlineStore._localEnum(),function(evt){
            validate = evt;
        });
        expect(validate).toBeNull();
    })

//    it("Add Point Graphic to local FeatureLayer",function(){
//        landusePointLayer.add(simplePtGraphic);
//        landusePointLayer.remove(simplePtGraphic);
//    })

//    it("Add then Delete a Point Graphic to FeatureService", function(){
//        var validate = null;
//
//        offlineStore._layerEditManager(simplePtGraphic,landusePointLayer,offlineStore.enum().ADD,offlineStore._localEnum(),function(num,success,id){
//            graphicId = id;
//            if(success == true){
//                offlineStore._layerEditManager(simplePtGraphic,landusePointLayer,offlineStore.enum().DELETE,offlineStore._localEnum(),function(num,success,id){
//                    validate = success;
//                }.bind(this));
//            }
//        });
//        expect(validate).toEqual(true);;
//    })
//
//    it("Delete a Point Graphic to FeatureService", function(){
//        var validate = null;
//        if(deleteGraphic == true)
//        offlineStore._layerEditManager(simplePtGraphic,landusePointLayer,offlineStore.enum().DELETE,offlineStore._localEnum(),function(num,success,id){
//            validate = success;
//        });
//        expect(validate).toEqual(true);;
//    })
})

//describe("Add a point", function(){
//    it("Inject point", function(){
//        var point = offlineStore.applyEdits(simplePtGraphic,landusePointLayer,"add");
//        offlineStore._stopTimer();
//        var store = offlineStore.getStore();
//        expect(store).not.toBeNull();
//
//    })
//})