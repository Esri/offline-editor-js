O.esri.Tiles.TilingScheme = function (layer) {
    this.tileInfo = layer.tileInfo;
};

O.esri.Tiles.TilingScheme.prototype = {
    getCellIdFromXy: function (x, y, level) {
        var col = Math.floor((x - this.tileInfo.origin.x) / (this.tileInfo.cols * this.tileInfo.lods[level].resolution));
        var row = Math.floor((this.tileInfo.origin.y - y) / (this.tileInfo.rows * this.tileInfo.lods[level].resolution));
        return [col, row];
    },

    getCellPolygonFromCellId: function (cellId, level) {
        var col1 = cellId[0];
        var row1 = cellId[1];
        var col2 = col1 + 1;
        var row2 = row1 + 1;

        var x1 = this.tileInfo.origin.x + (col1 * this.tileInfo.cols * this.tileInfo.lods[level].resolution);
        var y1 = this.tileInfo.origin.y - (row1 * this.tileInfo.rows * this.tileInfo.lods[level].resolution);
        var x2 = this.tileInfo.origin.x + (col2 * this.tileInfo.cols * this.tileInfo.lods[level].resolution);
        var y2 = this.tileInfo.origin.y - (row2 * this.tileInfo.rows * this.tileInfo.lods[level].resolution);

        var polygon;
        var spatialReference = this.tileInfo.spatialReference;

        require(["esri/geometry/Polygon"],function(Polygon){
            polygon = new Polygon(spatialReference);
        })

        polygon.addRing([
            [x1, y1], // clockwise
            [x2, y1],
            [x2, y2],
            [x1, y2],
            [x1, y1]
        ]);
        return polygon;
    },

    getAllCellIdsInExtent: function (extent, gridLevel) {
        var cellId0 = this.getCellIdFromXy(extent.xmin, extent.ymin, gridLevel);
        var cellId1 = this.getCellIdFromXy(extent.xmax, extent.ymax, gridLevel);

        var i, j;
        var i0 = Math.max(Math.min(cellId0[0], cellId1[0]), this.tileInfo.lods[gridLevel].startTileCol);
        var i1 = Math.min(Math.max(cellId0[0], cellId1[0]), this.tileInfo.lods[gridLevel].endTileCol);
        var j0 = Math.max(Math.min(cellId0[1], cellId1[1]), this.tileInfo.lods[gridLevel].startTileRow);
        var j1 = Math.min(Math.max(cellId0[1], cellId1[1]), this.tileInfo.lods[gridLevel].endTileRow);

        var cellIds = [];

        for (i = i0; i <= i1; i++) {
            for (j = j0; j <= j1; j++) {
                cellIds.push([i, j]);
            }
        }
        return cellIds;
    }
};

