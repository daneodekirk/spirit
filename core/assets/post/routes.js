Spirit.Router = Backbone.Router.extend({

  routes : {
    "post/:id" : "post"
  },

  initialize : function(options) {},

  post : function(id) {
    Spirit.live.post.model.set({_id:id})
  }

})
