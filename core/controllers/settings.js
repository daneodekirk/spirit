var settings = require('../models/settings')

module.exports = function( app ) {

  app.get( '/settings', function(req, res) {
    res.render( 'settings' ) 
  })

  app.post( '/settings', function(req, res) {

    req.body.permalinks = !! req.body.permalinks

    settings 
      .findOne({ _id: req.body.id })
      .update( req.body , function( err, affected, raw ) {
        res.redirect('back') 
      })

  })
  
  app.get( '/settings/debug', function(req, res) {
    res.send( res.locals.Spirit ) 
  })

}
