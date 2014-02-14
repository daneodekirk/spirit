var passport = require('passport')
  , GoogleStrategy = require('passport-google').Strategy;

module.exports = function( app ) {

  passport.use(new GoogleStrategy({
      returnURL: 'http://localhost:3000/auth/google/return',
      realm: 'http://localhost:3000/'
    },
    function(identifier, profile, done) {
      process.nextTick(function () {
        //[TODO] associate Google account with a user record in your database and return that user instead.
        profile.identifier = identifier;
        return done( null, profile.identifier );
      });
    }
  ))

  passport.serializeUser(function( identifier, done) {
    done(null, identifier)
  })

  passport.deserializeUser(function( identifier, done) {
    done(null, identifier)
  })


  app.use( function(req, res, next) {
    res.locals.Spirit.auth = true;
    //res.locals.Spirit.auth = req.isAuthenticated()
//    console.log(res.locals.Spirit.auth)
    next()
  })

}
