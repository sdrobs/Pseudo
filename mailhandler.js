var nodemailer = require('nodemailer'),
    fs = require('fs'),
    //var body = fs.readFileSync("body.html", "utf8");
    path = require('path'),
    session = require('express-session'),
    fs = require('fs'),
    MailParser = require("mailparser").MailParser,
    Mbox = require('node-mbox'),
    mongoose = require('mongoose'),
    async = require('async'),
    crypto = require('crypto'),
    animal = require('animal-id');

animal.useSeparator(' ');

var Pseudonym = require('./models/pseudonym').Pseudonym,
    Pseudohash = require('./models/pseudohash')
    

mongoose.connect('mongodb://localhost/6857', function(err) {
    if(err) throw err;
})

if (process.getuid() != 0) {
    throw "You must run the mail parser as root!"
}

// create reusable transporter object using SMTP transport
var transporter = nodemailer.createTransport({
    host: 'localhost',
    port: 25,
    tls: {rejectUnauthorized: false}
});

//begin execution with this call
watch();

function watch(){
    var mbox

    fs.watchFile('/var/mail/bob',function(curr,prev){
        mbox = new Mbox('/var/mail/bob',{});

        mbox.on('message', function(msg) {
                mbox.lastm = msg
        })

        mbox.on('end', function() {
            var mailparser = new MailParser();
                
            mailparser.on("end", function(mail_object){
                mapPlainText(mail_object)
            });


            mailparser.write(mbox.lastm)
            mailparser.end()
            mbox = {}
        });
    })
}

function mapPlainText(){
    var sender = mail_object.from[0].address
    var subject = mail_object.subject
    var query_string = subject.split("||")[subject.split("||").length-1]
    var qs = parseQS(query_string)

    if(subject.indexOf("||") != -1)
        subject = subject.substring(0,subject.lastIndexOf("||"))

    console.log("---")
    console.log(sender)
    console.log(subject)
    console.log(mail_object.to)
    console.log("---")

    var p = mail_object.to[0].name
    
    var message = {}
    message.to = []
    message.subject = subject
    message.body = mail_object.text
    if(!message.body)
        message.body = mail_object.html

    if(!p || p == ""){
        //new conversation (not replying)
        if(!qs.to || qs.to == "")
            return
        
        Pseudonym.findOne({initiator:sender,receiver:qs.to}).exec(function(err,pseudonym){
            if(err)
                throw err
            if(pseudonym){
                message.from = pseudonym.initiator_pseudonym 
                message.to.push(qs.to)
                return send(message)
            }
            else{
                Pseudonym.findOne({initiator:qs.to,receiver:sender}).exec(function(err,pseudonym){
                    if(err)
                        throw err
                    if(pseudonym){
                        message.from = pseudonym.receiver_pseudonym
                        message.to.push(qs.to)
                        return send(message)
                    }
                    else{
                        var i_pseudo = animal.getId();
                        var r_pseudo = animal.getId();

                        var newPseudo = new Pseudonym({})
                        newPseudo.initiator = sender
                        newPseudo.initiator_pseudonym = i_pseudo
                        newPseudo.receiver = qs.to
                        newPseudo.receiver_pseudonym = r_pseudo
                        newPseudo.save(function(err,nps){
                            if(err)
                                throw err
                            message.from = nps.initiator_pseudonym
                            message.to.push(qs.to)
                            return send(message)
                        })
                    }
                })
            }
        })
    }
    else{
        //replying
        if(!p || p == "")
            return

        Pseudonym.findOne({initiator:sender,receiver_pseudonym:p}).exec(function(err,pseudonym){
            if(err)
                throw err
            if(pseudonym){
                if(qs.destroy == 'true')
                    return destroy(pseudonym)
                message.from = pseudonym.initiator_pseudonym
                message.to.push(pseudonym.receiver)
                return send(message)
            }
            else{
                Pseudonym.findOne({receiver:sender,initiator_pseudonym:p}).exec(function(err,pseudonym){
                    if(err)
                        throw err
                    if(pseudonym){
                        if(qs.destroy == 'true')
                            return destroy(pseudonym)
                                        message.from = pseudonym.receiver_pseudonym
                                                message.to.push(pseudonym.initiator)
                        return send(message)
                    }
                    else{
                        return //they borked the pseudonym
                    }
                })
            }
        })
    }
}

function parseQS(query_string){
    var qs = {}
    var parts = query_string.split(";")
    parts.forEach(function(p){
        var keyval = p.split(":")
        //var val
        //if(keyval[1].indexOf(",") != -1){
        //  val = keyval[1].split(",")
        //}
        //else
        //  val = keyval[1]
        qs[keyval[0]] = keyval[1]
    })

    return qs
}

//destroy pseudnym lookup
function destroy(pseudonym){
    console.log("hello?")
    var email1 = pseudonym.receiver
    var email2 = pseudonym.initiator
    pseudonym.remove(function(err){
        send({from:"Ronald Rivest",to:[email1,email2],subject:"Link between " + pseudonym.receiver_pseudonym + " and " + pseudonym.initiator_pseudonym + " destroyed." })
    })
}

// send mail with defined transport object
function send(message){
    console.log(message)
    var recipients = message.to
        recipients.forEach(function(r){
        var mailOptions = {
                        from: message.from + " <rivest@mit.edu>", // sender address
                        replyTo: message.from + ' <bob@ec2-52-11-124-104.us-west-2.compute.amazonaws.com>',
                        to: '', // list of receivers,
                        subject: message.subject, // Subject line
                        text: message.body, // plaintext body
                        html: "",//body,
                        xMailer: '6857 Mailer'
                };
                mailOptions.bcc = r

                transporter.sendMail(mailOptions, function(error, info){
                        if(error){
                                console.log(error);
                        }else{
                                //console.log('Message sent to ' + member.email + ': ' + info.response);
                            //fs.truncate('/var/mail/bob', 0, function(){console.log('done')})
                console.log("sent") 
            }
                });
        })
}

function uuidGen(){ //uuid logic based off of http://stackoverflow.com/a/2117523/1459449
    var uuid = 'xxxxxxxxxxxyxxxxxxxx'.replace(
        /[xy]/g,
        function (c) {
            var r = Math.random() * 16 | 0, //(0 to 15)
                v = c === 'x' ? r : (r & 0x3 | 0x8) //v = 0 to F (hex)
            return v.toString(16)
        }
    );

    return uuid
}
