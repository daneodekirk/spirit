(function($) {

  var EditableView = Backbone.View.extend({

    el : '.editable',
    template : '<textarea id="textarea-<%= id %>" name="<%= id %>" class="hidden mirror"><%= content %></textarea>',

    defaults : {
      disableHTML : false 
    },

    events : {
      'input' : 'mirror'
    },

    initialize: function( options ) {
      _.bindAll( this, 'textarea' )
      this.editor = new MediumEditor( this.$el.selector )
      this.$el.mediumInsert( { editor : this.editor, imagesUploadScript: '/upload' })
      this.render()
    },

    render : function() {
      _.map( this.$el, this.textarea )
    },

    textarea : function( el, index ) {
      var textarea = _.template( this.template, { id: this.$el.get(index).id, content : this.$el.eq(index).html() } )
      this.$el.eq(index).after( textarea ) 
    },

    mirror: function(e) {
      var content = this.editor.serialize()[e.target.id].value
      $( '#textarea-'+e.target.id ).val( content )
    }
  
  })

  var editables = new EditableView();

})(jQuery)
