Pseudo - Anonymized Email Relay
===
#### What is it?
Pseudo is an smtp relay server designed to anonymize standard email communication. It ensures confidentiality by stripping out all identifying information from the emails you send, while ensuring that no data from relayed emails is stored on the server.

#### Why?
PGP encryption helps mitigate the risk of a standard man-in-the-middle attack when sending emails; however, once your messages are decrypted on a recipient's machine, there is little protecting your identity if they are compromised. Pseudo allows you to send emails with the safety of know that they cannot easily be traced back to you. It is highly recommended that you use PGP encryption in combination with pseudo for optimal confidentiality.

#### How?
Pseudo exploits the malleability of smtp headers to allow both parties to use email exactly as they normally would with the added benefit of pseudo-anonyminity.

For example: 

Alice wants to send an email to Bob and have him reply.
Let's say we are hosting our smtp anonymizer at the IP address 55.5.5.55, and our relay email address is relay@55.5.5.55


Instead of sending the following message:

```
{
	from: alice@mit.edu,
	to: bob@mit.edu,
	subject: New leaked government documents,
	body: Check out the attached files
}
```
```
Alice will now send:

{
	from: alice@mit.edu,
        to: relay@55.5.5.55,
        subject: New leaked government documents||to:bob@mit.edu;,
        body: Check out the attached files
}
```

The relay server will generate a pseudonym for both Alice and Bob to be used in their conversation. These will be sent instead of their emails, and will stay persistent throughout an email conversation so that Alice and Bob will know that they are still talking to the same person. All other identifying information, such as originating IP addresses is simply stripped before relaying.

Now, bob will receive the following message:

```
{
        from: Limber Gecko,
        subject: New leaked government documents,
        body: Check out the attached files,
        replyTo: Limber Gecko <relay@55.5.5.55>
}
```

Where replyTo is the address that is populated in the 'To' field when you click reply to the email. Bob can simply treat this like a normal email- by clicking reply, the server will perform a lookup of the pseudonym 'Limber Gecko' and route it to `alice@mit.edu`. This routing table is encrypted using AES on the server with the key consisting partially of each recipient's pseudonym, meaning that if an adversary gained temporary access to the server, he/she could not decrypt the mappings without knowing the pseudonyms of both Alice and Bob in this conversation.

Furthermore, Alice or Bob can destroy the encrypted mapping of their email/pseudonym on the server at any time by simply replying with `||destroy:true;` appended to the subject line. This is an irreversible action, and allows any past pseudonyms you have used to become untraceable from the server.

===
Getting Started:
=== 
Pseudo is built to run using Postfix as an smtp server. Begin by installing and configuring postfix if you haven't already.

After cloning this repo, run `sudo ./config` in the root of this directory to configure proper logging and cleanup settings for Pseudo and Postfix.

If everything has been installed correctly, run `sudo node mailhandler.js` to start the relay server.

*Note that Pseudo is currently only tested on Ubuntu 14.04, although it should would fine on other common linux distros.

##### Sending emails
Pseudo accepts parameters from the subject line of an email. Use a double pipe `||` to signal the beginning of parameters. For example, to send a message to `bob@mit.edu` you would append `||to:bob@mit.edu;` to the end of the subject line. The server will strip this out prior to relaying the message. This is also only necessary for the first message of a conversation. After this, it is okay to treat messages as ordinary emails and reply like normal.

===
Security
===

Pseudo is designed to protect your identity from two different types of adverseries: general blackhat hackers, and the government. The system is designed in such a way that gaining access to any one node of the network (whether client or server) gives no information about any other users of the network. Gaining access to any one client machine will obviously only provide anonymous pseudonyms of people who have been contacted. Meanwhile, gaining access to just the server will only provide a blob of encrypted, meaningless data. It is for the most part safe to assume that a hacker won't gain access to both a client system and a server; it is however, highly likely that the government can issue subpoenas for both. This is where the "destroy" function comes in: If the operator of the server maintains a [warrant canary](http://en.wikipedia.org/wiki/Warrant_canary) system, clients can issue destroy commands to protect their information stored on the server.

It is also important to note that no email or logging information is maintained by pseudo. All sensitive data that passes through the relay server is meticulously scrubbed using the linux `shred` script. The only information retained by the server are the AES-256 encrypted email-pseudonym mappings.

### Limitations

Pseudo does of course have limitations. The major concerns are as follows:

- There is little that can be done to protect identities in the case of a persistent man-in-the-middle
- Without entirely bit-filling the machine, there is no guarantee that data is entirely wiped from the relay server
- Spam. You should only allow authorized emails/IPs to communicate through an instance of pseudo, otherwise it will quickly turn into an anonymized spam proxy server. The cleanest solution to this is probably just to password-protect the server and include the password in the subject parameters in the beginning of an email conversation.
- Due to the ephemerality of pseudonyms, the only way to securely prove your identity to the person you are communicating with is through contexual referencing. Example of this would be to mention a conversation you had with the person the other day, or to mention the outfit you had on. These are identifying features that might give your identity away to another friend, but would not give any information to a hacker or government official.

===
License:
===
MIT
