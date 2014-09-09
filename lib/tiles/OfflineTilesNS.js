/**
 * Creates a namespace for the non-AMD libraries in this directory
 */

if(typeof O != "undefined"){
    O.esri.Tiles = {}
}
else{
    O = {};
    O.esri = {
        Tiles: {}
    }
}

"use strict";