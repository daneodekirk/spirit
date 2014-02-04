var express = require('express')
  , app = module.exports = express()

module.exports = function( app ) {

  require('./settings')(app)
  require('./uploader')(app)
  require('./post')(app)

}
