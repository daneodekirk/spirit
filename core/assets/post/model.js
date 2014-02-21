Spirit.Models.Post = Backbone.Model.extend({

    idAttribute : '_id',
    
    urlRoot: '/post',

    validate: function(attrs) {
      // [TODO] validation needed
    },
    
    initialize: function( options ) {
      this.fetch()
      this.on('invalid', this.invalid )
    }, 

    invalid : function( model, error ) {
      alert(error) 
    },

})
