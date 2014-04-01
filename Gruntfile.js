/* --------------------------------------------------------
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
                        "# Home Page",
                        "samples/appcache-tiles.html",
						"# ArcGIS API for JavaScript files",
						"<%= pkg.optimizedApiURL %>/dojo/dojo.js",
                        "<%= pkg.optimizedApiURL %>/dojo/main.js",
                        "<%= pkg.optimizedApiURL %>/dojox/gfx/svg.js",
                        "<%= pkg.optimizedApiURL %>/dojo/_base/browser.js",
                        "<%= pkg.optimizedApiURL %>/dojox/gfx/shape.js",
                        "<%= pkg.optimizedApiURL %>/dojo/nls/dojo_en-us.js",
                        "<%= pkg.optimizedApiURL %>/dojox/gfx/shape.js",
                        "<%= pkg.optimizedApiURL %>/dojox/gfx/path.js",
                        "<%= pkg.optimizedApiURL %>/dojo/request.js",
                        "<%= pkg.optimizedApiURL %>/dojo/_base/NodeList.js",
                        "<%= pkg.optimizedApiURL %>/dojo/selector/acme.js",
                        "<%= pkg.optimizedApiURL %>/dojo/_base/loader.js",
                        "<%= pkg.optimizedApiURL %>/dojo/request/default.js",
                        "<%= pkg.optimizedApiURL %>/esri/geometry.js",
                        "<%= pkg.optimizedApiURL %>/esri/geometry/geodesicUtils.js",
                        "<%= pkg.optimizedApiURL %>/esri/geometry/normalizeUtils.js",
                        "<%= pkg.optimizedApiURL %>/esri/dijit/Attribution.js",
                        "<%= pkg.optimizedApiURL %>/esri/units.js",
                        "<%= pkg.optimizedApiURL %>/dojo/fx/Toggler.js",
						"<%= pkg.arcGISBaseURL %>/js/dojo/dojox/gfx/svg.js",
						"<%= pkg.arcGISBaseURL %>/js/dojo/dojo/resources/blank.gif",
						"<%= pkg.arcGISBaseURL %>/js/esri/dijit/images/ajax-loader.gif",
                        "<%= pkg.arcGISBaseURL %>/js/esri/images/map/logo-sm.png",
                        "<%= pkg.arcGISBaseURL %>/js/esri/images/map/logo-med.png",
                        "<%= pkg.arcGISBaseURL %>/js/esri/css/esri.css",
                        "<%= pkg.arcGISBaseURL %>/js/esri/nls/jsapi_en-us.js",
						"//services.arcgisonline.com/ArcGIS/rest/info?f=json",
                        "//static.arcgis.com/attribution/World_Topo_Map?f=json",
						"//services.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer?f=json&callback=dojo.io.script.jsonp_dojoIoScript1._jsonpCallback",
                        "# required for web maps",
                        "<%= pkg.arcGISBaseURL %>/js/esri/dijit/images/ajax-loader.gif",
                        "<%= pkg.arcGISBaseURL %>/js/esri/dijit/images/popup.png",
						"# required custom libs",
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
		      src: [
		            "*.html",
		          /*"js/*.min.js",*/
                  "samples/images/*.png",
				  "vendor/IndexedDBShim/dist/*.min.js",
                  "vendor/offline/offline.min.js",
				  "lib/tiles/*.js",
                  "utils/*.js"
                  /*
				  "images/*",
		          "css/*.css"
		          */
		      ],
		      dest: "manifest.appcache"
		    }
		  }
	});
	

	grunt.loadNpmTasks('grunt-manifest');
	
	grunt.registerTask('buildManifest', ['manifest:generate'])
	grunt.registerTask('default', ['buildManifest'])
};