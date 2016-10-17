

module.exports = function(grunt) {
    grunt.initConfig({
        pkg: grunt.file.readJSON('package.json'),
        watch: {
            js: {
                files: [
                    'Gruntfile.js',
                    'lib/*.js',
                    'lib/edit/*.js',
                    'lib/tiles/*.js',
                    'lib/tpk/*.js'
                ],

                tasks: ['jshint','concat', 'uglify'],
                options: {
                    spawn: false
                }
            }
        },
        jshint: {
            options: {
                jshintrc: '.jshintrc'
            },
            files: {
                src: [
                    'Gruntfile.js',
                    'lib/edit/*.js',
                    'lib/tiles/base64utils.js',
                    'lib/tiles/OfflineTilesBasic.js',
                    'lib/tiles/OfflineTilesAdvanced.js',
                    'lib/tiles/OfflineTilesNS.js',
                    'lib/tiles/TilesCore.js',
                    'lib/tiles/TilesStore.js',
                    'lib/tiles/base64string.js',
                    'lib/stiles/lzString.js',
                    'lib/tiles/tilingScheme.js',
                    'lib/tpk/autoCenterMap.js',
                    'lib/tpk/OfflineTpkNS.js',
                    'lib/tpk/TPKLayer.js'
                ]
            }
        },
        concat: {
            options: {
                separator: '\n',
                banner: '/*! <%= pkg.name %> - v<%= pkg.version %> - <%= grunt.template.today("yyyy-mm-dd") %>\n' +
                    '*   Copyright (c) <%= grunt.template.today("yyyy") %> Environmental Systems Research Institute, Inc.\n' +
                    '*   Apache License' +
                    '*/\n'
            },
            /* All feature editing capabilities: adds, updates and deletes */
            editAdvanced: {
                src: [
                    'lib/edit/offlineJSOptions.js',
                    'lib/edit/OfflineEditAdvanced.js',
                    'lib/edit/OfflineEditNS.js',
                    'lib/edit/editsStore.js',
                    'lib/edit/attachmentsStore.js'
                ],
                dest: 'dist/offline-edit-advanced-src.js'
            },
            editBasic: {
                src: [
                    'lib/edit/offlineJSOptions.js',
                    'lib/edit/OfflineEditBasic.js',
                    'lib/edit/OfflineEditNS.js',
                    'lib/edit/editStorePOLS.js'
                ],
                dest: 'dist/offline-edit-basic-src.js'
            },
            /* Tiles basic is for use with WebMaps. Cannot be reloaded or restarted while offline */
            tilesBasic: {
                src: [
                    'lib/tiles/OfflineTilesBasic.js',
                    'lib/tiles/OfflineTilesNS.js',
                    'lib/tiles/base64utils.js',
                    'lib/tiles/base64string.js',
                    'lib/tiles/lzString.js',
                    'lib/tiles/FileSaver.js',
                    'lib/tiles/TilesCore.js',
                    'lib/tiles/TilesStore.js',
                    'lib/tiles/tilingScheme.js'
                ],
                dest: 'dist/offline-tiles-basic-src.js'
            },
            /* Tiles advanced is for use with tiled map services. Works with reload or restart while offline */
            tilesAdvanced: {
                src: [
                    'lib/tiles/OfflineTilesAdvanced.js',
                    'lib/tiles/OfflineTilesNS.js',
                    'lib/tiles/base64utils.js',
                    'lib/tiles/base64string.js',
                    'lib/tiles/lzString.js',
                    'lib/tiles/FileSaver.js',
                    'lib/tiles/TilesCore.js',
                    'lib/tiles/TilesStore.js',
                    'lib/tiles/tilingScheme.js'
                ],
                dest: 'dist/offline-tiles-advanced-src.js'
            },
            /* TPKLayer - for working directly with tile packages (.tpk files) */
            tpk: {
                src: [
                    'lib/tpk/TPKLayer.js',
                    'lib/tpk/OfflineTpkNS.js',
                    'lib/tiles/TilesStore.js',
                    'lib/tiles/lzString.js',
                    'lib/tiles/base64String.js',
                    'lib/tpk/zip.js',
                    'lib/tpk/autoCenterMap.js',
                    'lib/tpk/inflate.js',
                    'lib/tpk/xml2json.js'
                ],
                dest: 'dist/offline-tpk-src.js'
            }
        },

        uglify: {
            options: {
                compress: {
                    drop_console: true //remove console.log statements :)
                },
                beautify: {
                    semicolons: false //Required: prevents dojo parser errors w/ minified files in this project
                },
                preserveComments: /^!/,
                wrap: false
//                mangle: {
//                    except: ['O']
//                }
            },
            dist: {
                files: {
                    'dist/offline-edit-advanced-min.js': ['dist/offline-edit-advanced-src.js'],
                    'dist/offline-edit-basic-min.js': ['dist/offline-edit-basic-src.js'],
                    'dist/offline-tiles-basic-min.js': ['dist/offline-tiles-basic-src.js'],
                    'dist/offline-tiles-advanced-min.js': ['dist/offline-tiles-advanced-src.js'],
                    'dist/offline-tpk-min.js': ['dist/offline-tpk-src.js']
                }
            }
        }
    });

    // Load required modules
    grunt.loadNpmTasks('grunt-contrib-concat');
    grunt.loadNpmTasks('grunt-contrib-uglify');
    grunt.loadNpmTasks('grunt-contrib-compress');
    grunt.loadNpmTasks('grunt-contrib-watch');
    grunt.loadNpmTasks('grunt-contrib-jshint');

    grunt.registerTask('build',['jshint','concat','uglify']);
    grunt.registerTask('test',['jshint']);
};