var nodemailer = require('nodemailer'),
	assert = require('assert'),
	watch = require('watch'),
	MailParser = require("mailparser").MailParser,
	fs = require('fs')


//CHANGE THIS TO THE ADDRESS OF YOUR SERVER
var relay_email = "relay@ec2-52-11-124-104.us-west-2.compute.amazonaws.com"

describe('Check that /var/spool/mail/relay has been created and has correct permissions', function(){

    it('should not throw a permissions error', function(){
        watch.watchTree('/var/spool/mail/relay', function (f, curr, prev) {
	        assert.ok(true)
	    })
    })

})


describe('Make sure smtp server works and is receiving mail at relay@', function(){

	var transporter,
		mailOptions

	before(function(){
		transporter = nodemailer.createTransport({
		    host: 'localhost',
		    port: 25,
		    tls: {rejectUnauthorized: false}
		});

		mailOptions = {
            from: "<foo@mit.edu>", // sender address
            to: relay_email, // list of receivers,
            subject: "abc123", // Subject line
            text: "def456" // plaintext body
        };

	})

    it('should trigger email received before timeout', function(done){

    	var received = false

        watch.watchTree('/var/spool/mail/relay', function (f, curr, prev) {
	        if (typeof f == "object" && prev === null && curr === null) {
	            // Finished walking the tree
	        } else if (prev === null) {
	            //new mail file created
	            received = true
	            assert.ok(true)
	            return done();
	        }
	    })

        transporter.sendMail(mailOptions, function(error, info){
            if(error){
                throw error
            }

            setTimeout(function(){
            	if(!received){
            		assert.ok(false)
            		return done()
            	}
            },5000)
        });
    })


})