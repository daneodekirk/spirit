module.exports = function(app) {
  
  require('./middleware')(app)
  require('./controllers')(app)
  require('./models')(app)

}
