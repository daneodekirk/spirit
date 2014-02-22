Spirit.Views.Date =  Backbone.View.extend({

  el: '.date',

  events: {
    'input' : 'parse',
    'blur'  : 'date'
  },

  parse: function( e ) {
    var parsed = chrono.parseDate( e.currentTarget.innerHTML )
    if ( moment( parsed ).isValid() ) 
      $('.timestamp').val( parsed )
  },

  date : function(e) {
    var date = $('.timestamp').val() 
    this.$el.html( moment(date).format('MMMM Do YYYY, h:mm a'))
  },

  initialize: function( options ) {
    this.date()
  }

})  
