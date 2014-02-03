var express  = require('express')
var path     = require('path')
var mongoose = require('mongoose')
var busboy   = require('connect-busboy')
var app      = express()

var spirit = require('./core')
app.use( spirit )

app.use( express.json() )
app.use( express.urlencoded() )
app.use( busboy() )

app.use( express.static( path.join( __dirname, 'assets' )))


app.set( 'views', __dirname + '/core/views' )
app.set( 'view engine', 'jade' )

mongoose.connect( 'mongodb://localhost/spirit', function (err) {
  if (err) return console.log(err)
  app.listen(3000)
  console.log('Listening on port 3000')
})

console.log( 'Waiting for database connection' )
