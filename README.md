Anonymized Email Relay
===

#### Why?
PGP encryption can help mitigate the risk of a standard man-in-the-middle attack when sending emails- However, once your messages are decrypted on the recipient's machine, there is little protecting your identity should they be compromised.

This system ensures end-to-end confidentiality by acting as a relay for all email communication between two parties, stripping all identifying information and replacing it with a consistent pseudonym.

#### How?
This system exploits the malleability of smtp headers to allow both parties to use email exactly as they normally would with the added benefit of pseudo-anonyminity.

For example: 

Alice wants to send an email to Bob and have him reply.
Let's say we are hosting our smtp anonymizer at the IP address 55.5.5.55, and our relay email address is relay@55.5.5.55


Instead of sending the following message:

```
{
	to: bob@mit.edu,
	from: alice@mit.edu,
	subject: New leaked government documents,
	body: Check out the attached files
}
```
```
Alice will now send:

{
        to: relay@55.5.5.55,
        from: alice@mit.edu,
        subject: New leaked government documents||to:bob@mit.edu;,
        body: Check out the attached files
}
```

The relay server will generate a pseudnym for both Alice and Bob to be used in their conversation, and strips out all actual identifying information before relaying the message. Note that the relay server is programmed to be clueless- it holds no transcripts of any data coming or going through it, so in the case of a government subpoena for information (Think: Lavabit), all contents of the server can be readily handed over without worry.

Now, bob will receive the following message:

```
{
        from: Limber Gecko,
        subject: New leaked government documents,
        body: Check out the attached files,
        replyTo: Limber Gecko <relay@55.5.5.55>
}
```

Where replyTo is the address that is populated in the 'To' field when you click reply to the email. Bob can simply treat this like a normal email- by clicking reply, the server will perform a lookup of the pseudonym 'Limber Gecko' and route it to `alice@mit.edu`. This routing table is encrypted using AES on the server with the key consisting partially of each recipient's pseudonym, meaning that if an adversary gained temprary access to the server, he could not decrypt the mappings without knowing the pseudonyms of both Alice and Bob in this conversation.

Alice or Bob can destroy the mapping on the server to ensure anonyminity at any time by simply replying with ||destroy:true; appended to the subject line. This is an ireversible action, and allows any past pseudonyms you have used to become untraceable.

===
Getting Started:
=== 
