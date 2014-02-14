module.exports = function(grunt) {

  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),
    concat: {
      options: {
        separator: ';',
      },
      client: {
        libraries: [
          'core/assets/libraries/jquery.js',
          'core/assets/libraries/underscore.js',
          'core/assets/libraries/backbone.js',
        ],
        custom: [
        ],
        src: [ '<%= concat.client.libraries %>', '<%= concat.client.custom %>' ],
        dest: 'assets/spirit.dev.js'
      },
      admin: {
        libraries: [
          //'core/assets/libraries/jquery.js',
          'core/assets/libraries/jquery.filedrop.js',
          'core/assets/libraries/jquery.serializeJSON.js',
          'core/assets/libraries/editor/medium-editor.js',
          'core/assets/libraries/editor/medium-editor-insert-plugin.js',
          'core/assets/libraries/editor/medium-editor-insert-images.js',
          'core/assets/libraries/moment.js',
          'core/assets/libraries/chrono.min.js',
        ],
        custom: [
          'core/assets/uploader/uploader.js',
          'core/assets/post/post.js',
          'core/assets/editables/editables.js',
          'core/assets/libraries/jquery.contenteditable.js',
          'core/assets/dates/dates.js',
          'core/assets/notify/notify.js',
        ],
        src: [ '<%= concat.admin.libraries %>', '<%= concat.admin.custom %>' ],
        dest: 'assets/admin.dev.js'
      }

    },
    uglify: {
      options: {
        //banner: '/*! <%= pkg.name %> <%= grunt.template.today() %> */\n'
      },
      dist: {
        files: {
          'assets/spirit.js': ['<%= concat.client.dest %>'],
          'assets/admin.js': ['<%= concat.admin.dest %>']
        }
      }
    },
    jshint: {
      files: [ 'Gruntfile.js', '<%= concat.client.custom %>', '<%= concat.admin.custom %>' ],
      options: {
        asi: true,
        smarttabs: true,
        laxcomma: true,
        lastsemic: true,
        // options here to override JSHint defaults
        globals: {
          jQuery: true,
          console: true,
          module: true,
          document: true
        }
      }
    },
    notify: {
      watch: {
        options: {
          title: 'Task Complete',
          message: 'JS uglified successfully'
        }
      }
    },
    less: {
      production: {
        options: {
          cleancss: true
        },
        files: {
          'assets/spirit.css': 'core/assets/spirit.less',
          'assets/admin.css': 'core/assets/admin.less'
        }
		  },
      development: {
        files: {
          'assets/spirit.dev.css': 'core/assets/spirit.less',
          'assets/admin.dev.css': 'core/assets/admin.less'
        }
      }	
    },
    watch: {
      js: {
        files: [ '<%= concat.client.src %>', '<%= concat.admin.src %>' ],
        tasks: [ 'js' ]
      },
      css: {
        files: [ 'core/assets/*.less', 'core/assets/*/*.less', 'core/assets/*/*/*.less' ],
        tasks: [ 'css' ]
      }
    }
  });

  grunt.loadNpmTasks('grunt-notify');
  grunt.loadNpmTasks('grunt-contrib-less');
  grunt.loadNpmTasks('grunt-contrib-jshint');
  grunt.loadNpmTasks('grunt-contrib-concat');
  grunt.loadNpmTasks('grunt-contrib-uglify');
  grunt.loadNpmTasks('grunt-contrib-watch');

  grunt.registerTask('default', ['jshint', 'concat', 'uglify', 'notify', 'less']);
  grunt.registerTask('js',  ['jshint', 'concat', 'notify' ]);
  grunt.registerTask('css', [ 'less', 'notify' ]);

};
