(function() {

  'use strict';

  var EditableView = Backbone.View.extend({

      template : '<textarea id="textarea-<%= id %>" name="<%= id %>" class="hidden mirror"><%= content %></textarea>',

      defaults : {
        disableHTML : false 
      },

      events : {
        'input' : 'mirror'
      },

      initialize: function( options ) {
        _.bindAll( this, 'textarea' )
        this.render()
      },

      render : function() {
        this.editor()
        this.textarea()
      },

      editor : function() {
        this.editor = new MediumEditor( '#' + this.el.id )
        this.$el.mediumInsert( { 
          editor              : this.editor,
          imagesUploadScript  : '/upload' 
        })
      },

      textarea : function( el, index ) {

        var textarea = _.template( this.template, { 
          id: this.$el.attr('id'),
          content : this.$el.html() 
        } )

        this.$el.after( textarea ) 
      },

      mirror: function(e) {
        var content = this.editor.serialize()[e.target.id].value
        $( '#textarea-'+e.target.id ).val( content )
      }
    
  })

  Spirit.Views.Editables = EditableView;

  _.map( $('.editable'), function( element ) {
    var view = new Spirit.Views.Editables({ el: element })
  })


})();
