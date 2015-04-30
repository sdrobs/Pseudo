var nodemailer = require('nodemailer'),
    fs = require('fs'),
    //var body = fs.readFileSync("body.html", "utf8");
    path = require('path'),
    fs = require('fs'),
    MailParser = require("mailparser").MailParser,
    Mbox = require('node-mbox'),
    mongoose = require('mongoose'),
    async = require('async'),
    crypto = require('crypto'),
    exec = require('child_process').exec,
    watch = require('watch'),
    animal = require('animal-id');

animal.useSeparator('_');

var Pseudonym = require('./models/pseudonym').Pseudonym,
    Pseudohash = require('./models/pseudohash').Pseudohash
    

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

    watch.watchTree('/var/spool/mail/bob', function (f, curr, prev) {
        if (typeof f == "object" && prev === null && curr === null) {
            // Finished walking the tree
        } else if (prev === null) {
            // f is a new file
        } else if (curr.nlink === 0) {
            // f was removed
        } else {
            // f was changed
        }
    })

    // fs.watchFile('/var/mail/bob',function(curr,prev){
    //     mbox = new Mbox('/var/mail/bob',{});

    //     mbox.on('message', function(msg) {
    //             mbox.lastm = msg
    //     })

    //     mbox.on('end', function() {
    //         var mailparser = new MailParser();
    //         if(!mbox.lastm)    
    //             return
                
    //         mailparser.on("end", function(mail_object){
    //             mapAES(mail_object)
    //             //mapPlainText(mail_object)
    //         });


    //         mailparser.write(mbox.lastm)
    //         mailparser.end()
    //         mbox = {}
    //     });
    // })
}

//currently only supports 1 recipient, although more is totally possible to implement
function mapAES(mail_object){
    var sender = mail_object.from[0].address
    var subject = mail_object.subject
    var query_string = subject.split("||")[subject.split("||").length-1]
    var qs = parseQS(query_string)

    if(subject.indexOf("||") != -1)
        subject = subject.substring(0,subject.lastIndexOf("||"))

    var p = mail_object.to[0].name //pseudonym they are sending to (if none, new message)

    console.log("mail received")

    var message = {}
    message.to = []
    message.subject = subject
    message.body = mail_object.text

    if(!p || p == ""){
        //new conversation (not replying)

        if(!qs.to || qs.to == "")
            return //should we notify sender that their mail didn't go through?

        var recipient = qs.to

        var pseudohash = new Pseudohash({});

        var pseudo1 = genPseudo(); //initiator
        var pseudo2 = genPseudo(); //receiver

        //encrypted with pseudo1
        var map1 = {
            email:sender, //initiator
            pseudonym: pseudo2 //receiver
        }

        //encrypted with pseudo2
        var map2 = {
            email:recipient, //receiver
            pseudonym: pseudo1 //initiator
        }

        pseudohash.hash = SHA256(pseudo1)
        pseudohash.hash2 = SHA256(pseudo2)
        pseudohash.map_cipher = AESEncrypt(JSON.stringify(map1),pseudo1)
        pseudohash.map_cipher2 = AESEncrypt(JSON.stringify(map2),pseudo2)

        pseudohash.save(function(err,savedP){
            if(err)
                throw err

            message.to.push(recipient)
            message.from = pseudo1

            send(message)
        })
    }
    else{
        var hash = SHA256(p)

        Pseudohash.findOne({$or: [{hash:hash},{hash2:hash}]}).exec(function(err,pseudohash){
            if(err)
                throw err

            if(!pseudohash)
                return //should we notify sender their email didn't go through?

            var mapCipher = pseudohash.map_cipher2
            var key = p

            if(hash == pseudohash.hash)
                mapCipher = pseudohash.map_cipher
            
            var map
            try{
                map = JSON.parse(AESDecrypt(mapCipher,key))
            }
            catch(err){
                return //invalid key
            }

            if(qs.destroy == 'true')
                return destroy(pseudohash,sender,map.email,p,map.pseudonym)

            message.to.push(map.email)
            message.from = map.pseudonym

            send(message)
        })
    }
}

