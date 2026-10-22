# DNS cutover: Crazy Domains nameservers to Vercel DNS

Every step, in order, with the exact values. Checked against live DNS on
22 Oct 2026.

**The setup we're moving to (two accounts, no Cloudflare for DNS):**

| Job | Who |
| --- | --- |
| Registrar (you own and renew the names) | Crazy Domains (unchanged) |
| DNS (where the website and email live) | **Vercel DNS** |
| Hosting (runs the sites) | Vercel (the Decra project) |

(Decra's media storage, Cloudflare R2, is unrelated and stays as is.)

**Where things stand:** all three domains are registered at Crazy Domains,
but their nameservers are `greg.ns.cloudflare.com` and
`sneh.ns.cloudflare.com`, the old agency's (Island Creative's) Cloudflare
account. While those are set, the old agency's account answers for your
domains and any DNS you edit at Crazy Domains is ignored. Switching the
nameservers to Vercel is the cutover.

## Step 0: before any DNS change

1. **Merge and deploy** the branch with the clones. If DNS moves first,
   Annie May's domain would show the old code's version of her site.
2. **Web3Forms keys** (the free form service that emails you contact
   form messages):
   1. Go to web3forms.com, enter the email address that should receive
      **Annie May** enquiries, and create an access key. They email it.
   2. Repeat for **Prescription Pad** and **Ten Fifty Bakers** (same or
      different inboxes). Until those two mailboxes move off the old
      server (Step 6), use an inbox that doesn't depend on it, such as
      a Gmail address or Annie May's Microsoft 365 mailbox.
   3. **Vercel → the Decra project → Settings → Environment Variables**,
      add for Production:

      | Name | Value |
      | --- | --- |
      | `WEB3FORMS_KEYS` | `annie-may=KEY1,prescription-pad=KEY2,ten-fifty-bakers=KEY3` |

   4. Redeploy (Deployments → latest → Redeploy) so it takes effect.
   5. Send a test from each contact page on the Decra preview
      (`/m/live/<property>/contact-us.html`) and check the email arrives.
      A copy also appears under admin → Reservations → Website enquiries.

## Step 1: add the domains to the Decra project

**Vercel → the Decra project → Settings → Domains → Add**:

| Add | Setting |
| --- | --- |
| `theprescriptionpad.com.au` | primary |
| `www.theprescriptionpad.com.au` | redirect to `theprescriptionpad.com.au` (308) |
| `anniemay.com.au` | primary |
| `www.anniemay.com.au` | redirect to `anniemay.com.au` (308) |

`tenfiftybakers.com.au` and `www.tenfiftybakers.com.au` are already there.

When Vercel asks how to configure a domain, choose **Nameservers**
("Vercel DNS"), not the A record / CNAME option. Vercel shows the two
nameservers to use:

```
ns1.vercel-dns.com
ns2.vercel-dns.com
```

Domains show "Invalid Configuration" until Step 3. That's expected.

**You don't add any website records.** With Vercel nameservers, Vercel
creates the root and `www` records and the SSL certificates itself.

## Step 2: add the email records in Vercel DNS (before switching!)

The moment the nameservers change, Vercel DNS answers for **everything**,
so the email records must already be there or email stops.

**Vercel → Domains (top menu, team level) → click the domain → DNS
Records → Add Record.** For each row: Name (leave **empty** for the root
of the domain), Type, Value, Priority for MX, TTL default.

Faster alternative with the Vercel CLI (imports the same records):
`vercel dns import <domain> docs/dns/zones/<domain>.zone`

### anniemay.com.au

| Name | Type | Value | Priority |
| --- | --- | --- | --- |
| *(empty)* | MX | `anniemay-com-au.mail.protection.outlook.com` | 0 |
| `autodiscover` | CNAME | `autodiscover.outlook.com` | |
| *(empty)* | TXT | `v=spf1 include:_spf.mlsend.com include:spf.protection.outlook.com -all` | |
| *(empty)* | TXT | `mailerlite-domain-verification=d2f207c538a1e4ad88745de4dc20f2909d44a862` | |
| *(empty)* | TXT | `mscid=Su9g3Kw3MwbA/DPq68OpD49HiMOcQqcHGWCkyIMhdpxMYMBvkQHMrs27i2a4Ci778LtL7hiKCcChOQqjeWNqjA==` | |
| `_dmarc` | TXT | `v=DMARC1; p=none;` (new: Gmail and Yahoo expect one for MailerLite sends) | |
| `litesrv._domainkey` | CNAME | `litesrv._domainkey.mlsend.com` | |
| `em944325` | CNAME | `return.smtp2go.net` | |
| `link` | CNAME | `track.smtp2go.net` | |
| `s944325._domainkey` | CNAME | `dkim.smtp2go.net` | |

