var express = require('express')
  //, app = module.exports = express()
  , settings = require('../models/settings')

module.exports = function( app ) {

  app.use( function(req, res, next) {
  
      // [TODO] better conditional 
      if ( app.locals.Spirit._id && req.url.indexOf( 'settings' ) === -1 ) { 
        res.locals.Spirit = app.locals.Spirit
        return next()
      }

      settings.findOne(function( err, spirit ) {
        _.extend( app.locals.Spirit, spirit )
        res.locals.Spirit = app.locals.Spirit
        next()
      })

  })
    
}
