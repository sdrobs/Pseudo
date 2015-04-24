var mongoose = require('mongoose')

var Schema = mongoose.Schema
var Mixed = Schema.Types.Mixed;

var Pseudohash = new Schema({
    hash           : { type : String }, //this is the SHA256 of the recipient's pseudonym
    hash2		   : { type : String }, //opposite SHA256 of pseudonym for non-initiating party
    map_cipher     : { type : String }, //this is the ciphertext containing the sender's pseudonym, and the email mapping to the recipient pseudonym
    map_cipher2     : { type : String } //opposite cipher for non-initiating party
    /*
		Decrypts to:

		{
			pseudonym:"pseudonym", //sender pseudonym
			email:"srobin@mit.edu" //recipient email
		}
    */
})


exports.Pseudohash = mongoose.model('Pseudohash', Pseudohash)
exports.Schema = Pseudohash
