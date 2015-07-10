/**
 * Creates a namespace for the non-AMD libraries in this directory
 */


if(typeof O != "undefined"){
    O.esri.TPK = {};
}
else{
    O = {}; // jshint ignore:line
    O.esri = {
        TPK: {},
        Tiles: {}
    };
}

//"use strict";
