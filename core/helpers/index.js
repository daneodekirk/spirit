var Spirit = Spirit || {}

Spirit.helpers = {

  currentUser : function() {
    return 'hello world';
  }

}

module.exports = function( app ) {
  app.locals.Spirit.helpers = Spirit.helpers
  //_.extend( app.locals.Spirit.helpers , Spirit.helpers )
    console.log(app.locals.Spirit)
  //app.locals.use( Spirit.helpers )
}
