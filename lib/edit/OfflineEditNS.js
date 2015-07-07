/**
 * Creates a namespace for the non-AMD libraries in this directory
 */
/*jshint -W020 */
if(typeof O != "undefined"){
    O.esri.Edit = {};
}
else{
    O = {};
    O.esri = {
        Edit: {}
    };
}