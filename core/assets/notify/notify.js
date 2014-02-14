window.Spirit = Spirit || {}

Spirit.Notify = {

  View : Backbone.View.extend({

    defaults : {
      message : '',
      duration : 700,
      delay    : 500
    },

    el : '.notification',
  
    initialize : function( options ) {
      _.bindAll(this, 'animate', 'out', 'reset')
      this.options = _.defaults( options || {}, this.defaults );
  console.log(this.options)
      this.render()
    },

    render : function() {
      this.$el.html( this.options.message ) 
      this.animate()
    },

    animate : function() {
      this.$el.animate({ bottom: 0, opacity: 1 }, this.options.duration , this.out )
    },

    out: function() {
      this.$el.delay( this.options.delay ).animate({ bottom: 40, opacity: 0 }, this.options.duration , this.reset )
    },

    reset : function() {
      this.$el.css({ bottom:-30 })   
    }
  
  }),

  message : function(message) {
    var options = _.extend({}, {message : message })
    new this.View( options ) 
  }

}
