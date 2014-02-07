var mongoose = require('mongoose')
  , moment   = require('moment')
  , slug     = require('slug')
  , Schema   = mongoose.Schema

var Post = new Schema({
  title  : { type: String, default: 'Post title' }, 
  author : { type: String, default: '' },
  body   : { type: String, default: 'Post content' },
  slug   : { type: String, default: '' },
  image  : { type: String, default: '' },
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
