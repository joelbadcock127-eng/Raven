# Island Creative offboarding — migration plan (deadline: 1 October 2026)

Erica (The Island Creative) ends hosting & maintenance for all three
properties on 1 Oct. Everything on her server (110.232.143.129) and in
her Cloudflare account must move before then. Her cPanel details are in
the Website Owners Manuals (keep those PDFs private — they contain
passwords; do not commit them).

## Current state

| | Website | Email | DNS |
| --- | --- | --- | --- |
| Ten Fifty Bakers | ✅ LIVE on Vercel (28 Aug) | retired (forms → Gmail) | ⚠️ her Cloudflare → moving to ours |
| The Prescription Pad | ⚠️ still her server; clone ready in Decra, see `anniemay-prescriptionpad-go-live.md` | retired (forms → Gmail) | ⚠️ her Cloudflare → moving to ours |
| Annie May | ⚠️ still her server (WP); clone ready in Decra, see `anniemay-prescriptionpad-go-live.md` | ✅ Microsoft 365 — safe, nothing to do | ⚠️ her Cloudflare → moving to ours |

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

Decision (22 Oct): the three sites run on a free Cloudflare worker, DNS
in our own Cloudflare account, the Decra admin stays on Vercel. Exact
steps and every record: **`cloudflare-cutover.md`**. The record files
for import are in `docs/dns/zones/`.

Note: switching Annie May's and Prescription Pad's nameservers to our
Cloudflare (and attaching them to the worker) is ALSO their website cutover — the new sites go live at that
moment. Do the pre-cutover checks in `anniemay-prescriptionpad-go-live.md` first.

## Step 3 — Email (decided 23 Oct: no migration)

The TFB and Prescription Pad `hello@` inboxes are retired, not moved:
enquiries reach Gmail through the website forms. Annie May stays on
Microsoft 365. Details and an optional free forwarding setup:
`cloudflare-cutover.md`, Part H.

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

Once all three sites serve from the Cloudflare worker, DNS resolves from
OUR Cloudflare nameservers, and nothing still relies on the retired mailboxes:
email Erica confirming the server and DNS are migrated, and ask her to
confirm the hosting/maintenance plan is cancelled with nothing further
billed.
