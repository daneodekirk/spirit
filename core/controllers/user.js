var passport = require('passport')

module.exports = function( app ) {

  app.get('/login', function(req, res){
    res.render('login', { user: req.user })
  })

  app.get('/auth/google', 
    passport.authenticate('google', { failureRedirect: '/login' }),
    function(req, res) {
      res.redirect('/')
    })

  app.get('/auth/google/return', 
    passport.authenticate('google', { failureRedirect: '/login' }),
    function(req, res) {
      res.redirect('/')
    })

  app.get('/logout', function(req, res){
    req.logout()
    res.redirect('/')
  })

}
