(function($){

  var Post = Backbone.Model.extend({

    idAttribute : '_id',
    
    urlRoot: '/post',

    validate: function(attrs) {
      console.log('validating ' + JSON.stringify( attrs ) )
    },
    
    initialize: function( options ) {
      this.fetch()
    }

  })

  var AddPostView = Backbone.View.extend({

    el : '.admin-bar', 

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
