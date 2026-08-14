# Annie May — go-live checklist

How to make the new (V2) site the live anniemay.com.au, get it indexed
by Google, and get click-to-edit text like the current WordPress site.

Steps marked **[code]** are development tasks — ask Claude/a developer
to do them in this repo. Steps marked **[you]** happen in accounts only
you control (registrar, Vercel, Google).

---

## Part 1 — Make the V2 site the live anniemay.com.au

Today anniemay.com.au points at the old WordPress host. The Raven app
already knows the domain (`lib/sites.ts`) and its middleware serves
property sites on their own domains — but three code gaps have to
close first, then the domain moves.

### 1a. Code prep [code]

1. **Make V2 the default Annie May site.** `/site/annie-may` currently
   renders V1 unless `?v=2`. Flip the default in
   `app/site/[property]/page.tsx` (line ~161) so V2 is what a mapped
   domain serves.
2. **Let the domain serve the bespoke site.** Middleware only takes a
   domain over when `site_settings.live_version_id` is set, which was
   designed for builder sites. Annie May's bespoke site needs either a
   `site_settings` row for `annie-may` (with her domain in `domains`)
   or a middleware special-case, so `anniemay.com.au/story` rewrites to
   the V2 site instead of the WordPress mirror.
3. **Align the page slugs.** The standalone sitemap lists the old
   mirror slugs (`annie-mays-story`, `contact-us`) but the V2 site uses
   `story`, `explore`, `contact`, `accommodation`. Update
   `lib/sites.ts` (and add 301 redirects from the old WordPress URLs —
   `/annie-mays-story` → `/story` etc.) so no link equity is lost.
4. **Set env vars in Vercel** (Project → Settings → Environment
   Variables): `NEXT_PUBLIC_APP_URL=https://raven5.vercel.app` so the
   app can tell its own host from the property domain.

### 1b. Point the domain [you]

1. **Back up WordPress first** (export from the WP admin, or ask the
   current host for a full backup). Once DNS moves, the old site stops
   being reachable at the domain.
2. In **Vercel → the raven5 project → Settings → Domains**, add
   `anniemay.com.au` and `www.anniemay.com.au`. Vercel shows the exact
   DNS records it wants.
3. At your **domain registrar** (wherever anniemay.com.au is managed),
   replace the current records with the ones Vercel showed — typically
   an `A` record on the apex to `76.76.21.21` and a `CNAME` on `www`
   to `cname.vercel-dns.com`. DNS takes minutes to a few hours.
4. **Test**: `anniemay.com.au` should show the V2 site with clean URLs
   (`/accommodation`, `/story`, `/explore`, `/contact`), plus
   `/events/wynyard-tulip-festival-2026-10`, `/robots.txt` and
   `/sitemap.xml`.
5. **Update the links that point at the site**: Google Business
   Profile, Instagram/Facebook bios, Preno emails, any OTA profiles.

---

## Part 2 — Get it indexed on Google

The plumbing is already built: on the mapped domain the app serves a
proper `robots.txt` and a `sitemap.xml` that includes the site pages
plus every **published** event article. What's left is telling Google.

1. **[you] Google Search Console** (search.google.com/search-console):
   add a *Domain* property for `anniemay.com.au`. Verification is a
   DNS `TXT` record — add it at the registrar alongside the records
   from Part 1.
2. **[you]** In Search Console, go to **Sitemaps** and submit
   `https://anniemay.com.au/sitemap.xml`.
3. **[you]** Use **URL Inspection → Request indexing** on the home
   page and the tulip article to jump the queue.
4. **[code]** Confirm the old WordPress URLs 301 to their new
   equivalents (step 1a·3) — this is what transfers the existing
   rankings rather than starting from zero.
5. **Expectations**: the home page usually re-indexes within days;
   event articles and deeper pages within a few weeks. Watch
   Search Console → Pages for coverage and any errors.
6. Keep publishing event articles (see
   `anniemay-event-article-template.md`) — published ones join the
   sitemap automatically.

---

## Part 3 — Click-to-edit text

**What exists today**: Raven's section-based site builder (the Sites
tab) already has click-to-edit — but Annie May's V2 site doesn't use
it. The V2 site is bespoke code: every sentence lives in
`components/anniemay/data.ts` and the page components. That's what
makes it feel designed, but it means there is no edit button yet.

**Ways to edit right now**:
- Ask Claude in a session: "change the breakfast heading to …" —
  edits land in minutes and deploy with the next push.
- Event articles are already CMS content (`event_pages` rows) — their
  text is editable without touching code.

**To get true click-to-edit [code — ask for it as its own task]**:
build a *copy-override layer*:

1. A `site_copy` table in Supabase: `(property_id, key, value)` —
   one row per editable sentence, empty until something is edited.
2. Wrap the V2 site's text in a small `<Copy id="…">` component that
   renders the override if one exists, else the code default.
3. An admin-only edit mode (e.g. `?edit=1` while signed in) where
   clicking any sentence opens an inline editor and saves the override
   — same feel as WordPress, but the design stays locked so text edits
   can't break the layout.
4. Images can join the same system later (override an image slot from
   the media library).

This is roughly a day of build work and doesn't block Parts 1–2 —
the site can go live first and gain click-edit after.

---

## Suggested order

1. Code prep (1a) — ask for it in one go.
2. WordPress backup, then domains + DNS (1b).
3. Search Console + sitemap the same day DNS flips (Part 2).
4. Copy-override layer (Part 3) as the follow-up build.
