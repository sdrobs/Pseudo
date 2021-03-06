var nodemailer = require('nodemailer'),
    fs = require('fs'),
    MailParser = require("mailparser").MailParser,
    mongoose = require('mongoose'),
    async = require('async'),
    crypto = require('crypto'),
    exec = require('child_process').exec,
    watch = require('watch'),
    animal = require('animal-id');

animal.useSeparator('_');

var Pseudohash = require('./models/pseudohash').Pseudohash
    

mongoose.connect('mongodb://localhost/pseudo', function(err) {
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
watch_dir()

function watch_dir(){

    watch.watchTree('/var/spool/mail/relay', function (f, curr, prev) {
        var mailparser = new MailParser();

        mailparser.on("end", function(mail_object){ 
            mapAES(mail_object,f)
            //mapPlainText(mail_object)
        });
       
        if (typeof f == "object" && prev === null && curr === null) {
            // Finished walking the tree
        } else if (prev === null) {
            //new mail file created
            fs.createReadStream(f).pipe(mailparser);
        }
    })
}

//currently only supports 1 recipient, although more is totally possible to implement
function mapAES(mail_object,mailFile){
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

            send(message,mailFile)
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

            send(message,mailFile)
        })
    }
}

function shred(mailFile){

    async.parallel({

        mailbox : function(callback){
            exec("shred -fuzn 5 " + mailFile, function(err, stdout, stderr){
                if(err)
                    return callback(err)
                if(stderr)
                    return callback(stderr)

                console.log("mailbox cleaned")
                callback(null)
            })                                                                                                               
        },

        maillogs : function(callback){
            exec('find /var/log -type f -name "mail*" -exec shred -fuzn 5 {} \\;', function(err, stdout, stderr){
                if(err)
                    return callback(err)
                if(stderr)
                    return callback(stderr)

                console.log("mail logs cleaned")
                callback(null)
            })
        },

        mongocache : function(callback){
            exec('find /var/log/mongodb -type f -exec shred -zn 3 {} \\;', function(err, stdout, stderr){
                if(err)
                    return callback(err)
                if(stderr)
                    return callback(stderr)

                console.log("mongo caches cleared")
                callback(null)
            })
        },

        bleachbit : function(callback){
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
                console.log("bleachbit garbage collection finished")

                callback(err)
            })
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
function send(message,mailFile){
    var recipients = message.to
        recipients.forEach(function(r){
        var mailOptions = {
                        from: message.from + " <rivest@mit.edu>", // sender address
                        replyTo: message.from + ' <relay@ec2-52-11-124-104.us-west-2.compute.amazonaws.com>',
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
                        console.log("message sent")
                    }
                    if(mailFile)
                        shred(mailFile)
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
