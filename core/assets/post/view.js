Spirit.Views.Post =  Backbone.View.extend({

    el : '.spirit-bar', 

    events : {
      'click a.save'    : 'save' ,
      'click a.delete'  : 'delete',
      'click a.publish' : 'publish',
    },

    initialize : function(options) {
      _.bindAll(this, 'save', 'delete', 'publish', 'notify' ) 
      this.model.on( 'sync', this.notify )
      this.model.on( 'destroy', this.navigate )
      this.$form = $('form.post')
    },

    // [TODO] use a router instead?
    navigate : function() {
      window.location = '/'
    },

    notify : function( model, response ) {
      Spirit.Notify.message( 'post saved' )
    },

    save : function(e) {
      e.preventDefault()
      var formdata = this.$form.serializeJSON()
      this.model.save( formdata , { wait: true } ) 
    },

    delete: function(e) {
      this.model.destroy({ wait: true }) 
    },

    publish: function(e) {
      e.preventDefault()   
      this.$form.find('.status').val( 'published' )
      this.save()
    }

})
