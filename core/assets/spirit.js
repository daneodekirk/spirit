function Spirit() {

  this.Views = {}
  this.Collections = {}
  this.Models = {}
  this.Routers = {}
  this.Notify = {}

  window.addEventListener( 'load', this.start, false );

}

Spirit.prototype.start = function() {

//  var router = {}
//  var router1 = new Spirit.Routers.Post()
//  var router2 = new Spirit.Routers.Editables()
//  _.map( Spirit.Routers, function( route, index) {
//    _.extend( router.routes, route.routes )
//  })
//  console.log(router)
//
//  Backbone.history.start({
//              pushState: true,
//              hashChange: false,
//  })

}


window.Spirit = new Spirit() 
