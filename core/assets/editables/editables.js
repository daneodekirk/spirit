(function($) {

  var EditableView = Backbone.View.extend({

    el : '.editable',
    template : '<textarea id="textarea-<%= id %>" name="<%= id %>" class="hidden mirror"><%= content %></textarea>',

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
      //this.$el.closest('form').data( 'editables', this.editor.serialize() )
    }
  
  })

  var editables = new EditableView();


//  var FormView = Backbone.View.extend({
//
//    el : 'form',
//
//    events: {
//      'submit' : 'submit' 
//    },
//
//    submit: function() {
//      var editables = this.$el.data( 'editables' ) 
//      _.zip(_.keys( editables ), _.pluck( editables , 'value'))
//    }
//
//
//  })
//  $('form').submit(function() {
//
//    var $this = $(this)
//      , post = editor.serialize()
//
//    $.post( $this.attr('action'), {
//
//      title : $(post.title.value).text(),
//      body  : post.body.value,
//      image : $('#image').val(),
//      id    : $('#id').val()
//
//    });
//
//    return false;   
//  })

})(jQuery)
