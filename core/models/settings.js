var mongoose = require('mongoose')
  , Schema   = mongoose.Schema

var SpiritSchema = new Schema({
  title        : { type: String, default: 'Spirit' },
  description  : { type: String, default: 'Just a blogging platform' },
  image        : { type: String, default: '' },
  postsperpage : { type: Number, default: 5 },
  permalinks   : { type: Boolean, default: true },
})

var Spirit = mongoose.model( 'Spirit', SpiritSchema )

Spirit.findOne({}, function(err, spirit) {
  console.log( 'checking for saved site settings' )

  if ( spirit ) {
    spirit.remove() 
    spirit = null;
  }

  if ( ! spirit ) { 
    var spirit = new Spirit()
    spirit.save()
    console.log('saving initial site settings')
  }

})

module.exports = Spirit
