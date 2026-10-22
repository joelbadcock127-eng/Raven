# DNS cutover: nameservers, Cloudflare and Vercel

Every step, in order, with the exact values. Checked against live DNS on
22 Oct 2026.

**Where things stand:** all three domains are registered at Crazy Domains,
but their nameservers are `greg.ns.cloudflare.com` and
`sneh.ns.cloudflare.com`. That is the old agency's (Island Creative's)
Cloudflare account. While those nameservers are set, any DNS you edit at
Crazy Domains is ignored. The plan moves DNS into **your own** Cloudflare
account (free plan), then points the nameservers there.

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

## Step 1: Vercel, add the domains

**Vercel → the Decra project → Settings → Domains → Add**:

| Add | Setting |
| --- | --- |
| `theprescriptionpad.com.au` | primary |
| `www.theprescriptionpad.com.au` | redirect to `theprescriptionpad.com.au` (308) |
| `anniemay.com.au` | primary |
| `www.anniemay.com.au` | redirect to `anniemay.com.au` (308) |

(`tenfiftybakers.com.au` and `www.tenfiftybakers.com.au` are already
there.)

Each domain shows "Invalid Configuration" until DNS moves. That's
expected. Open each one and **note the values Vercel asks for**. They
should be the same as Ten Fifty's, which work today:

- root: `A` → `216.198.79.1` (Vercel may also list `64.29.17.1`)
- www: `CNAME` → `dae77df2a44cfda1.vercel-dns-017.com`

If Vercel shows different values, use Vercel's in Step 2. If it asks for
a `TXT` record named `_vercel` (domain verification), add that too.

## Step 2: your Cloudflare, add each domain and its records

Log in to Cloudflare as joel.badcock127@gmail.com (create the account if
needed). For each domain: **Add a domain** → enter it → **Free** plan.

Cloudflare offers to scan existing records. Delete whatever it finds and
enter the records below instead. A scan picks up the old agency's proxy
addresses, not the real ones. Alternatively **DNS → Records → Import**
the matching file from `docs/dns/cloudflare-import/` (same records).

**Every record: Proxy status = DNS only (grey cloud). TTL = Auto.**

### theprescriptionpad.com.au

| Type | Name | Content | Priority |
| --- | --- | --- | --- |
| A | `@` | `216.198.79.1` | |
| A | `@` | `64.29.17.1` | |
| CNAME | `www` | `dae77df2a44cfda1.vercel-dns-017.com` | |
| A | `mail` | `110.232.143.129` | |
| MX | `@` | `mail.theprescriptionpad.com.au` | 0 |
| TXT | `@` | `v=spf1 a mx include:_spf.mlsend.com ?all` | |
| TXT | `@` | `mailerlite-domain-verification=29cabab3d8cac074632d7153fdf64bbf88862c0b` | |
| TXT | `_dmarc` | `v=DMARC1; p=none;` | |
| TXT | `default._domainkey` | copy the full `v=DKIM1; ...` value from `docs/dns/cloudflare-import/theprescriptionpad.com.au.zone` (joined into one line, no quotes) | |
| CNAME | `litesrv._domainkey` | `litesrv._domainkey.mlsend.com` | |
| CNAME | `em931085` | `return.smtp2go.net` | |
| CNAME | `link` | `track.smtp2go.net` | |
| CNAME | `s931085._domainkey` | `dkim.smtp2go.net` | |

### anniemay.com.au

| Type | Name | Content | Priority |
| --- | --- | --- | --- |
| A | `@` | `216.198.79.1` | |
| A | `@` | `64.29.17.1` | |
| CNAME | `www` | `dae77df2a44cfda1.vercel-dns-017.com` | |
| MX | `@` | `anniemay-com-au.mail.protection.outlook.com` | 0 |
| CNAME | `autodiscover` | `autodiscover.outlook.com` | |
| TXT | `@` | `v=spf1 include:_spf.mlsend.com include:spf.protection.outlook.com -all` | |
| TXT | `@` | `mailerlite-domain-verification=d2f207c538a1e4ad88745de4dc20f2909d44a862` | |
| TXT | `@` | `mscid=Su9g3Kw3MwbA/DPq68OpD49HiMOcQqcHGWCkyIMhdpxMYMBvkQHMrs27i2a4Ci778LtL7hiKCcChOQqjeWNqjA==` | |
| TXT | `_dmarc` | `v=DMARC1; p=none;` (new: Gmail and Yahoo expect one for MailerLite sends) | |
| CNAME | `litesrv._domainkey` | `litesrv._domainkey.mlsend.com` | |
| CNAME | `em944325` | `return.smtp2go.net` | |
| CNAME | `link` | `track.smtp2go.net` | |
| CNAME | `s944325._domainkey` | `dkim.smtp2go.net` | |

