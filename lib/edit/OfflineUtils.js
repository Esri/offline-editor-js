var OfflineUtils = function(){

    /**
     * Returns a date string of month/day/year hours:minutes:seconds
     * @returns {string}
     */
    this.getDateMDYHMS = function(){
        var date = new Date();
        var hh = date.getHours();
        var mm = date.getMinutes();
        var ss = date.getSeconds();

        hh = hh < 10 ? "0" + hh : hh;
        mm = mm < 10 ? "0" + mm : mm;
        ss = ss < 10 ? "0" + ss : ss;

        var dateHMS = (date.getMonth()+1) + "/"+ date.getDate()
            + "/" + date.getFullYear() + " "
            + hh + ":"
            + mm + ":"
            + ss;

        return dateHMS;
    }

    /**
     * Measures the size of the graphic's geometry and attributes.
     * This is a very fast method that only provides a basic estimation.
     * @param graphic
     * @returns {number}
     */
    this.apprxGraphicSize = function(graphic) {
        var g = this._serializeGraphicUtil(graphic);

        return ((g.length *2)/1024/1024).round(4);
    }

    this._serializeGraphicUtil = function(/* Graphic */ graphic){
        var json  = new this._jsonGraphicsObject();
        json.geometry = JSON.stringify(graphic.geometry)

        if(graphic.hasOwnProperty("attributes")){
            if(graphic.attributes != null){
                var q = JSON.stringify(graphic.attributes);
                json.attributes = q;
            }
        }

        return JSON.stringify(json);
    }

    /**
     * Model for storing serialized graphics
     * @private
     */
    this._jsonGraphicsObject = function(){
        this.geometry = null;
        this.attributes = null;
    }
}