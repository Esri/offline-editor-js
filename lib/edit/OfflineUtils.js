"use strict"

define(["edit/editsStore"],function(editsStore)
{
    return function OfflineUtils()
    {
        /**
         * Measures the size of the graphic's geometry and attributes.
         * This is a very fast method that only provides a basic estimation.
         * @param graphic
         * @returns {number}
         */
        // jabadia: probably won't be needed
        this.apprxGraphicSize = function(graphic) {
            var g = editsStore._serialize(graphic);
            return ((g.length *2)/1024/1024).round(4);
        }
    }
});
