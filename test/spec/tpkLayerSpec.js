"use strict";

describe("TPKLayer module", function(){
    var async = new AsyncSpec(this);
    var tilesEntries = null;

    console.log("Init tests...")

    async.it("Validate TPKLayer init", function(done)
    {
        expect(tpkLayer).toEqual(jasmine.any(Object));
        expect(tpkLayer.store).toEqual(jasmine.any(Object));
        done();
    });

    async.it("Unzip TPK file", function(done){
        var blob = FILE;
        zip.createReader(new zip.BlobReader(blob), function (zipReader) {
            zipReader.getEntries(function (entries) {

                tilesEntries = entries;
                console.log("DONE unzipping")
                expect(entries.length).toBeGreaterThan(0)
                done();
                zipReader.close(function(evt){
                    console.log("Done reading zip file.")
                })
            }, function (err) {
                alert("There was a problem reading the file!: " + err);
            })
        }.bind(this))
    })
})
