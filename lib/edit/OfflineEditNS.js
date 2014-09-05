/**
 * Creates a namespace for the non-AMD libraries in this directory
 */

(function(){

    if(typeof O != "undefined"){
        O.esri.Edit = {}
    }
    else{
        O = {};
        O.esri = {
            VERSION: '2.0',
            Edit: {}
        }
    }

}())

"use strict";
