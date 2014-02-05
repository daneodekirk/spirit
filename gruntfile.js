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
//          'assets/js/admin/medium-editor.js',
//          'assets/js/admin/medium-editor-insert-plugin.js',
//          'assets/js/admin/medium-editor-insert-images.js',
//          'assets/js/admin/moment.js',
//          'assets/js/admin/chrono.min.js',
        ],
        custom: [
          'core/assets/uploader/uploader.js',
//          'core/assets//edit-post.js',
//          'core/assets//edit-post-date.js',
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
        tasks: ['default']
      },
      css: {
        files: ['assets/less/*.less', 'assets/less/*/*.less'],
        tasks: ['less']
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

};
