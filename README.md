Pseudo - Anonymized Email Relay
===
#### What is it?
Pseudo is an smtp relay server designed to anonymize standard email communication. It ensures confidentiality by stripping out all identifying information from the emails you send, while ensuring that no data from relayed emails is stored on the server.

#### Why?
PGP encryption helps mitigate the risk of a standard man-in-the-middle attack when sending emails- However, once your messages are decrypted on the recipient's machine, there is little protecting your identity should they be compromised. It is highly recommended that you use PGP encryption in combination with pseudo for optimal confidentiality.

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

The relay server will generate a pseudonym for both Alice and Bob to be used in their conversation- these will be sent instead of their emails so that Alice and Bob will know that they are still talking to the same person. All other identifying information, such as originating IP addresses is simply stripped before relaying.

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

Furthermore, Alice or Bob can destroy the encrypted mapping of their email/pseudonym on the server at any time by simply replying with ||destroy:true; appended to the subject line. This is an ireversible action, and allows any past pseudonyms you have used to become untraceable from the server.

===
Getting Started:
=== 
Pseudo is supported by most flavors of linux and is built to run on a Postfix smtp server. Begin by installing and configuring postfix if you haven't already.

After cloning this repo, run sudo ./config in the root of this directory to configure proper logging and cleanup settings for Pseudo.

If everything has been installed correctly, run sudo nodejs mailhandler.js to start the relayserver.

===
Security
===

Pseudo is designed to protect your identity for two different adverseries: general blackhat hackers, and the government. The system is designed in such a way that gaining access to any one node of the network (whether client or server) gives no information about any other users of the network. Gaining access to any one client machine will obviously only provide anonymous pseudonyms of people who have been contacted. Meanwhile, gaining access to just the server will only provide a blob of encrypted, meaningless data. It is for the most part safe to assume that a hacker won't gain access to both a client system and a server; it is however, highly likely that the government can issue subpoenas for both. This is where the "destroy" function comes in: If the operator of the server maintains a [warrant canary](http://en.wikipedia.org/wiki/Warrant_canary) system, clients can issue destroy commands to protect their information stored on the server.

### Limitations

Pseudo does of course have limitations. The major concerns are as follows:

- There is little that can be done to protect identities in the case of a persistent man-in-the-middle
- Without entirely bit-filling the machine, there is no guarantee that data is entirely wiped from the relay server
- Due to the ephemerality of pseudonyms, the only way to securely prove your identity to the person you are communicating with is through contexual referencing. Example of this would be to mention a conversation you had with the person the other day, or to mention the outfit you had on. These are identifying features that might give your identity away to another friend, but would not give any information to a hacker or government official.

===
License:
===
MIT