### tenfiftybakers.com.au

| Type | Name | Content | Priority |
| --- | --- | --- | --- |
| A | `@` | `216.198.79.1` | |
| A | `@` | `64.29.17.1` | |
| CNAME | `www` | `dae77df2a44cfda1.vercel-dns-017.com` | |
| A | `mail` | `110.232.143.129` | |
| A | `webmail` | `110.232.143.129` | |
| MX | `@` | `mail.tenfiftybakers.com.au` | 0 |
| TXT | `@` | `v=spf1 a mx include:_spf.mlsend.com ?all` | |
| TXT | `@` | `mailerlite-domain-verification=a03098d4706c022785712c309001ffcc29ff965b` | |
| TXT | `_dmarc` | `v=DMARC1; p=none;` | |
| TXT | `default._domainkey` | copy the full `v=DKIM1; ...` value from `docs/dns/cloudflare-import/tenfiftybakers.com.au.zone` (joined into one line, no quotes) | |
| CNAME | `litesrv._domainkey` | `litesrv._domainkey.mlsend.com` | |
| CNAME | `em931085` | `return.smtp2go.net` | |
| CNAME | `link` | `track.smtp2go.net` | |
| CNAME | `s931085._domainkey` | `dkim.smtp2go.net` | |

Notes:
- `mail` / `webmail` / `MX` for Prescription Pad and Ten Fifty still
  point at the old agency's server, because that's where those inboxes
  live today. Copying them keeps email working exactly as now. Step 6
  replaces them.
- The `smtp2go` records were for WordPress's mail sending. Nothing needs
  them after the cutover; keep them until you've confirmed, then delete.

After adding a domain, Cloudflare shows **two nameservers** for your
account (something like `xxx.ns.cloudflare.com` and `yyy.ns.cloudflare.com`).
Write them down. They're the same for all three domains in your account.

Also in Cloudflare, per domain:
- **SSL/TLS → Overview**: leave as is (DNS only records bypass it).
- **Email Routing**: leave off (it would take over the MX records).

## Step 3: Crazy Domains, switch the nameservers (the cutover)

This is the moment the new sites go live. Do Prescription Pad first,
check it, then Annie May, then Ten Fifty (already live on Vercel, so
for Ten Fifty this only moves DNS control; the site doesn't change).

For each domain: **Crazy Domains → My Domains → the domain → Name
Servers → Custom name servers**, replace

```
greg.ns.cloudflare.com
sneh.ns.cloudflare.com
```

with the two nameservers your Cloudflare account showed. Save.

Changes usually take effect within an hour (up to 24 for some
networks). Cloudflare emails you when the domain becomes **Active**.

## Step 4: confirm in Vercel

Vercel → Settings → Domains: each domain turns **Valid Configuration**
and issues its SSL certificate automatically. Then run the post cutover
tests in `anniemay-prescriptionpad-go-live.md`.

Quick checks from any computer:
- https://dnschecker.org → `anniemay.com.au`, type NS: shows your
  Cloudflare nameservers
- type A: `216.198.79.1` / `64.29.17.1`
- type MX: unchanged (Outlook for Annie May, `mail.` for the others)

## Step 5: Search Console and Bing

See "Indexing" in `anniemay-prescriptionpad-go-live.md`. Submit
`https://<domain>/sitemap.xml` for all three domains.

## Step 6: still to do, email for Prescription Pad and Ten Fifty

Their mailboxes (`hello@...`) still live on the old agency's server at
`110.232.143.129`. It's running today, but if it's switched off those
inboxes stop receiving mail. Move them (Microsoft 365 Business Basic,
like Annie May, or Google Workspace), then in **your** Cloudflare
replace the `MX`, `mail`, `webmail` and SPF records with the ones the
new provider gives you. Full steps: `hosting-migration-oct1.md`, Step 3.
