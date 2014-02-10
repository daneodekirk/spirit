(function($) {

  var SpiritDateView = Backbone.View.extend({

    el: '.date',

    //model : SpiritDate,

    events: {
      'input' : 'date',
    },

    date: _.debounce( function( e ) {
      var parsed = chrono.parseDate( e.currentTarget.innerHTML )
      if ( moment( parsed ).isValid() ) 
        $('.timestamp').val( parsed )
        //this.model.save({ date : parsed })
    }, 1000 )
  
  })  

  var spiritdateview = new SpiritDateView()

})(jQuery)
