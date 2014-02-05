var Post = require('../models/post')

module.exports = function ( app ) {

  app.get( '/', function(req, res) {

    Post.find( function( err, posts) {
      res.render('posts', { posts : posts })
    })

  })


  app.get( '/post/:id', function(req, res) {
    res.render('post', {post : {} })
  })

  app.put('/post/:id', function(req, res) {

    Post.findOne({ _id : req.params.id }, function(err, post) {
      res.render('new', { post: post }) 
    })
       
  })

//
//  app.post( '/post/create', function(req, res) {
//
//    var post = new Post( req.body )
//    post.save( function(err, post) {
//      res.redirect('/') 
//    })
//
//  })
//
//  app.post( '/post/update', function( req, res ) {
//
//    Post.findOne({ _id : req.body.id }, function( err, post ) {
//
//      post.update( req.body, function(err) {
//        if ( err ) throw err;
//        res.send('ok') 
//      } )
//    
//    })
//
//  })
//
//  app.get( '/post/edit', function( req, res ) {
//
//    Post.findOne({ _id : req.query.id }, function(err, post) {
//      res.render('new', { post: post }) 
//    })
//
//  })
//
//
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
//        if ( err ) throw err
//        //res.render( 'single', { post: post} )
//        res.send(post)
//      });
//
//  })
//
//  app.get( '/post/delete',  function(req, res) {
//
//    Post.findOne({ _id : req.query.id }).remove( function(err, post) {
//      res.redirect('/') 
//    })
//
//  })
//
}
