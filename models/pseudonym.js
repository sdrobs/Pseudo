var mongoose = require('mongoose')

var Schema = mongoose.Schema
var Mixed = Schema.Types.Mixed;

var Pseudonym = new Schema({
    initiator       	: { type : String },
    receiver	    	: { type : String },
    initiator_pseudonym : { type : String },
    receiver_pseudonym  : { type : String }
})


exports.Pseudonym = mongoose.model('Pseudonym', Pseudonym)
exports.Schema = Pseudonym
