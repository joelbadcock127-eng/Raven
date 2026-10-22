# Cutover: the three sites on Cloudflare (free), Decra admin on Vercel

Every step you need to do, in order, with exact values. Checked against
live DNS on 22 Oct 2026.

## How it fits together

| Job | Who | Cost |
| --- | --- | --- |
| Domain names (own and renew) | Crazy Domains, unchanged | as now |
| DNS (where website and email live) | **Cloudflare**, your account | free |
| The three websites | **Cloudflare worker `decra-sites`** (`sites-worker/` in the repo) | free |
| Decra admin (editing, events, bookings, AI) | **Vercel**, as today | free (Hobby) |
| Contact form emails | Web3Forms | free |

- Visitors only ever reach Cloudflare. The worker serves images, fonts
  and scripts itself, and asks Decra on Vercel for each page, so your
  admin edits show up live.
- If Vercel doesn't answer, the worker serves its own copy of each page,
  so the sites stay up. Event pages and private booking links wait for
  Vercel to come back.
- The admin is now password protected, and no longer reachable on the
  property domains (`/settings`, `/reservations` etc. return 404 there).
- Vercel's free Hobby plan is officially for non-commercial use. Decra is
  now only your internal tool, which lowers that risk, but upgrading the
  admin to Pro later is the clean option.

**Where things stand:** the three domains' nameservers are
`greg.ns.cloudflare.com` / `sneh.ns.cloudflare.com`, the **old agency's**
Cloudflare account. Moving them to **your** Cloudflare account is the
cutover.

---

## Part A: Vercel (the admin), right away

The new code is merged to `main`, and Vercel redeploys automatically.
Until you set the password, the admin shows
"Decra admin is locked: set ADMIN_PASSWORD ...". Do this first:

