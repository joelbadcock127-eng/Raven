# Island Creative offboarding — migration plan (deadline: 1 October 2026)

Erica (The Island Creative) ends hosting & maintenance for all three
properties on 1 Oct. Everything on her server (110.232.143.129) and in
her Cloudflare account must move before then. Her cPanel details are in
the Website Owners Manuals (keep those PDFs private — they contain
passwords; do not commit them).

## Current state

| | Website | Email | DNS |
| --- | --- | --- | --- |
| Ten Fifty Bakers | ✅ LIVE on Vercel (28 Aug) | ⚠️ hello@ mailbox on her cPanel | ⚠️ her Cloudflare |
| The Prescription Pad | ⚠️ still her server | ⚠️ mailbox(es) on her cPanel | ⚠️ her Cloudflare |
| Annie May | ⚠️ still her server (WP) | ✅ Microsoft 365 — safe, nothing to do | ⚠️ her Cloudflare |

## Step 1 — Backups NOW (while cPanel access works)

For each cPanel account (credentials in each site's owners manual,
server `https://syn02ce.syd7.hostyourservices.net:2083`):
- cPanel → **Backup → Download a Full Account Backup**. This captures
  the WordPress files, databases AND the email mailboxes.
- Also note every email account under cPanel → **Email Accounts**
  (address list needed for Step 3).
- The TFB manual covers the `tenfifty` account; get the equivalent
  manuals/logins for Annie May and Prescription Pad (Erica re-attached
  them — file all three).

## Step 2 — DNS into our own Cloudflare (no dependency on Erica)

We hold the domain registrations at Crazy Domains, and Erica's zone
exports are saved in `docs/dns/` — so we can move DNS ourselves:

1. Create/log into the Cloudflare account (joel.badcock127@gmail.com).
   **Add site** → enter the domain → Free plan.
2. When Cloudflare offers to scan records, instead use
   **DNS → Records → Import** and upload the matching file from
   `docs/dns/cloudflare-import/` (web records already point at Vercel;
   all email records preserved).
3. Check every imported record shows **DNS only** (grey cloud).
4. Cloudflare shows two nameservers for your account. At
   **Crazy Domains → the domain → Name Servers**, replace
   `greg.ns.cloudflare.com` / `sneh.ns.cloudflare.com` with yours.
5. Repeat for all three domains. Order: Prescription Pad and Annie May
   any time; Ten Fifty last (it's live — pick a quiet hour; the zone
   data is identical so the cutover is seamless).
6. First add `theprescriptionpad.com.au` + `www`, and `anniemay.com.au`
   + `www`, to Vercel → decra-stays → Settings → Domains (root primary,
   www redirect) — same flow as Ten Fifty. If Vercel shows a different
   CNAME target than `dae77df2a44cfda1.vercel-dns-017.com`, use the one
   it shows and fix the imported record.

Note: switching Annie May's and Prescription Pad's DNS to the imported
zones is ALSO their website cutover — the new sites go live at that
moment. Do the pre-cutover checks in their go-live docs first.

## Step 3 — Email migration (TFB + Prescription Pad only)

The `hello@` mailboxes live on Erica's cPanel and die 1 Oct.

1. Choose a provider — recommended: **Microsoft 365 Business Basic**
   (matches Annie May's setup) or Google Workspace, one licence per
   mailbox.
2. Create the mailboxes; the provider gives MX/SPF/DKIM records — add
   them in OUR Cloudflare (replacing `MX 0 mail.<domain>` and updating
   the SPF include; remove the `mail.`/`webmail.` A records once done).
3. Migrate old mail via the provider's IMAP migration tool
   (server `syn02ce.syd7.hostyourservices.net`, port 993; mailbox
   passwords from cPanel → Email Accounts, or ask Erica).
4. Update anything that logs into the old mailbox (phones, laptops,
   MailerLite sender verification, booking-engine notification
   addresses).

## Step 4 — Third-party accounts to confirm with Erica

- **MailerLite** — the sending domains are verified and DKIM'd
  (`litesrv._domainkey` records kept). Confirm the MailerLite account
  login is ours, not hers.
- **SMTP2GO** — was WordPress's mail sender ($15/mo on her plan). The
  new sites don't need it; records kept for now, can be removed later.
  Confirm nothing else sends through it.
- **Lodgify / Preno / analytics** — confirm no other services bill
  through or log in via The Island Creative.

## Step 5 — Confirm completion to Erica

Once all three sites serve from Vercel, DNS resolves from OUR
Cloudflare nameservers, and the two mailboxes work at the new provider:
email Erica confirming the server and DNS are migrated, and ask her to
confirm the hosting/maintenance plan is cancelled with nothing further
billed.
