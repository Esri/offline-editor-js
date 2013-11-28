"use strict";

var webmercator_scheme;

require(["esri/geometry/webMercatorUtils"], function(webMercatorUtils)
{
  webmercator_scheme =  
  {
    long2tile : function(lon,gridLevel) { return (Math.floor((lon+180)/360*Math.pow(2,gridLevel))); },
    lat2tile : function(lat,gridLevel)  { return (Math.floor((1-Math.log(Math.tan(lat*Math.PI/180) + 1/Math.cos(lat*Math.PI/180))/Math.PI)/2 *Math.pow(2,gridLevel))); },
    tile2long : function(x,gridLevel) {   return (x/Math.pow(2,gridLevel)*360-180);   },
    tile2lat : function(y,gridLevel) {
      var n=Math.PI-2*Math.PI*y/Math.pow(2,gridLevel);
      return (180/Math.PI*Math.atan(0.5*(Math.exp(n)-Math.exp(-n))));
    },
    
    get_cell_id_from_lnglat : function(lng,lat,gridLevel)
    {
      var tilex1 = Math.floor(this.long2tile(lng,gridLevel));
      var tiley1 = Math.floor(this.lat2tile(lat,gridLevel));
      return [tilex1, tiley1];
    },

    get_all_cell_ids_in_extent : function(extent, gridLevel)
    {
      var extentLatLng = webMercatorUtils.webMercatorToGeographic(extent);
      var lng0 = extentLatLng.xmin;
      var lat0 = extentLatLng.ymin;
      var lng1 = extentLatLng.xmax;
      var lat1 = extentLatLng.ymax;

      var cell_id0 = this.get_cell_id_from_lnglat(lng0, lat0, gridLevel);
      var cell_id1 = this.get_cell_id_from_lnglat(lng1, lat1, gridLevel);

      var i,j;
      var i0 = Math.min(cell_id0[0], cell_id1[0]);
      var i1 = Math.max(cell_id0[0], cell_id1[0]);
      var j0 = Math.min(cell_id0[1], cell_id1[1]);
      var j1 = Math.max(cell_id0[1], cell_id1[1]);

      var cell_ids = [];

      for(i=i0; i<=i1; i++)
        for(j=j0; j<=j1; j++)
        {
          cell_ids.push([i,j]);
        }

      return cell_ids;
    },

    get_cell_polygon_from_cell_id : function(cellid,gridLevel)
    {
      var tilex1 = cellid[0];
      var tiley1 = cellid[1];
      var tilex2 = tilex1+1;
      var tiley2 = tiley1+1;

      var lng1 = this.tile2long(tilex1, gridLevel);
      var lat1 = this.tile2lat(tiley1, gridLevel);
      var lng2 = this.tile2long(tilex2, gridLevel);
      var lat2 = this.tile2lat(tiley2, gridLevel);

      var srs = new SpatialReference({wkid:4326});
      var polygon = new geometry.Polygon(srs);
      polygon.addRing([
        [lng1,lat1],  // clockwise
        [lng2,lat1],
        [lng2,lat2],
        [lng1,lat2],
        [lng1,lat1],
        ])
      return polygon;
    }
  }

}); // require()


var TilingScheme = function(layer,geometry)
{
  this.tileInfo = layer.tileInfo;
  this.geometry = geometry;
}

TilingScheme.prototype = 
{
  getCellIdFromXy: function(x,y,level)
  {
    var row = Math.floor((this.tileInfo.origin.y-y) / (this.tileInfo.rows*this.tileInfo.lods[level].resolution));
    var col = Math.floor((x-this.tileInfo.origin.x) / (this.tileInfo.cols*this.tileInfo.lods[level].resolution));
    return [col,row];
  },

  getCellPolygonFromCellId: function(cellid,level)
  {
      var col1 = cellid[0];
      var row1 = cellid[1];
      var col2 = col1+1;
      var row2 = row1+1;

      var x1 = this.tileInfo.origin.x + (col1 * this.tileInfo.cols * this.tileInfo.lods[level].resolution);
      var y1 = this.tileInfo.origin.y - (row1 * this.tileInfo.rows * this.tileInfo.lods[level].resolution);
      var x2 = this.tileInfo.origin.x + (col2 * this.tileInfo.cols * this.tileInfo.lods[level].resolution);
      var y2 = this.tileInfo.origin.y - (row2 * this.tileInfo.rows * this.tileInfo.lods[level].resolution);

      var polygon = new this.geometry.Polygon(this.tileInfo.spatialReference);
      polygon.addRing([
        [x1,y1],  // clockwise
        [x2,y1],
        [x2,y2],
        [x1,y2],
        [x1,y1],
        ])
      return polygon;
  },

  getAllCellIdsInExtent : function(extent, gridLevel)
  {
    var cellId0 = this.getCellIdFromXy(extent.xmin, extent.ymin, gridLevel);
    var cellId1 = this.getCellIdFromXy(extent.xmax, extent.ymax, gridLevel);

    var i,j;
    var i0 = Math.max(Math.min(cellId0[0], cellId1[0]), this.tileInfo.lods[gridLevel].startTileCol);
    var i1 = Math.min(Math.max(cellId0[0], cellId1[0]), this.tileInfo.lods[gridLevel].endTileCol);
    var j0 = Math.max(Math.min(cellId0[1], cellId1[1]), this.tileInfo.lods[gridLevel].startTileRow);
    var j1 = Math.min(Math.max(cellId0[1], cellId1[1]), this.tileInfo.lods[gridLevel].endTileRow);

    var cellIds = [];

    for(i=i0; i<=i1; i++)
      for(j=j0; j<=j1; j++)
      {
        cellIds.push([i,j]);
      }

    return cellIds;
  },
}

