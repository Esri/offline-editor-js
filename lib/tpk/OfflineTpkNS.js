/**
 * Creates a namespace for the non-AMD libraries in this directory
 */

(function(){

    if(typeof O != "undefined"){
        O.esri.TPK = {}
    }
    else{
        O = {};
        O.esri = {
            VERSION: '2.0',
            TPK: {},
            Tiles: {}
        }
    }

}())

"use strict";
