# Ten Fifty Bakers — point the domain at the Decra-served site

The mirrored Ten Fifty site (current design, unchanged) is prepared and
ready to receive `tenfiftybakers.com.au`. What Decra serves on the domain
is the exact site as it looks today, with in-place editing from the
admin, plus the events system underneath.

## What's already prepared (code, merged)

- **All eight pages mirrored and self-contained**: home,
  our-accommodation, our-story, explore, contact-us, book-now — and,
  added for this cutover, **privacy-policy** and **terms-of-service**
  (they were footer-linked but not mirrored, and would have 404'd).
  Every image, stylesheet, script and font is served locally from
  `/mirror-assets/` — nothing depends on the old WordPress host
  surviving the DNS change.
- **Clean URLs**: the middleware serves `/{page}/` exactly like the
  current WordPress permalinks, so every existing Google result keeps
  working. `www.` 308-redirects to the bare domain.
- **Booking works anywhere**: the Book Now page uses Lodgify's official
  embed (`data-website-id 616671`), loaded from Lodgify's own CDN — it
  is host-independent.
- **SEO intact**: every page keeps its original canonical
  (`https://tenfiftybakers.com.au/...`), title, meta description and
  Open Graph tags; the Google site-verification meta tag survives. On
  the domain, `/robots.txt` allows crawling and `/sitemap.xml` lists all
  eight pages plus any published event pages; `/events` is the What's-on
  index. The Decra app host itself stays noindexed.
- **No forms to break**: the site has no server-posted forms (contact is
  by phone/email links), so nothing depended on WordPress PHP.
- **Editable in place**: admin → Sites → Current sites → Ten Fifty
  Bakers → Edit mode — click text/images, Save page. Already live for
  this site today; keeps working identically on the domain.

## Pre-flight check (before touching DNS)

Preview the exact pages the domain will serve:
`https://decra-stays.vercel.app/mirror/ten-fifty-bakers/home.html`
(and `/our-accommodation.html`, `/book-now.html`,
`/privacy-policy.html`, …). Click through, check images and the booking
widget load.

## Cutover steps [you]

1. **Back up the WordPress site** (WP admin export or ask the host).
   After DNS moves, the old host is unreachable at this name.
2. **Vercel → decra-stays project → Settings → Domains**: add
   `tenfiftybakers.com.au` and `www.tenfiftybakers.com.au`; make the
   root domain primary.
3. If Vercel shows a **TXT verification record**, add it at the DNS
   host first, exactly as shown.
4. At the **registrar/DNS host**, replace only the web records with the
   values Vercel displays (typically `A @ → 76.76.21.21`,
   `CNAME www → cname.vercel-dns.com`).
   **Do not touch** MX, SPF/DKIM/DMARC TXT records, or nameservers —
   email must keep working.
5. Wait for Vercel to show the domain configured with SSL issued
   (minutes to a few hours for DNS propagation).

## Post-cutover tests

- `https://tenfiftybakers.com.au/` — home renders, images load
- `https://www.tenfiftybakers.com.au/` → redirects to the root
- `/our-accommodation/`, `/our-story/`, `/explore/`, `/contact-us/` — 200
- `/book-now/` — Lodgify booking widget loads and takes dates
- `/privacy-policy/`, `/terms-of-service/` — 200 (new)
- `/robots.txt` — allows crawling, names the sitemap
- `/sitemap.xml` — lists the pages at the production domain
- `/events` — renders (empty until an event page is published for TFB)
- a nonsense URL — returns 404

## Indexing [you]

1. Google Search Console: the site already carries its
   google-site-verification meta tag, so the existing Search Console
   property should keep verifying. If not, add a Domain property with a
   DNS TXT record.
2. Submit `https://tenfiftybakers.com.au/sitemap.xml`.
3. URL-inspect the home page → Request indexing.
4. Since URLs, titles and canonicals are identical to the current site,
   rankings should carry over with no migration penalty — Google mostly
   just sees a hosting change.

## Afterwards

- Edit any page: admin → Sites → Current sites → Ten Fifty Bakers →
  Edit mode.
- Publish event pages for TFB (e.g. the Tasmanian Craft Fair, 30 Oct–1
  Nov, matching its 6-night gap) — they appear at
  `tenfiftybakers.com.au/events/...` and join the sitemap automatically.
