Spirit.Routers.Editables = Backbone.Router.extend({

  routes: {
    'post/' : 'view'
  },

  view : function() {
    _.map( $('.editable'), function( element ) {
      var view = new Spirit.Views.Editables({ el: element })
    })
  }

})
