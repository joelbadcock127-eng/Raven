# Annie May and The Prescription Pad: point the domains at the clones

Exact clones of both current WordPress sites are built into Decra, the
same way Ten Fifty Bakers has been served since 28 August. Once DNS
moves, `anniemay.com.au` and `theprescriptionpad.com.au` serve the sites
exactly as they look today, editable from the admin, with the events
system underneath. WordPress and the old host are then no longer needed.

## What's prepared (code)

- **Every page in the live sitemaps is cloned** (refreshed 22 Oct 2026):

  | Annie May | The Prescription Pad |
  | --- | --- |
  | `/` | `/` |
  | `/accommodation/` | `/accommodation/` |
  | `/annie-mays-story/` | `/about/` |
  | `/explore/` | `/explore/` |
  | `/contact-us/` | `/contact-us/` |
  | `/book-now/` | `/bookings/` |
  | `/privacy-policy/` | `/privacy-policy/` |
  | `/terms-of-service/` | `/terms-of-service/` |
  | `/disclaimer/` | `/disclaimer/` |
  | `/competition/` | `/competition/` |
  | `/competition-terms-conditions/` | `/competition-terms-conditions/` |

- **Self contained**: every image, stylesheet, script and font is copied
  into Decra (`/mirror-assets/`), including the images in structured data
  and those that scripts load later. A browser crawl of every page made
  zero requests to WordPress, the old agency's servers or GeneratePress.
  Annie May's Ginger heading font, which the WordPress site loaded from
  the agency's (now dead) staging server, is served from Decra's copy,
  so it displays again. Share images (`og:image`) use full URLs.
- **Same URLs as WordPress**, trailing slash included. `/page` redirects
  to `/page/`, `www.` redirects to the bare domain, unknown URLs return
  a real 404. Old image URLs (`/wp-content/uploads/...`, as indexed by
  Google Images or linked from emails) keep working.
- **Scripts that WordPress held back now run**: the old LiteSpeed cache
  delayed Google Analytics, jQuery, the mobile menu and the MailerLite
  loader until its own runtime started them. The clones run them
  normally, so analytics keeps recording (Annie May `GT-TXH3WHGQ`,
  Prescription Pad `GT-W6JTGV76`), and the competition sign up forms
  (MailerLite) work.
- **Contact forms rewired**: the Forminator forms on the `/contact-us/`
  pages (Ten Fifty's too) used to post to WordPress. The visitor's
  browser now sends each message to **Web3Forms** (free, emails it to
  you; keys set in the `WEB3FORMS_KEYS` env var, see `dns-cutover.md`
  Step 0) and to Decra, which keeps a copy under **Reservations →
  Website enquiries**. The Google Maps embeds on those pages load too.
- **Booking**: Annie May's `/book-now/` uses Preno's Swiftbook widget
  (and her room buttons link to Preno's book direct page); Prescription
  Pad's `/bookings/` uses the Lodgify widget. Both load from the
  provider, so hosting doesn't affect them.
- **SEO intact**: titles, meta descriptions, canonicals, Open Graph tags,
  structured data and the Google verification tags are unchanged. Each
  domain serves its own `/robots.txt` (crawl allowed) and `/sitemap.xml`
  (all eleven pages plus any published event pages). WordPress only
  head links (RSS feeds, wp-json, xmlrpc) were removed so crawlers don't
  chase dead URLs. The Decra app host stays `Disallow: /`.
- **Annie May's new bespoke site is parked, not deleted.** It no longer
  takes over the domain. To launch it later, set `bespoke: true` for
  Annie May in `apps/web/src/lib/sites.ts` (and swap her `pages` back to
  the V2 slugs); the old WordPress URLs then 301 to the new ones, as
  described in `anniemay-go-live.md`.

## Pre-flight (before touching DNS)

1. Merge and deploy this branch.
2. Preview exactly what each domain will serve, in the admin → Sites →
   Current sites, or directly:
   `https://<decra app>/m/live/annie-may/home.html`,
   `https://<decra app>/m/live/prescription-pad/home.html`
   (and `/contact-us.html`, `/book-now.html`, `/bookings.html`, ...).
3. **Back up both WordPress sites** if not already done (cPanel → Backup
   → Download a Full Account Backup). After the move, WordPress is
   unreachable at these names.

## Cutover [you]

**Exact values for every record are in `dns-cutover.md`.** In short:

Same flow as Ten Fifty. Do one domain at a time; Prescription Pad first
is a good warm up.

1. **Vercel → decra project → Settings → Domains**: add
   `theprescriptionpad.com.au` and `www.theprescriptionpad.com.au`
   (root primary, www redirects to it). Repeat for `anniemay.com.au` and
   `www.anniemay.com.au`. Vercel shows the exact records it wants; note
   them. If it asks for a TXT verification record, add that first.
2. **Point the web records at Vercel.** Two ways, pick one:
   - **Moving DNS to your own Cloudflare** (the plan in
     `hosting-migration-oct1.md`): import
     `docs/dns/cloudflare-import/<domain>.zone`, check the root and
     `www` records match what Vercel showed in step 1 (fix them if not),
     make sure every record is **DNS only** (grey cloud), then change
     the nameservers at Crazy Domains. The nameserver switch is the
     cutover moment.
   - **Staying on the current Cloudflare for now**: in that account,
     change only the root (`@`) and `www` records to the values Vercel
     showed, set to **DNS only** (grey cloud).
3. **Don't touch** MX, SPF, DKIM, DMARC, autodiscover or MailerLite
   records. Email keeps flowing exactly as before.
4. Wait for Vercel to show each domain as configured with SSL issued
   (minutes, occasionally a few hours).

## Post cutover tests

For each domain:

- `/` renders with images; `www.` redirects to the bare domain
- each page in the table above returns 200; `/accommodation` (no slash)
  redirects to `/accommodation/`
- mobile: the Menu button opens the side menu
- `/contact-us/`: the map shows; send a test message and check it
  appears under admin → Reservations → Website enquiries
- the booking page loads the booking widget and takes dates
- `/competition/`: the MailerLite sign up form shows
- `/robots.txt` allows crawling and names the sitemap
- `/sitemap.xml` lists the eleven pages at the real domain
- a nonsense URL returns 404
- Google Analytics → Realtime shows your visit

## Indexing [you]

1. **Google Search Console**: the verification tags carried over, so
   existing properties should keep verifying. If one doesn't, add a
   Domain property with a DNS TXT record.
2. Submit `https://<domain>/sitemap.xml` for each domain.
3. URL inspect the home page → Request indexing.
4. **Bing Webmaster Tools**: import from Search Console, submit the same
   sitemaps (Bing also feeds ChatGPT and Copilot search).
5. URLs, titles and canonicals are identical to WordPress, so Google
   sees a hosting change, not a migration. Rankings should hold. Watch
   Search Console → Pages for a week for any new 404s.
