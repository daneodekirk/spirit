module.exports = function(grunt) {

  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),
    concat: {
      options: {
        separator: ';',
      },
      client: {
        libraries: [
          'assets/js/lib/jquery.js',
          'assets/js/lib/underscore.js',
          'assets/js/lib/backbone.js',
        ],
        custom: [
        ],
        src: [ '<%= concat.client.libraries %>', '<%= concat.client.custom %>' ],
        dest: 'assets/js/spirit.dev.js'
      },
      admin: {
        libraries: [
          'assets/js/lib/jquery.js',
          'assets/js/admin/jquery.filedrop.js',
          'assets/js/admin/medium-editor.js',
          'assets/js/admin/medium-editor-insert-plugin.js',
          'assets/js/admin/medium-editor-insert-images.js',
          'assets/js/admin/moment.js',
          'assets/js/admin/chrono.min.js',
        ],
        custom: [
          'assets/js/admin/dropspots.js',
          'assets/js/admin/edit-post.js',
          'assets/js/admin/edit-post-date.js',
        ],
        src: [ '<%= concat.admin.libraries %>', '<%= concat.admin.custom %>' ],
        dest: 'assets/js/admin.dev.js'
      }

    },
    uglify: {
      options: {
        banner: '/*! <%= pkg.name %> <%= grunt.template.today() %> */\n'
      },
      dist: {
        files: {
          'assets/js/spirit.js': ['<%= concat.client.dest %>'],
          'assets/js/admin.js': ['<%= concat.admin.dest %>']
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
          'assets/css/style.css': 'assets/less/style.less',
          'assets/css/admin.css': 'assets/less/admin.less'
        }
		  },
      development: {
        files: {
          'assets/css/style.dev.css': 'assets/less/style.less',
          'assets/css/admin.dev.css': 'assets/less/admin.less'
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
