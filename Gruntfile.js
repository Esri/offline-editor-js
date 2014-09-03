

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

                tasks: ['concat', 'uglify'],
                options: {
                    spawn: false
                }
            }
        },
        jshint: {
            options: {
                jshintrc: '.jshintrc'
            },
            all: {
                src: [
                    'Gruntfile.js',
                    'lib/*js',
                    'lib/edit/*.js',
                    'lib/tiles/*.js',
                    'lib/tpk/*.js'
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
            edit: {
                src: [
                    'lib/*.js',
                    'lib/edit/offlineFeaturesManager.js',
                    'lib/edit/editsStore.js',
                    'lib/edit/attachmentsStore.js'
                ],
                dest: 'dist/offline-editor-edit-src.js'
            },
            /* Tiles basic is for use with WebMaps. Cannot be reloaded or restarted while offline */
            tilesBasic: {
                src: [
                    'lib/*.js',
                    'lib/tiles/base64utils.js',
                    'lib/tiles/FileSaver.js',
                    'lib/tiles/offlineTilesEnabler.js',
                    'lib/tiles/TilesCore.js',
                    'lib/tiles/TilesStore.js',
                    'lib/tiles/tilingScheme.js'
                ],
                dest: 'dist/offline-editor-tiles-basic-src.js'
            },
            /* Tiles advanced is for use with tiled map services. Works with reload or restart while offline */
            tilesAdvanced: {
                src: [
                    'lib/*.js',
                    'lib/tiles/base64utils.js',
                    'lib/tiles/FileSaver.js',
                    'lib/tiles/offlineTilesEnablerLayer.js',
                    'lib/tiles/TilesCore.js',
                    'lib/tiles/TilesStore.js',
                    'lib/tiles/tilingScheme.js'
                ],
                dest: 'dist/offline-editor-tiles-advanced-src.js'
            },
            tpk: {
                src: [
                    'lib/tpk/TPKLayer.js',
                    'lib/OfflineMapsNS.js',
                    'lib/tiles/TilesStore.js',
                    'lib/tpk/zip.js',
                    'lib/tpk/autoCenterMap.js',
                    'lib/tpk/inflate.js',
                    'lib/tpk/xml2json.js'
                ],
                dest: 'dist/offline-editor-tpk-src.js'
            }
        },

        uglify: {
            options: {
                compress: {
                    drop_console: true //remove console.log statements :)
                },
                wrap: false
//                mangle: {
//                    except: ['O']
//                }
            },
            dist: {
                files: {
                    'dist/offline-editor-edit.js': ['dist/offline-editor-edit-src.js'],
                    'dist/offline-editor-tiles-basic-min.js': ['dist/offline-editor-tiles-basic-src.js'],
                    'dist/offline-editor-tiles-advanced-min.js': ['dist/offline-editor-tiles-advanced-src.js'],
                    'dist/offline-editor-tpk.js': ['dist/offline-editor-tpk-src.js']
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

    grunt.registerTask('build',['concat','uglify']);
    grunt.registerTask('buildAll',['jshint','concat','uglify']);
}