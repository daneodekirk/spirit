module.exports = function( app ) {

  app.use( require('./settings')(app) )

}
