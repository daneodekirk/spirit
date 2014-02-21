function Spirit() {

  this.Views = {}
  this.Collections = {}
  this.Models = {}
  this.Routers = {}
  this.Notify = {}
  this.live = {}

  window.addEventListener( 'load', this.start, false );

}

Spirit.prototype.start = function() {

  var post = new Spirit.Models.Post()
  Spirit.live.post = { 
    model    : post,
    view     : new Spirit.Views.Post({ model : post }),
    dateview : new Spirit.Views.Date(),
  }

  _.map( $('.editable'), function( element ) {
    var options = _.extend( {el : element}, $(element).data() )
    var view = new Spirit.Views.Editable(options)
  
  })

  Spirit.live.router = new Spirit.Router()
    Backbone.history.start({pushState:true})

}


window.Spirit = new Spirit() 
