var OfflineUtils = function(){

    this._hydrate = new Hydrate();

    /**
     * Measures the size of the graphic's geometry and attributes.
     * This is a very fast method that only provides a basic estimation.
     * @param graphic
     * @returns {number}
     */
    this.apprxGraphicSize = function(graphic) {
        var g = this._serializeGraphic(graphic);

        return ((g.length *2)/1024/1024).round(4);
    }

    this._serializeGraphic = function(/* Graphic */ graphic){
        var json  = new this._jsonGraphicsObject();
        json.geometry = JSON.stringify(graphic.geometry)

        if(graphic.hasOwnProperty("attributes")){
            if(graphic.attributes != null){
                var q = this._hydrate.stringify(graphic.attributes);
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