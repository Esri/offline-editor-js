"use strict"

describe("offline enabler library", function()
{
	var async = new AsyncSpec(this);

    async.it("validate map", function(done)
    {
        expect(g_map).toEqual(jasmine.any(Object));
        expect(g_map.id).toEqual("map");
        done();
    });

    async.it("validate tiled layer", function(done)
    {
        expect(g_basemapLayer).toEqual(jasmine.any(Object));
        expect(g_basemapLayer.tileInfo).toEqual(jasmine.any(Object));
        done();
    });

	async.it("extends the tiled layer object", function(done)
	{
		expect(g_basemapLayer.goOffline).toBeUndefined();
		g_offlineTilesEnabler.extend(g_basemapLayer,function(success)
		{
            g_basemapLayer.offline.proxyPath = null;

            expect(success).toEqual(true);
			expect(g_basemapLayer.goOffline).toEqual(jasmine.any(Function));
			expect(g_basemapLayer.goOnline).toEqual(jasmine.any(Function));
			expect(g_basemapLayer.getTileUrl).toEqual(jasmine.any(Function));
			expect(g_basemapLayer._getTileUrl).toEqual(jasmine.any(Function));
			expect(g_basemapLayer.prepareForOffline).toEqual(jasmine.any(Function));
			expect(g_basemapLayer.deleteAllTiles).toEqual(jasmine.any(Function));
			expect(g_basemapLayer.offline).toEqual(jasmine.any(Object));
			expect(g_basemapLayer.offline.store).toEqual(jasmine.any(Object));
            expect(g_basemapLayer._tilesCore._storeTile).toEqual(jasmine.any(Function));

//			g_basemapLayer.offline.proxyPath = "../lib/resource-proxy/proxy.php";
	        done();
		});
	});

	async.it("can go offline", function(done)
	{
		expect(g_basemapLayer.goOffline).toEqual(jasmine.any(Function));
		expect(g_basemapLayer.offline.online).toEqual(true);
		g_basemapLayer.goOffline();
		expect(g_basemapLayer.offline.online).toEqual(false);
        done();
	});

	async.it("can go online", function(done)
	{
		expect(g_basemapLayer.goOffline).toEqual(jasmine.any(Function));
		expect(g_basemapLayer.offline.online).toEqual(false);
		g_basemapLayer.goOnline();
		expect(g_basemapLayer.offline.online).toEqual(true);
        done();
	})

	async.it("delete all tiles", function(done)
	{
		g_basemapLayer.deleteAllTiles(function(success)
		{
			expect(success).toEqual(true);
			setTimeout(function()
			{
				g_basemapLayer.getOfflineUsage(function(usage)
				{
					expect(usage.tileCount).toEqual(0);
			        done();
				});				
			},1);
		});
	});

	async.it("stores one tile", function(done)
	{
		g_basemapLayer.getOfflineUsage(function(usage)
		{
			expect(usage.tileCount).toEqual(0);

            var url = g_basemapLayer._getTileUrl(14,6177,8023);

			g_basemapLayer._tilesCore._storeTile(url,g_basemapLayer.offline.proxyPath,g_basemapLayer.offline.store, function(success)
			{
				expect(success).toEqual(true);
				g_basemapLayer.getOfflineUsage(function(usage)
				{
					expect(usage.tileCount).toEqual(1);
			        done();
				});
			});
		});
	});

	async.it("stores one tile again", function(done)
	{
		g_basemapLayer.getOfflineUsage(function(usage)
		{
			expect(usage.tileCount).toEqual(1);
            var url = g_basemapLayer._getTileUrl(14,6177,8023);

            g_basemapLayer._tilesCore._storeTile(url,g_basemapLayer.offline.proxyPath,g_basemapLayer.offline.store, function(success)
            {
				expect(success).toEqual(true);
				g_basemapLayer.getOfflineUsage(function(usage)
				{
					expect(usage.tileCount).toEqual(1);
			        done();
				});
			});
		});
	});

	async.it("gets level estimation", function(done)
	{
		require(["esri/geometry/Extent"],function(Extent)
		{			
            var extent = new Extent({"xmin":-822542.2830377579,"ymin":4580841.761960262,"xmax":94702.05638410954,"ymax":5131188.365613382,"spatialReference":{"wkid":102100}});
			g_basemapLayer.estimateTileSize(function(tileSize){
                var estimation = g_basemapLayer.getLevelEstimation(extent,10,tileSize);
                expect(estimation.tileCount).toEqual(375);
                expect(estimation.sizeBytes).toEqual(estimation.tileCount * tileSize);

                var estimation = g_basemapLayer.getLevelEstimation(extent,8,tileSize);
                expect(estimation.tileCount).toEqual(28);
                expect(estimation.sizeBytes).toEqual(estimation.tileCount * tileSize);
                var estimation = g_basemapLayer.getLevelEstimation(extent,2,tileSize);
                expect(estimation.tileCount).toEqual(2);
                expect(estimation.sizeBytes).toEqual(estimation.tileCount * tileSize);
                done();
            }.bind(this));
		});
	});

	async.it("prepares the layer for offline usage", function(done)
	{
		require(["esri/geometry/Extent"], function(Extent)
		{			
			g_basemapLayer.deleteAllTiles(function(success)
			{
				expect(success).toEqual(true);
				var extent = new Extent({"xmin":-822542.2830377579,"ymin":4580841.761960262,"xmax":94702.05638410954,"ymax":5131188.365613382,"spatialReference":{"wkid":102100}});
				var callCount = 0;
				var reportProgress = function(progress)
				{
					callCount += 1;
					expect(progress.error).not.toBeDefined();

					if( progress.finishedDownloading )
					{
						g_basemapLayer.getOfflineUsage(function(usage)
						{
							expect(usage.tileCount).toEqual(28);
							expect(callCount).toEqual(29);
					        done();
						});
					}

					return false; // cancelRequested = false;
				}

				g_basemapLayer.prepareForOffline(8,8,extent,reportProgress);
			});
		});
	});

    async.it("get tile urls",function(done)
    {
        require(["esri/geometry/Extent"],function(Extent){
            var extent = new Extent({"xmin":-822542.2830377579,"ymin":4580841.761960262,"xmax":94702.05638410954,"ymax":5131188.365613382,"spatialReference":{"wkid":102100}});
            var cells = g_basemapLayer.getTileUrlsByExtent(extent,3);
            var regexp = /(ftp|http|https):\/\/(\w+:{0,1}\w*@)?(\S+)(:[0-9]+)?(\/|\/([\w#!:.?+=&%@!\-\/]))?/;
            for(var i = 0; i < cells.length; i++){
                var isUrl = regexp.test(cells[i]);
                expect(isUrl).toBe(true);
            }
            expect(cells.length).toBeGreaterThan(0);
            done();
        });
    });

    async.it("get extent buffer",function(done)
    {
        require(["esri/geometry/Extent"],function(Extent){
            var extent = new Extent({"xmin":-822542.2830377579,"ymin":4580841.761960262,"xmax":94702.05638410954,"ymax":5131188.365613382,"spatialReference":{"wkid":102100}});
            var newExtent = g_basemapLayer.getExtentBuffer(1000,extent);
            expect(newExtent.xmin).toBe(-823542.2830377579);
            done();
        });
    });

	async.it("returns placeholder urls when offline", function(done)
	{
		require(["dojo/dom"], function(dom)
		{
			var fakeTile = dom.byId('fakeTile');

			g_basemapLayer.goOnline();
			var onlineUrl = g_basemapLayer.getTileUrl(14,6178,8023);

            //NOTE: We are getting new attributes at ArcGIS JS API v3.8 : blankTile=false&_ts=1393031666639 <last part is a random number>
            // http://services.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/14/6178/8023?blankTile=false&_ts=1393031666639"
            var tempUrl = onlineUrl.slice( 0, onlineUrl.indexOf('?'))
			expect(tempUrl).toEqual('http://services.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/14/6178/8023');
			
			g_basemapLayer.goOffline();
			var offlineUrl = fakeTile.src = g_basemapLayer.getTileUrl(14,6178,8023);
			expect(offlineUrl).toEqual('void:/14/6178/8023');
			done();
		})
	});

    async.it("get all tile polygons within extent",function(done){
        require(["dojo/Deferred","dojo/promise/all",],function(Deferred,all){

            var promises = [];

            g_basemapLayer.getTilePolygons(function(result,err){

                var deferred = new Deferred();
                if(result && result.type){
                    console.log("Tile polygon: " + result);
                    expect(result.type).toEqual("polygon");
                }
                deferred.resolve(result);
                promises.push(deferred);
            })

            all(promises).then( function(results)
            {
                done();
            });

        })
    });

    async.it("load csv from file",function(done){
        var csv = ["url,img\r\nhttp://esri.com,base64image_goes_here"];
        var blob = new Blob(csv, {type : 'text/csv'});
        blob.name = "test1";
        g_basemapLayer.loadFromFile(blob,function(success,result){
            expect(success).toBe(true);
            expect(result).toEqual("1 tiles loaded from test1");
            done();
        })
    });

    async.it("save tiles to csv",function(done){
       g_basemapLayer.saveToFile("testSaveToCSV",function(success,result){
           expect(success).toBe(true);
           done();
       })
    });

    async.it("getMaxZoom", function(done){
        g_basemapLayer.getMaxZoom(function(result){
            expect(result).toBe(16);
            done();
        })
    });

    async.it("getMinZoom", function(done){
        g_basemapLayer.getMinZoom(function(result){
            expect(result).toBe(0);
            done();
        })
    });

    async.it("getMinMaxLOD", function(done){
        var object = g_basemapLayer.getMinMaxLOD(-1,1);
        console.log("OBJECT " + JSON.stringify(object));
        expect(object.min).toBe(13);
        expect(object.max).toBe(15);
        done();
    })

});