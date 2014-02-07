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

    el : 'form', 

    events : {
      'submit' : 'add' ,
      'click a.delete' : 'remove'
    },

    initialize : function(options) {
      _.bindAll(this, 'add', 'remove' ) 
    },

    add : function(e) {

      e.preventDefault()
      var formdata = this.$el.serializeJSON()
      this.model.save( formdata , { wait: true } ) 

    },

    remove: function(e) {
      e.preventDefault()
      this.model.destroy() 
    }

  })


  var post = new Post({ _id : postdata._id })
    , postsview = new AddPostView({ model : post })

})(jQuery)
