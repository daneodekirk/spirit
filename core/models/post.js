var mongoose = require('mongoose')
  , moment   = require('moment')
  , slug     = require('slug')
  , Schema   = mongoose.Schema

var Post = new Schema({
  title  : String,
  author : String,
  body   : String,
  slug   : String,
  image  : String,
  date   : { type: Date, default: Date.now },
  modified : { type: Date, default: Date.now },
  hidden : Boolean
})

Post.pre( 'save', function( next ) {
  this.slug = slug( this.title )
  next()
})

Post.virtual('url').get(function() {
  var date = moment( this.date )
    , formatted = date.format( 'YYYY[/]MM[/]' )

  return formatted + this.slug
})

module.exports = mongoose.model( 'Post', Post )
