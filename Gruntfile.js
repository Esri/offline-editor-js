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
						"# ArcGIS API for JavaScript files",
						"<%= pkg.baseURL %>/",
						"<%= pkg.baseURL %>/init.js",
						"<%= pkg.baseURL %>/js/dojo/dojox/gfx/svg.js",
						"<%= pkg.baseURL %>/js/dojo/dojo/resources/blank.gif",
						"<%= pkg.baseURL %>/js/esri/css/esri.css",
						"<%= pkg.baseURL %>/js/esri/nls/jsapi_en-us.js",
						"<%= pkg.baseURL %>/js/esri/images/map/logo-sm.png",
						"<%= pkg.baseURL %>/js/esri/images/map/logo-med.png",
						"<%= pkg.baseURL %>/js/esri/dijit/images/ajax-loader.gif",
						"<%= pkg.baseURL %>/js/esri/dijit/images/popup.png",
						"http://services.arcgisonline.com/ArcGIS/rest/info?f=json",
						"http://services.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer?f=json&callback=dojo.io.script.jsonp_dojoIoScript1._jsonpCallback",
						"# required custom libs",
						"js/app.js", 
						"css/style.css"],
		        network: ["http://*", "https://*"],
		        /*fallback: ["/ /offline.html"],*/
		        exclude: ["js/jquery.min.js", "vendor/**.sass", "vendor/**/src"],
		        /*preferOnline: true,*/
		        verbose: true,
		        timestamp: true
		      },
		      src: [
		            "*.html",
		          /*"js/*.min.js",*/
				  "vendor/IndexedDBShim/dist/*.min.js",
				  "lib/tiles/*.js",
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