function mapPlainText(){
    var sender = mail_object.from[0].address
    var subject = mail_object.subject
    var query_string = subject.split("||")[subject.split("||").length-1]
    var qs = parseQS(query_string)

    if(subject.indexOf("||") != -1)
        subject = subject.substring(0,subject.lastIndexOf("||"))

    console.log("mail received")

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
                        var i_pseudo = genPseudo();
                        var r_pseudo = genPseudo();

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
                    return destroy(pseudonym,pseudonym.receiver,pseudonym.initiator,pseudonym.initiator_pseudonym,pseudonym.receiver_pseudonym)

                message.from = pseudonym.initiator_pseudonym
                message.to.push(pseudonym.receiver)
                return send(message)
            }
            else{
                Pseudonym.findOne({receiver:sender,initiator_pseudonym:p}).exec(function(err,pseudonym){
                    if(err)
                        throw err

                    if(!pseudonym)
                        return //They borked the pseudonym. notify?

                    if(qs.destroy == 'true')
                        return destroy(pseudonym,pseudonym.receiver,pseudonym.initiator,pseudonym.initiator_pseudonym,pseudonym.receiver_pseudonym)

                    message.from = pseudonym.receiver_pseudonym
                    message.to.push(pseudonym.initiator)

                    return send(message)
                })
            }
        })
    }
}

function shred(){

    async.parallel({

        mailbox : function(callback){
            exec("echo 'shred -zn 3 /var/spool/mail/bob -f && cp /dev/null /var/spool/mail/bob' | sudo sh", function(err, stdout, stderr){
                if(err)
                    return callback(err)

                callback(null)
            })                                                                                                               
        },

        maillogs : function(callback){
            exec('find /var/log -type f -name "mail*" -exec shred -zn 3 {} \\;', function(err, stdout, stderr){
                if(err)
                    return callback(err)
                
                callback(null)
            })
        },

        mongocache : function(callback){
            exec('find /var/log/mongodb -type f -exec shred -zn 3 {} \\;', function(err, stdout, stderr){
                if(err)
                    return callback(err)
                
                callback(null)
            })
        },

        bleachbit : function(){
            async.parallel([
                function(cb){
                    exec('bleachbit --clean system.memory', function(err, stdout, stderr){
                        if(err)
                            return cb(err)
                        
                        cb(null)
                    })
                },
                function(cb){
                    exec('bleachbit --clean system.cache', function(err, stdout, stderr){
                        if(err)
                            return cb(err)
                        
                        cb(null)
                    })
                }
            ],function(err){
                callback(err)
            }
        }
    },function(err,results){
        if(err)
            console.log(err)

        console.log("System securely cleaned")
    })
}


//this parser is horrible right now. I guess I should fix that later?
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

function SHA256(message){
    return crypto.createHash('sha256').update(message).digest('base64');
}

function AESEncrypt(message,key){
    var cipher = crypto.createCipher("aes-256-ctr",key)
    var crypted = cipher.update(message,'utf8','hex')
    crypted += cipher.final('hex')
    return crypted;
}

function AESDecrypt(cipher,key){
    var decipher = crypto.createDecipher("aes-256-ctr",key)
    var dec = decipher.update(cipher,'hex','utf8')
    dec += decipher.final('utf8');
    return dec;
}

function genPseudo(){
    var animalName = animal.getId()
    animalName = animalName + "_" + uuidGen()
    return animalName
}

//destroy pseudnym lookup
function destroy(mapping,email1,email2,pseudonym1,pseudonym2){
    mapping.remove(function(err){
        send({from:"Ronald Rivest",to:[email1,email2],subject:"Link between " + pseudonym1 + " and " + pseudonym2 + " destroyed." })
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
                    }
                    else{
                        //console.log('Message sent to ' + member.email + ': ' + info.response);
                    }

                    shred()
                });
        })
}

function uuidGen(){ //uuid logic based off of http://stackoverflow.com/a/2117523/1459449
    var uuid = 'xxxxyxxxyxxx'.replace(
        /[xy]/g,
        function (c) {
            var r = Math.random() * 16 | 0, //(0 to 15)
                v = c === 'x' ? r : (r & 0x3 | 0x8) //v = 0 to F (hex)
            return v.toString(16)
        }
    );

    return uuid
}
