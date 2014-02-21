var Post = require('../models/post')

module.exports = function ( app ) {

  app.get( '/', function(req, res) {
    Post.find({})
      .sort({date:-1})
      .exec( function( err, posts) {
        res.render('posts', { posts : posts })
      })
  })

  app.get('/post', function(req, res) {

    res.render('post/new', { post: {} })
  
  })

  // read
  app.get( '/post/:id', function(req, res) {

    req.params.id = req.params.id.split('.')[0]

    Post.findOne({ _id : req.params.id }, function( err, post ) {

      if (err) throw err;

      res.format({

        html : function() {
          res.render( 'post/single' , { post : post || {} })
        },

        json : function() {
          res.send( post )
        },

      })

    })

  })

  // create
  app.post('/post', function(req, res) {

    var post = new Post( req.body )

    // [TODO] this should redirect to the new post 
    post.save( function(err) {
      res.send( post )
    })

  })

  // update
  app.put('/post/:id', function(req, res) {

    Post.findOne({ _id : req.params.id }, function(err, post) {
      if (err) throw err;

      //[TODO] add additional fields to save
      post.title  = req.body.title
      post.body   = req.body.body
      post.date   = req.body.date
      post.author = req.body.author
      post.image  = req.body.image

      post.save( function(err) {
        if (err) throw err
        res.send( post )

      } )
    })

  })

  // delete
  app.del( '/post/:id',  function(req, res) {
    Post.findOne({ _id : req.params.id }, function(err, post) {
      if (err) throw err;
      post.remove()  
      res.send({})
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
//        if ( err ) throw err
//        res.render( 'post/new', { post: post} )
//        //res.send(post)
//      });
//  })

}
