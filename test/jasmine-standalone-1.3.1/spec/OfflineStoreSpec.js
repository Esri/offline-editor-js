describe("OfflineStore", function() {

    it("provide local storage in MBs", function() {

        var mb = offlineStore.getlocalStorageUsed();
        expect(mb).toEqual(jasmine.any(Number));

    }.bind(this));

    it("delete localStore", function() {
        var store = offlineStore._deleteStore();
        expect(store).toEqual(true);

    })

    it("retrieve localStore is null", function() {
        var store = offlineStore.getStore();
        expect(store).toBeNull();
    })

    it("delete localStore index", function() {
        var index = offlineStore._deleteLocalStoreIndex();
        expect(index).toEqual(true);
    })

    it("retrieve localStore index is null", function() {
        var index = offlineStore.getLocalStoreIndex();
        expect(index).toBeNull();
    })

    it("check internet", function() {
        var net = offlineStore._checkInternet();
        expect(net).toEqual(true);
    })

    it("validate feature layer available", function() {
        var layer = offlineStore.layers[0];
        expect(layer.type).toEqual("Feature Layer");
    })


});