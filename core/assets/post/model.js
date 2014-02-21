Spirit.Models.Post = Backbone.Model.extend({

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
    },

})