1. **Vercel → decra project → Settings → Environment Variables**, add
   (Environment: Production):

   | Name | Value |
   | --- | --- |
   | `ADMIN_PASSWORD` | a long password of your choice |
   | `WEB3FORMS_KEYS` | `annie-may=KEY1,prescription-pad=KEY2,ten-fifty-bakers=KEY3` |

   For the Web3Forms keys: at web3forms.com, enter the email address that
   should get each property's enquiries and they email you a key. Use an
   inbox that doesn't depend on the old agency's server (a Gmail address,
   or Annie May's Microsoft 365 mailbox) until Part H is done.
2. **Deployments → the latest → ⋯ → Redeploy**, so the variables apply.
3. Open `https://decra-stays.vercel.app`. The browser asks for a username
   and password: any username, your `ADMIN_PASSWORD` as the password.
   The browser remembers it for the session.

Still public on purpose: private booking links (`/book/...`), tracked
links (`/go/...`), bio pages (`/l/...`), the phone upload page (`/u`)
and the scheduled jobs (they check `CRON_SECRET` themselves).

## Part B: create the Cloudflare worker

1. Log in to **Cloudflare** with the account that already holds Decra's
   media storage (R2), or create one (free).
2. **Workers & Pages → Create → Import a repository** (GitHub). Connect
   GitHub if asked, and choose **joelbadcock127-eng/Raven**.
3. Settings:

   | Field | Value |
   | --- | --- |
   | Project name | `decra-sites` (must be exactly this) |
   | Production branch | `main` |
   | Root directory (Advanced) | `sites-worker` |
   | Build command | `npm run build` |
   | Deploy command | `npx wrangler deploy` |

   **Create and deploy.** Every push to `main` redeploys it from now on.
4. **decra-sites → Settings → Variables and Secrets → Add**: `WEB3FORMS_KEYS`,
   type Text, same value as in Vercel. (Used only when Vercel is down.)
5. **Preview before touching DNS.** The worker's address is shown on its
   overview, like `https://decra-sites.<you>.workers.dev`. Open:
   - `https://decra-sites.<you>.workers.dev/?site=anniemay.com.au`
   - `https://decra-sites.<you>.workers.dev/?site=theprescriptionpad.com.au`
   - `https://decra-sites.<you>.workers.dev/?site=tenfiftybakers.com.au`

   Click around: menus, pages, images, the booking page, a test contact
   message. The choice sticks while you browse; use `?site=` again to
   switch. Previews are never indexed.

## Part C: move each domain's DNS into your Cloudflare

Do one domain at a time, **Prescription Pad first**, then Annie May, then
Ten Fifty. Pick a quiet hour for each.

1. **Cloudflare → Add a domain** → enter the domain → **Free** plan.
2. If Cloudflare scans and lists existing records, **delete them all**
   (they're the old agency's proxy addresses, not real ones).
3. **DNS → Records → Import and Export → Import**, choose
   `docs/dns/zones/<domain>.zone` from the repo, and **untick "Proxy
   imported DNS records"**. Check the list against the tables below:
   every record **DNS only** (grey cloud).
4. **Ten Fifty only, to stay online during the switch:** also add these
   temporary records (DNS only). They keep Ten Fifty on Vercel until Part D:

   | Type | Name | Content |
   | --- | --- | --- |
   | A | `@` | `216.198.79.1` |
   | A | `@` | `64.29.17.1` |
   | CNAME | `www` | `dae77df2a44cfda1.vercel-dns-017.com` |

   (Annie May and Prescription Pad are briefly offline between Part C
   step 6 and Part D, usually a few minutes.)
5. Cloudflare shows **two nameservers** for your account, like
   `xxx.ns.cloudflare.com` and `yyy.ns.cloudflare.com`. Note them.
6. **Crazy Domains → My Domains → the domain → Name Servers → Custom**:
   replace `greg.ns.cloudflare.com` and `sneh.ns.cloudflare.com` with
   your two. Save.
7. Back in Cloudflare, the domain's overview says "Pending". Click
   **Check nameservers**. It turns **Active** within minutes to a few
   hours, and Cloudflare emails you.

### Records per domain (what the import adds)

**theprescriptionpad.com.au**

| Type | Name | Content | Priority |
| --- | --- | --- | --- |
| A | `mail` | `110.232.143.129` | |
| MX | `@` | `mail.theprescriptionpad.com.au` | 0 |
| TXT | `@` | `v=spf1 a mx include:_spf.mlsend.com ?all` | |
| TXT | `@` | `mailerlite-domain-verification=29cabab3d8cac074632d7153fdf64bbf88862c0b` | |
| TXT | `_dmarc` | `v=DMARC1; p=none;` | |
| TXT | `default._domainkey` | the long `v=DKIM1; ...` value in the zone file | |
| CNAME | `litesrv._domainkey` | `litesrv._domainkey.mlsend.com` | |
| CNAME | `em931085` | `return.smtp2go.net` | |
| CNAME | `link` | `track.smtp2go.net` | |
| CNAME | `s931085._domainkey` | `dkim.smtp2go.net` | |

**anniemay.com.au**

| Type | Name | Content | Priority |
| --- | --- | --- | --- |
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

**tenfiftybakers.com.au**

| Type | Name | Content | Priority |
| --- | --- | --- | --- |
| A | `mail` | `110.232.143.129` | |
| A | `webmail` | `110.232.143.129` | |
| MX | `@` | `mail.tenfiftybakers.com.au` | 0 |
| TXT | `@` | `v=spf1 a mx include:_spf.mlsend.com ?all` | |
| TXT | `@` | `mailerlite-domain-verification=a03098d4706c022785712c309001ffcc29ff965b` | |
| TXT | `_dmarc` | `v=DMARC1; p=none;` | |
| TXT | `default._domainkey` | the long `v=DKIM1; ...` value in the zone file | |
| CNAME | `litesrv._domainkey` | `litesrv._domainkey.mlsend.com` | |
| CNAME | `em931085` | `return.smtp2go.net` | |
| CNAME | `link` | `track.smtp2go.net` | |
| CNAME | `s931085._domainkey` | `dkim.smtp2go.net` | |

The `mail` / `webmail` / `MX` records for Prescription Pad and Ten Fifty
point at the old agency's server, because those inboxes still live there
(Part H). The `smtp2go` records were for WordPress's mail; keep them
until you've confirmed nothing uses them, then delete.

## Part D: attach the domain to the worker (as soon as it's Active)

1. **Ten Fifty only:** in Cloudflare → tenfiftybakers.com.au → DNS,
   delete the three temporary records (`A @` ×2, `CNAME www`).
2. **Workers & Pages → decra-sites → Settings → Domains & Routes → Add →
   Custom domain**: enter the bare domain (e.g. `theprescriptionpad.com.au`)
   → Add. Then **Add** again for `www.theprescriptionpad.com.au`.
   Cloudflare creates the DNS records and the certificate itself (a few
   minutes).
3. **The domain → SSL/TLS → Edge Certificates → Always Use HTTPS: On.**

## Part E: check each domain

- `https://<domain>/` loads; `https://www.<domain>/` redirects to it
- every page in the menu loads; `/accommodation` (no slash) redirects to
  `/accommodation/`
- on a phone: the Menu button opens the side menu
- `/contact-us/`: map shows; send a test message; it arrives by email
  and appears in the admin under Reservations → Website enquiries
- booking page: the booking widget loads and takes dates
- `/robots.txt` allows crawling; `/sitemap.xml` lists the pages
- `/settings` and a nonsense URL return 404
- https://dnschecker.org, type MX: unchanged (Outlook for Annie May,
  `mail.` for the others). Send a test email to each inbox.

## Part F: tidy up

- After Ten Fifty has moved: **Vercel → decra project → Settings →
  Domains** → remove `tenfiftybakers.com.au` and `www.tenfiftybakers.com.au`.
  The admin stays at `decra-stays.vercel.app`.
- Day to day nothing changes: edit pages in the admin (live within
  seconds); code changes pushed to `main` redeploy both Vercel and the
  worker automatically.

## Part G: Search Console and Bing

1. **Google Search Console**: the sites' verification tags carried over.
   If a property asks to verify again, choose the DNS TXT option and add
   that record in Cloudflare (DNS only).
2. Submit `https://<domain>/sitemap.xml` for all three domains, and
   URL inspect each home page → Request indexing.
3. **Bing Webmaster Tools**: import from Search Console, submit the same
   sitemaps.
4. Watch Search Console → Pages for a week for new 404s.

## Part H: still to do, email for Prescription Pad and Ten Fifty

Their mailboxes (`hello@...`) live on the old agency's server
(`110.232.143.129`). It runs today, but if it's switched off those
inboxes stop receiving mail. Move them (Microsoft 365 Business Basic,
like Annie May, or Google Workspace), then in **your Cloudflare** replace
the `MX`, `mail`, `webmail` and SPF records with the new provider's.
Full steps: `hosting-migration-oct1.md`, Step 3.
