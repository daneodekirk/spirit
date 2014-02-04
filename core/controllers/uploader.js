var fs = require('fs')
  , os = require('os')
  , path = require('path')

module.exports = function( app ) {

    app.get('/upload', function(req, res) {
      res.render('uploader')
    })

    app.post('/upload', function(req, res) {

      req.busboy.on('file', function(fieldname, file, filename, encoding, mimetype)  {

        // [TODO] better directory variable for uploads
        // [TODO] change filename?
        console.log( path.join( __dirname + '/../../assets/uploads' , path.basename(filename)) )
        var fstream = fs.createWriteStream( path.join( __dirname + '/../../assets/uploads' , path.basename(filename)))

        file.on('end', function() {
          console.log(fieldname + '(' + filename + ') EOF');
        });

        fstream.on('close', function() {
          res.send( '/uploads/' + filename )
          console.log(fieldname + '(' + filename + ') written to disk at ' +  path.join(os.tmpDir(), path.basename(filename)) );
        })
        console.log(fieldname + '(' + filename + ') start saving');

        file.pipe(fstream)

      })

      req.pipe(req.busboy)

    })

}
