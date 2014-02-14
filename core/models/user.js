var mongoose = require('mongoose')
  , moment   = require('moment')
  , slug     = require('slug')
  , Schema   = mongoose.Schema

var UserSchema = new Schema({
  identifier : { type : String },
  email      : { type : String },
  name       : { type : String },
  last_login : { type : Date },
  registered : { type : Date },
})

module.exports = mongoose.model( 'User', UserSchema )
