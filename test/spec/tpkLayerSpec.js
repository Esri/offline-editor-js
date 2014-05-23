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

    async.it("Parse file entry", function(done){
        tpkLayer._fileEntriesLength = 2;
        tpkLayer._unzipConfFiles(tilesEntries,1,function(evt){
            var objectSize = tpkLayer.ObjectSize(evt);
            expect(objectSize).toEqual(1);
            done();
        })
    })

    async.it("Parse Bundle", function(done){
        var inMemTilesLength = tilesEntries.length;
        tpkLayer._zeroLengthFileCounter = 0;
        tpkLayer._fileEntriesLength = inMemTilesLength;

        for(var i=0;i < inMemTilesLength;i++){

            var name = tilesEntries[i].filename.toLocaleUpperCase();

            if(tilesEntries[i].compressedSize == 0) tpkLayer._zeroLengthFileCounter++;

            var indexCDI = name.indexOf("CONF.CDI",0);
            var indexXML = name.indexOf("CONF.XML",0);
            if(indexCDI == -1 || indexXML == -1){
                tpkLayer._unzipTileFiles(tilesEntries,i,function(result){
                    expect(result).toEqual(jasmine.any(Object));
                    done();
                },tpkLayer._self);
            }
        }
    })
})
