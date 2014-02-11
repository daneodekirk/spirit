(function($){

  var Post = Backbone.Model.extend({

    idAttribute : '_id',
    
    urlRoot: '/post',

    validate: function(attrs) {
      //return 'you need a title';
    },
    
    initialize: function( options ) {
      this.fetch()
      this.on('invalid', this.invalid )
    }, 

    invalid : function( model, error ) {
      alert(error) 
    }

  })

  var AddPostView = Backbone.View.extend({

    el : '.spirit-bar', 

    events : {
      'click a.save'    : 'save' ,
      'click a.delete'  : 'delete',
      'click a.publish' : 'publish',
    },

    initialize : function(options) {
      _.bindAll(this, 'save', 'delete', 'publish' ) 
      this.$form = $('form.post')
    },

    save : function(e) {
      e.preventDefault()
      var formdata = this.$form.serializeJSON()
      this.model.save( formdata , { wait: true } ) 
    },

    delete: function(e) {
      this.model.destroy() 
    },

    publish: function(e) {
      e.preventDefault()   
      this.$form.find('.status').val( 'published' )
      this.save()
    }

  })


  var post = new Post({ _id : postdata._id })
    , postsview = new AddPostView({ model : post })

})(jQuery)
