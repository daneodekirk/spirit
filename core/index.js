module.exports = function(app) {

  // [TODO] put this in a better place
  app.locals.Spirit = {}
  
  require('./middleware')(app)
  require('./controllers')(app)
  require('./models')(app)
  require('./helpers')(app)

}
