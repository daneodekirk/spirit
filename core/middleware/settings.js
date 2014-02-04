var express = require('express')
  , app = module.exports = express()
  , settings = require('../models/settings')

module.exports = function() {
    
  console.log('middleware load site settings')

    return function(req, res, next) {

      // [TODO] better conditional
      if ( app.locals.Spirit && req.url != '/settings/' ) {
        res.locals.Spirit = app.locals.Spirit
        console.log('loading site settings from cache')
        return next()
      }

      settings.findOne(function( err, spirit ) {
        app.locals( { Spirit : spirit } )
        res.locals.Spirit = app.locals.Spirit
        console.log('loading site settings from database')
        next()
      })

    }
    
};
