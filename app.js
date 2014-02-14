var express  = require('express')
var path     = require('path')
var mongoose = require('mongoose')
var busboy   = require('connect-busboy')
var override = require('connect-acceptoverride')
var passport = require('passport')
var GoogleStrategy = require('passport-google').Strategy;
var app      = express()

//[TODO] globals
_ = require('underscore')

app.use( express.json() )
app.use( express.urlencoded() )
app.use( busboy() )
app.use( override() )
app.use( express.cookieParser() )
  
app.use( express.session({ secret: 'spirit' }) )
app.use( passport.initialize() )
app.use( passport.session() )

app.use( express.static( path.join( __dirname, 'assets' )))
app.use( express.static( path.join( __dirname, 'core/assets' )))

var spirit = require('./core')(app)

app.set( 'views', __dirname + '/core/views' )
app.set( 'view engine', 'jade' )

app.locals.pretty = true

mongoose.connect( 'mongodb://localhost/spirit', function (err) {
  if (err) return console.log(err)
  app.listen(3000)
  console.log('Listening on port 3000')
})


app.get('/test', function(req, res) {
  console.log('here')
  res.render('test')
})

console.log( 'Waiting for database connection' )
