var Post = require('../models/post')

module.exports = function ( app ) {

  app.get( '/', function(req, res) {
    Post.find( function( err, posts) {
      res.render('posts', { posts : posts })
    })
  })

  // read
  app.get( '/post/:id', function(req, res) {

    Post.findOne({ _id : req.params.id }, function( err, post ) {

      post = ( ! post ) ? new Post() : post
    
      res.format({
        html : function() {
          res.render('post/new', { post : post })
        },

        json : function() {
          res.send( post )
        },

      })

    })

  })

  // create
  app.post('/post/:id', function(req, res) {

    var post = new Post( req.body )

    post.save( function(err, post) {
      res.send( post )
    })

  })

  // update
  app.put('/post/:id', function(req, res) {

    console.log('putting')
    Post.findOne({ _id : req.params.id }, function(err, post) {
      console.log('putted')
      console.log(post)
      console.log(req.body)
      if (err) throw err;
      post.update( {title: req.body.title}, function(err, post) {

        res.send( post )

      } )
    })

  })

  // delete
  app.del( '/post/:id',  function(req, res) {
    Post.findOne({ _id : req.params.id }, function(err, post) {
      post.remove()  
      res.send( post )
    })
  })


//  app.get( '/:year/:month/:slug',  function(req, res) {
//
//    var year  = req.params.year
//      , month = req.params.month
//      , slug  = req.params.slug
//      , startDate = new Date( year, month - 1, 1 )
//      , endDate = new Date( year, month, 1 )
//
//    Post.findOne({ 'slug' : slug })
//      .where( 'date' )
//        .gte( startDate )
//        .lt( endDate )
//      .exec( function( err, post ) {
//        console.log(post)
//        if ( err ) throw err
//        res.render( 'post/new', { post: post} )
//        //res.send(post)
//      });
//  })

}
