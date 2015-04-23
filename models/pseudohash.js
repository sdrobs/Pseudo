var mongoose = require('mongoose')

var Schema = mongoose.Schema
var Mixed = Schema.Types.Mixed;

var Pseudohash = new Schema({
    hash           : { type : String },
    pseudonym      : { type : String }
})


exports.Pseudohash = mongoose.model('Pseudohash', Pseudohash)
exports.Schema = Pseudohash
