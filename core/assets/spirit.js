function Spirit() {

  this.Views = {}
  this.Collections = {}
  this.Models = {}
  this.Routers = {}
  this.Notify = {}

  window.addEventListener( 'load', this.start, false );

}

Spirit.prototype.start = function() {

  var post = new Spirit.Models.Post({})
    , postsview = new Spirit.Views.Post({ model : post })
    , datesview = new Spirit.Views.Date()

  _.map( $('.editable'), function( element ) {
    var view = new Spirit.Views.Editable({ el: element })
  })

}


window.Spirit = new Spirit() 
