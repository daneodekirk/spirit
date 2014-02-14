module.exports = function( app ) {

  require('./settings')(app)
  require('./user')(app)

}
