/**
 * This library assists with autoCenter the map upon orientation change
 * IMPORTANT: There are Esri dependencies in this library including
 * esri.Geometry.Point, esri.SpatialReference and Esri.Map.
 * The fact that these dependencies exist is implied that they were
 * loaded via some other means and made globally available.
 * Sometimes this happens by default, as is true in this case.
 * @param map
 * @param delay
 */
O.esri.TPK.autoCenterMap = function(/* Map */ map,/* int */ delay){

    /**
     * Activates the orientation listener and listens for native events.
     */
    function _setOrientationListener(delay){
        var supportsOrientationChange = "onorientationchange" in window,
            orientationEvent = supportsOrientationChange ? "orientationchange" : "resize";

        window.addEventListener(orientationEvent, _debounceMap(function(){
            _centerMap();
        },delay))
    }

    /**
     * Center the map based on locations pulled from local storage
     * @param context
     * @param delay
     * @private
     */
    function _centerMap(){
        var locationStr = _getCenterPt().split(",");
        var wkid = map.spatialReference.wkid;
        var mapPt = null;

        if(wkid == 4326){
            mapPt = new esri.geometry.Point(locationStr[1],locationStr[0]);
        }
        else if(wkid = 102100){
            mapPt = new esri.geometry.Point(locationStr[0],locationStr[1], new esri.SpatialReference({ wkid: wkid }));
        }
        map.centerAt(mapPt);
    }

    /**
     * Minimize the number of times window readjustment fires a function
     * http://davidwalsh.name/javascript-debounce-function
     * @param func
     * @param wait
     * @param immediate
     * @returns {Function}
     */
    function _debounceMap(func, wait, immediate) {
        var timeout;
        return function() {
            var context = this, args = arguments;
            clearTimeout(timeout);
            timeout = setTimeout(function() {
                timeout = null;
                if (!immediate) func.apply(context, args);
            }, wait);
            if (immediate && !timeout) func.apply(context, args);
        };
    }

    /**
     * Automatically sets new center point in local storage.
     */
    function _setPanListener(){
        map.on("pan-end",function(){
            var center = map.extent.getCenter();
            _setCenterPt(center.x,center.y,map.spatialReference.wkid);
        })
    }

    /**
     * Automatically sets new center point and zoom level in
     * local storage.
     */
    function _setZoomListener(){
        map.on("zoom-end",function(){
            var center = map.extent.getCenter();
            _setCenterPt(center.x,center.y,map.spatialReference.wkid);
            map.setZoom(map.getZoom());
        }.bind(self))
    }

    /**
     * Uses localStorage to save a location.
     * @param lat
     * @param lon
     * @param spatialReference
     */
    function _setCenterPt(lat,lon,spatialReference){
        localStorage.setItem("_centerPtX", lat);
        localStorage.setItem("_centerPtY", lon);
        localStorage.setItem("_spatialReference", spatialReference);
    }

    /**
     * Pulls a saved location from localStorage
     * Requires that setCenterPt() has been set.
     * @returns String x,y,spatialReference
     */
    function _getCenterPt(){
        var value = null;

        try{
            value = localStorage.getItem("_centerPtX") + "," + localStorage.getItem("_centerPtY") + "," +
                localStorage.getItem("_spatialReference");
        }
        catch(err)
        {
            console.log("getCenterFromLocalStorage: " + err.message);
        }

        return value;
    }

    this.init = function(){
        _setPanListener();
        _setZoomListener();
        _setOrientationListener(delay);
        var centerPt = map.extent.getCenter();
        _setCenterPt(centerPt.x,centerPt.y,map.spatialReference.wkid);
    }
}