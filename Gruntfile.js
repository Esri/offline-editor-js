

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
            full: {
                src: [
                    'lib/*.js',
                    'lib/edit/*.js',
                    'lib/tiles/*.js',
                    'lib/tpk/*.js'
                ],
                dest: 'dist/offline-editor-src.js'
            },
            edit: {
                src: [
                    'lib/*.js',
                    'lib/edit/*.js'
                ],
                dest: 'dist/offline-editor-edit-src.js'
            },
            tiles: {
                src: [
                    'lib/*.js',
                    'lib/tiles/*.js'
                ],
                dest: 'dist/offline-editor-tiles-src.js'
            },
            tpk: {
                src: [
                    'lib/tpk/TPKLayer.js',
                    'lib/OfflineMaps.js',
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
                    'dist/offline-editor.js': ['dist/offline-editor-src.js'],
                    'dist/offline-editor-edit.js': ['dist/offline-editor-edit-src.js'],
                    'dist/offline-editor-tiles.js': ['dist/offline-editor-tiles-src.js'],
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