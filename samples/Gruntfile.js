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
						"<%= pkg.optimizedApiURL %>/dojo/dojo.js",
                        "<%= pkg.optimizedApiURL %>/dojo/nls/dojo_en-us.js",
                        "<%= pkg.optimizedApiURL %>/dojo/selector/acme.js",
                        "#",
                        "<%= pkg.arcGISBaseURL %>/js/esri/dijit/images/popup-sprite.png",
                        "<%= pkg.arcGISBaseURL %>/js/esri/dijit/images/attribute_inspector_sprite.png",
						"<%= pkg.arcGISBaseURL %>/js/dojo/dojox/gfx/svg.js",
						"<%= pkg.arcGISBaseURL %>/js/dojo/dojo/resources/blank.gif",
						"<%= pkg.arcGISBaseURL %>/js/esri/dijit/images/ajax-loader.gif",
                        "<%= pkg.arcGISBaseURL %>/js/esri/images/map/logo-sm.png",
                        "<%= pkg.arcGISBaseURL %>/js/esri/images/map/logo-med.png",
                        "<%= pkg.arcGISBaseURL %>/js/esri/css/esri.css",
                        "<%= pkg.arcGISBaseURL %>/js/dojo/dijit/themes/claro/claro.css",
                        "<%= pkg.arcGISBaseURL %>/js/esri/nls/jsapi_en-us.js",
                        "#",
						"//services.arcgisonline.com/ArcGIS/rest/info?f=json",
                        "//static.arcgis.com/attribution/World_Topo_Map?f=json",
						"//services.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer?f=json&callback=dojo.io.script.jsonp_dojoIoScript1._jsonpCallback",
                        "#",
                        "# required for web maps",
                        "<%= pkg.arcGISBaseURL %>/js/esri/dijit/images/ajax-loader.gif",
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
		      src: [
                    "../samples/images/*.png",
                    "../samples/css/*.css",
                    "../vendor/IndexedDBShim/dist/*.js",
                    "../vendor/offline/offline.min.js",
                    "../lib/tiles/*.js",
                    "../lib/tiles/*.png",
                    "../lib/tiles/*.psd",
                    "../lib/edit/*.js",
                    "../utils/*.js"
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