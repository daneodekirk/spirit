function Spirit() {

  this.Views = {}
  this.Collections = {}
  this.Models = {}
  this.Routers = {}
  this.Notify = {}

  window.addEventListener( 'load', this.start, false );

}

Spirit.prototype.start = function() {

  var router = new Spirit.Routers.Editables()

  Backbone.history.start({
              pushState: true,
              hashChange: false,
  })

}

window.Spirit = new Spirit() 
