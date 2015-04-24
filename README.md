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
