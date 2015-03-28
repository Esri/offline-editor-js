/* --------------------------------------------------------
 * Use this Grunt file as a tool for creating manifest files
 * the work with the ArcGIS API for JavaScript
 *
 * http://gruntjs.com/getting-started
 * http://gruntjs.com/sample-gruntfile
 * 
 * https://www.npmjs.org/package/grunt-manifest
 * 
 * --------------------------------------------------------
 */

'use strict';

module.exports = function(grunt) {
	grunt.initConfig({
		pkg: grunt.file.readJSON('package.json'),
		manifest: {
		    generate: {
		      options: {
		        basePath: "./",
		        cache: ["# <%= pkg.name %>, version: <%= pkg.version %>",
                        "#",
                        "# Home Page",
                        "<%= pkg.appHomePage %>",
                        "#",
						"# ArcGIS API for JavaScript files",
						"<%= pkg.optimizedApiURL %>/dojo.js",
                        "<%= pkg.optimizedApiURL %>/selector/acme.js",
                        "<%= pkg.optimizedApiURL %>/nls/dojo_en.js",
                        "<%= pkg.optimizedApiURL %>/resources/blank.gif",
                        "#",
                        "#<%= pkg.arcGISBaseURL %>/esri/dijit/images/popup-sprite.png",
                        "<%= pkg.arcGISBaseURL %>/esri/dijit/images/attribute_inspector_sprite.png",
						"#<%= pkg.arcGISBaseURL %>/dojo/resources/blank.gif",
						"<%= pkg.arcGISBaseURL %>/esri/dijit/images/ajax-loader.gif",
                        "<%= pkg.arcGISBaseURL %>/esri/images/map/logo-sm.png",
                        "<%= pkg.arcGISBaseURL %>/esri/images/map/logo-med.png",
                        "<%= pkg.arcGISBaseURL %>/esri/css/esri.css",
                        "<%= pkg.arcGISBaseURL %>/dijit/themes/claro/claro.css",
                        "<%= pkg.arcGISBaseURL %>/esri/nls/jsapi_en-us.js",
                        "#",
						"//services.arcgisonline.com/ArcGIS/rest/info?f=json",
                        "//static.arcgis.com/attribution/World_Topo_Map?f=json",
                        "//server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer?f=pjson",
						"//services.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer?f=json&callback=dojo.io.script.jsonp_dojoIoScript1._jsonpCallback",
                        "#",
                        "# Bootstrap files",
                        "//maxcdn.bootstrapcdn.com/bootstrap/3.3.4/css/bootstrap.min.css",
                        "//esri.github.io/bootstrap-map-js/src/css/bootstrapmap.css",
                        "//maxcdn.bootstrapcdn.com/bootstrap/3.3.4/js/bootstrap.min.js",
                        "//esri.github.io/bootstrap-map-js/src/js/bootstrapmap.js",
                        "//code.jquery.com/jquery-2.1.3.min.js",
                        "",
                        "# Custom feature service",
                        "//services1.arcgis.com/M8KJPUwAXP8jhtnM/arcgis/rest/services/Denver_Bus_Stops/FeatureServer/0?f=json",
                        "#",
						"# required local html",
						"# /xyz/style.css",
						"# /img/1.png"],
		        network: [
                    "*"
                ],
		        /*fallback: ["/ /offline.html"],*/
		        exclude: ["js/jquery.min.js", "vendor/**.sass", "vendor/**/src"],
		        /*preferOnline: true,*/
		        verbose: true,
		        timestamp: true
		      },
              /* Include all library files that you need here! */
		      src: [
                    "../samples/images/*.png",
                    "../samples/css/*.css",
                    "../vendor/IndexedDBShim/dist/*.js",
                    "../vendor/offline/offline.min.js",
                    "../lib/tiles/*.png",
                    "../lib/tiles/*.psd",
                    "../utils/*.js",
                    "../dist/offline-edit-src.js",
                    "../dist/offline-tiles-advanced-src.js",
                    "../dist/offline-tiles-basic-src.js",
                    "../samples/widgets/modal/css/*.css",
                    "../samples/widgets/modal/template/*.html",
                    "../samples/widgets/modal/popup.js",
                    "<%= pkg.optimizedApiURL %>/nls/*.js",
                    "<%= pkg.optimizedApiURL %>/resources/*.gif",
                    "<%= pkg.optimizedApiURL %>/dojo.js",
                    "<%= pkg.optimizedApiURL %>/selector/*.js"
                    /*
                    "images/*",
                    "css/*.css"
                    */
		      ],
		      dest: "<%= pkg.manifestName %>"
		    }
		  }
	});
	

	grunt.loadNpmTasks('grunt-manifest');
	
	grunt.registerTask('buildManifest', ['manifest:generate'])
	grunt.registerTask('default', ['buildManifest'])
};