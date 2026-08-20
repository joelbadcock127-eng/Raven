# Annie May — go-live checklist

How to point anniemay.com.au at the new (V2) site and get it indexed by
Google and the AI engines — without exposing the rest of the Decra app.

**All the code prep is done and merged.** As of this doc's last update:

- The V2 site **is** Annie May's site. `/site/annie-may` serves V2 by
  default (`?v=1` keeps the old bespoke version reachable), and the
  middleware serves it on `anniemay.com.au` at clean URLs the moment
  DNS points here — no builder version or database flag needed.
- Old WordPress URLs **301-redirect** to their new homes
  (`/annie-mays-story` → `/story`, `/contact-us` → `/contact`), so
  existing Google rankings transfer instead of resetting.
- The domain serves its own **robots.txt** (allows everything except
  `/mirror/`, `/api/`, `/site/`, `/go/`) and a **sitemap.xml** listing
  the five site pages plus every published event article — new articles
  join it automatically.
- The **Decra app host** (decra5.vercel.app or any other host) serves a
  `Disallow: /` robots.txt, so the admin, the builder, and duplicate
  copies of the site are never indexed. Only the property domains are.
- **Click-to-edit works for the V2 site** in the admin → Sites →
  Current sites → Annie May: same Edit mode toggle, same behaviour —
  click text to edit in place, click an image to swap its URL, Save
  page / Revert page. Edits are overlays stored in the database
  (`site_pages`, slugs prefixed `v2-`); the site's code, design and
  animations are untouched, and saved edits appear on the live site.

What remains is account-level work only you can do:

---

## 1 · Point the domain [you]

1. **Back up WordPress first** (export from the WP admin, or ask the
   current host for a backup). Once DNS moves, the old site is no
   longer reachable at the domain.
2. In **Vercel → the decra5 project → Settings → Domains**, add
   `anniemay.com.au` and `www.anniemay.com.au`. Vercel shows the exact
   DNS records it wants.
3. In **Vercel → Settings → Environment Variables**, confirm
   `NEXT_PUBLIC_APP_URL` is set (e.g. `https://decra5.vercel.app`) so
   the app can tell its own host apart from the property domain.
4. At your **domain registrar**, replace the current records with the
   ones Vercel showed — typically `A` on the apex to `76.76.21.21` and
   `CNAME` on `www` to `cname.vercel-dns.com`. Propagation is minutes
   to a few hours.
5. **Test the domain**: `/` (home), `/accommodation`, `/story`,
   `/explore`, `/contact`, `/events/wynyard-tulip-festival-2026-10`,
   `/robots.txt`, `/sitemap.xml`, and that
   `/annie-mays-story` redirects to `/story`.
6. **Update links that point at the site**: Google Business Profile,
   Instagram/Facebook bios, Preno confirmation emails, OTA profiles.

## 2 · Google + AI indexing [you]

1. **Google Search Console** (search.google.com/search-console): add a
   *Domain* property for `anniemay.com.au`; verification is a DNS `TXT`
   record added at the registrar.
2. Submit `https://anniemay.com.au/sitemap.xml` under **Sitemaps**.
3. **URL Inspection → Request indexing** for the home page and the
   tulip article to jump the queue.
4. **Bing Webmaster Tools** (bing.com/webmasters) — one import click
   from Search Console. Bing feeds ChatGPT and Copilot answers.
5. **AI engines** (ChatGPT, Claude, Perplexity, Google AI Overviews)
   crawl via GPTBot, ClaudeBot, PerplexityBot and Googlebot — all
   allowed by the domain's robots.txt, so nothing more to do. They
   favour the same things Google does: clear titles, real
   informative content (the event articles are exactly this), and the
   business name + location in plain text.
6. **Expectations**: home page re-indexes within days, deeper pages in
   weeks. Watch Search Console → Pages for coverage errors. The 301s
   preserve the old URLs' equity.

## 3 · Editing the site day to day

- **Site copy**: Decra admin → Sites → Current sites → Annie May →
  Edit mode on → click any sentence, type, click away → Save page.
  Revert page removes every override for that page.
- **Images**: in Edit mode, click an image and paste a new URL
  (use the media library or `/mirror-assets/...` paths).
- **Event articles**: rows in the `event_pages` table (see
  `anniemay-event-article-template.md`) — no code involved.
- **Design/layout changes**: ask Claude in a session; the design stays
  in code so edits can't break the layout.
