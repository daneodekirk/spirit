(function($) {

  // [TODO] add events for dragstart 
  // [TODO] render div.drag-over with underscore
  var Dropspot = Backbone.View.extend({

    el  : '.splash.dropspot',
    input : 'input.dropspot',

    events : {
      'hover .drag-over' : 'overlay'     
    },

    settings: {
      url         : '/upload',
      maxfilesize : 3,
    },

    initialize: function( options ) {
      _.bindAll( this, 'finished' )
      _.extend( this.settings, { uploadFinished : this.finished })
      this.render()
    },

    render : function() {
      $(this.el).filedrop( this.settings )
    },

    finished: function( index, file, res, time ) {
      this.$el.css( 'background-image', 'url('+ res +')' )
      $(this.input).val( res );
    }

  })

  var dropspot = new Dropspot()

})(jQuery)