### theprescriptionpad.com.au

| Name | Type | Value | Priority |
| --- | --- | --- | --- |
| `mail` | A | `110.232.143.129` | |
| *(empty)* | MX | `mail.theprescriptionpad.com.au` | 0 |
| *(empty)* | TXT | `v=spf1 a mx include:_spf.mlsend.com ?all` | |
| *(empty)* | TXT | `mailerlite-domain-verification=29cabab3d8cac074632d7153fdf64bbf88862c0b` | |
| `_dmarc` | TXT | `v=DMARC1; p=none;` | |
| `default._domainkey` | TXT | the long `v=DKIM1; ...` value from `docs/dns/zones/theprescriptionpad.com.au.zone`, as one line, no quotes | |
| `litesrv._domainkey` | CNAME | `litesrv._domainkey.mlsend.com` | |
| `em931085` | CNAME | `return.smtp2go.net` | |
| `link` | CNAME | `track.smtp2go.net` | |
| `s931085._domainkey` | CNAME | `dkim.smtp2go.net` | |

### tenfiftybakers.com.au

| Name | Type | Value | Priority |
| --- | --- | --- | --- |
| `mail` | A | `110.232.143.129` | |
| `webmail` | A | `110.232.143.129` | |
| *(empty)* | MX | `mail.tenfiftybakers.com.au` | 0 |
| *(empty)* | TXT | `v=spf1 a mx include:_spf.mlsend.com ?all` | |
| *(empty)* | TXT | `mailerlite-domain-verification=a03098d4706c022785712c309001ffcc29ff965b` | |
| `_dmarc` | TXT | `v=DMARC1; p=none;` | |
| `default._domainkey` | TXT | the long `v=DKIM1; ...` value from `docs/dns/zones/tenfiftybakers.com.au.zone`, as one line, no quotes | |
| `litesrv._domainkey` | CNAME | `litesrv._domainkey.mlsend.com` | |
| `em931085` | CNAME | `return.smtp2go.net` | |
| `link` | CNAME | `track.smtp2go.net` | |
| `s931085._domainkey` | CNAME | `dkim.smtp2go.net` | |

Notes:
- `mail` / `webmail` / `MX` for Prescription Pad and Ten Fifty point at
  the old agency's server because that's where those inboxes live today.
  Copying them keeps email working exactly as now. Step 6 replaces them.
- The `smtp2go` records were for WordPress's mail sending. Nothing needs
  them after the cutover; keep them until you've confirmed, then delete.
- Double check each domain's list against the table before Step 3. A
  missing MX record is the one mistake that stops email.

## Step 3: Crazy Domains, switch the nameservers (the cutover)

This is the moment the new sites go live. Do Prescription Pad first,
check it, then Annie May, then Ten Fifty (already served by Vercel, so
for Ten Fifty this only moves DNS control; the site doesn't change).

For each domain: **Crazy Domains → My Domains → the domain → Name
Servers → Custom name servers**, replace

```
greg.ns.cloudflare.com
sneh.ns.cloudflare.com
```

with

```
ns1.vercel-dns.com
ns2.vercel-dns.com
```

Save. Changes usually take effect within an hour (up to 24 for some
networks).

## Step 4: confirm

- **Vercel → Settings → Domains**: each domain turns **Valid
  Configuration** and gets its SSL certificate automatically.
- https://dnschecker.org, for each domain:
  - type **NS**: `ns1.vercel-dns.com`, `ns2.vercel-dns.com`
  - type **MX**: unchanged (Outlook for Annie May, `mail.` for the others)
- Send yourself a test email to each domain's inbox.
- Run the post cutover tests in `anniemay-prescriptionpad-go-live.md`.

## Step 5: Search Console and Bing

See "Indexing" in `anniemay-prescriptionpad-go-live.md`. Submit
`https://<domain>/sitemap.xml` for all three domains. If a Search Console
property asks for DNS verification, add its TXT record in Vercel DNS (as
in Step 2, Name empty).

## Step 6: still to do, email for Prescription Pad and Ten Fifty

Their mailboxes (`hello@...`) still live on the old agency's server at
`110.232.143.129`. It's running today, but if it's switched off those
inboxes stop receiving mail. Move them (Microsoft 365 Business Basic,
like Annie May, or Google Workspace), then in **Vercel DNS** replace the
`MX`, `mail`, `webmail` and SPF records with the ones the new provider
gives you. Full steps: `hosting-migration-oct1.md`, Step 3.
