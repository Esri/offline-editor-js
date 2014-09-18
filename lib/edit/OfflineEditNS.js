/**
 * Creates a namespace for the non-AMD libraries in this directory
 */


if(typeof O != "undefined"){
    O.esri.Edit = {}
}
else{
    O = {};
    O.esri = {
        Edit: {}
    }
}

"use strict";
