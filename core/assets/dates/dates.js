Spirit.Views.Date =  Backbone.View.extend({

  el: '.date',

  events: {
    'input' : 'parse',
    'blur'  : 'date'
  },

  parse: _.debounce( function( e ) {
    var parsed = chrono.parseDate( e.currentTarget.innerHTML )
    if ( moment( parsed ).isValid() ) 
      $('.timestamp').val( parsed )
  }, 100 ),

  date : function(e) {
    var date = $('.timestamp').val() 
    this.$el.html( moment(date).format('MMMM Do YYYY, h:mm a'))
  },

  initialize: function( options ) {
    this.date()
  }

})  
