var fs = require('fs')
  , os = require('os')
  , path = require('path')
  , busboy = require('connect-busboy')

module.exports = function( app ) {

    app.get('/upload', function(req, res) {

      res.send('upload here')

//      req.busboy.on('file', function(fieldname, file, filename, encoding, mimetype) {        
//
//        var fstream = fs.createWriteStream( path.join( __dirname + '/../../assets/uploads' , path.basename(filename)))
//        //file.on('end', function() {
//        //  console.log(fieldname + '(' + filename + ') EOF');
//        //});
//        fstream.on('close', function() {
//          res.send( '/uploads/' + filename )
//          //console.log(fieldname + '(' + filename + ') written to disk at ' +  path.join(os.tmpDir(), path.basename(filename)) );
//        })
//        //console.log(fieldname + '(' + filename + ') start saving');
//        file.pipe(fstream)
//
//      })
//
//      req.pipe(req.busboy)
//
    })

}
