/**
 * Creates a namespace for the non-AMD libraries in this directory
 */


if(typeof O != "undefined"){
    O.esri.TPK = {}
}
else{
    O = {};
    O.esri = {
        TPK: {},
        Tiles: {}
    }
}

"use strict";
