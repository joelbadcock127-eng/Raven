# Connecting Instagram so Raven can publish

Until this is done, Raven still drafts and schedules everything — posts just
stop at **approved** and the Social page shows "Meta not connected, manual
posting for now". Once connected, the Publish button posts straight to
Instagram and the nightly insights sync starts filling in reach, likes and
saves.

Raven auto-detects which route you used from the token itself
(`apps/web/src/lib/meta.ts`):

- **Route B — Instagram login** (this guide, ~15 minutes): Instagram only,
  no Facebook Page needed. Token starts with `IG`. Lasts 60 days, but Raven's
  nightly cron refreshes it automatically and stores the newest copy in the
  database — so in practice it never expires. **Recommended.**
- **Route A — Facebook login** (appendix at the bottom): the older path via a
  Facebook Page token (`EAA…`). More steps, but never expires on its own and
  also unlocks Facebook posting.

---

## What you need at the end

Two values, set as environment variables in Vercel:

| Variable | What it is |
|---|---|
| `META_ACCESS_TOKEN` | The Instagram access token (starts with `IG`) |
| `IG_USER_ID` | The Instagram account ID (a number, shown next to the token) |

---

## Step 0 — Prerequisites

1. **The Instagram account must be a professional account** — Business *or*
   Creator both work on this route.
   Instagram app: Settings → Account type and tools → Switch to professional
   account. (If it's already professional, nothing to do.)
2. **You need the Instagram account's login** for one authorisation popup in
   Step 2. Whoever owns the account will get Instagram's usual "new login"
   notification, and the app appears afterwards under Instagram Settings →
   Website permissions → Apps and websites — so make sure the account owner
   knows this is happening.
3. No Facebook Page and no Facebook account linkage is needed.

---

## Step 1 — Create a Meta app (~5 min, once)

1. Go to <https://developers.facebook.com/apps/> and log in — **your own
   Facebook account is fine here**; this login has nothing to do with which
   Instagram account gets connected.
2. **Create app**. When asked for a use case, choose
   **"Instagram API with Instagram Login"** (on some consoles: create the app
   as type **Business**, then add the **Instagram** product and pick the
   *Instagram login* setup inside it).
3. Name it something like `Raven Publisher` → create.

**Leave the app in Development mode.** Publishing to accounts you administer
works fine in Development mode and avoids App Review entirely.

---

## Step 2 — Generate the token (~2 min)

1. In the app dashboard, open **Instagram → API setup with Instagram login**.
2. Under **"Generate access tokens"**, click **Add account** and log in with
   the Instagram account (@anniemaybnb) in the popup, accepting the requested
   permissions — make sure `instagram_business_content_publish` and
   `instagram_business_manage_insights` are among them.
3. The dashboard now shows the connected account with its **ID** (a long
   number) and a **Generate token** button. Click it, complete the popup, and
   copy the token — it's long and starts with `IG`.

That's it. No Graph API Explorer, no token exchanges, no ID hunting:

- the token → `META_ACCESS_TOKEN`
- the account ID shown next to it → `IG_USER_ID`

---

## Step 3 — Set the variables in Vercel

1. Vercel → the Raven project → **Settings** → **Environment Variables**.
2. Add both for **Production**:

   ```
   META_ACCESS_TOKEN = IG…   (the token from step 2)
   IG_USER_ID        = …     (the account ID from step 2)
   ```

3. **Redeploy** — env vars only take effect on a new deployment
   (Deployments → latest → ⋯ → Redeploy).

---

## Step 4 — Verify

Open Raven → **Social**. The badge at the top of the queue should read
**"Meta connected"**.

Then one real end-to-end test:

1. Draft a post (Posting plans → one-off → today).
2. Approve it.
3. Hit **Publish now**.
4. A published post shows a **"view live ↗"** link. If it fails, the exact
   Graph API error appears on the post card — Meta's own wording, usually
   naming the missing permission.

---

## How the token stays alive

Instagram-login tokens expire after 60 days, but each refresh grants a fresh
60. Raven's nightly crons call the refresh endpoint weekly and store the
newest token in the `app_config` table (run migration
`supabase/migrations/0017_app_config.sql` once so the table exists). The env
var only seeds the very first token — you never update it again.

The one way this chain breaks: if **no cron runs for 60+ days** (e.g. the
deployment is paused) the token lapses and you redo Step 2 — two minutes.
Changing the Instagram password or removing the app under Website permissions
also invalidates it.

---

## The rest of the posting sequence

Publishing is the last step of a chain. For the whole sequence to run
unattended you also need:

| Variable | Why |
|---|---|
| `ANTHROPIC_API_KEY` | Writes the captions. Without it posts are drafted with an empty caption. |
| `CRON_SECRET` | Guards the scheduled routes. Vercel sends it as `Authorization: Bearer …` to your crons automatically. Without it the insights sync returns 401. |
| R2 vars (`R2_*`) | Media must be at a **publicly reachable URL** — Meta fetches the image or video from your URL. Private buckets fail. |

Scheduled runs (configured in `apps/web/vercel.json`, times are UTC):

- `0 20 * * *` → `/api/social/draft` — drafts posts from active posting plans (also refreshes the token)
- `0 21 * * *` → `/api/social/insights` — refreshes reach, saves, likes, comments (also refreshes the token)

Run either by hand with:
`https://YOUR_APP_URL/api/social/insights?secret=YOUR_CRON_SECRET`

---

## Things that will bite you

- **Media must be public.** Meta downloads the file from the URL Raven
  supplies. Anything behind auth fails with an unhelpful media error.
- **Reels and stories are slow.** Raven polls Meta for up to 2 minutes while
  it transcodes. A "timed out waiting for Meta to process media" error
  usually means the video is large or not a standard MP4 (H.264/AAC).
- **Instagram allows 50 published posts per rolling 24 hours** via the API.
- **Carousels are capped at 10 images** — Raven trims to 10 automatically.
- **Facebook posting is not available on this route** — a post set to
  "facebook" or "both" will report a clear error for the Facebook half.
  Switch to Route A (below) if/when Facebook matters.
- **Stories don't return insights** the same way posts do; blank metrics
  there are expected, not a bug.

---

## Multiple properties

Raven holds one credential set, so it publishes to a single Instagram
account (Annie May, for now). To add the other properties later, extend
`lib/meta.ts` to look up per-property credentials (e.g.
`IG_USER_ID_TEN_FIFTY_BAKERS`) — each account just repeats Step 2 in the
same Meta app. Small change when wanted.

---

## Appendix — Route A: Facebook login (never-expiring Page token + Facebook posts)

The older route. Use it only if you need Facebook posting or genuinely
prefer a token with no expiry. Summary (the previous version of this doc
described it in full):

1. Instagram account must be **Business** (not Creator) and **linked to a
   Facebook Page** you admin.
2. Create a Meta app (type Business, Instagram product added).
3. Graph API Explorer → user token with `instagram_basic`,
   `instagram_content_publish`, `instagram_manage_insights`,
   `pages_show_list`, `pages_read_engagement` (+ `pages_manage_posts` for FB
   posting, `business_management` if the Page sits in a Business Portfolio).
4. Exchange short-lived → long-lived user token
   (`/oauth/access_token?grant_type=fb_exchange_token&…`), then
   `/me/accounts` to get the **Page token** (`EAA…`, never expires) and
   **Page ID**.
5. `/{PAGE_ID}?fields=instagram_business_account` → the `IG_USER_ID`.
6. Set `META_ACCESS_TOKEN` (Page token), `IG_USER_ID`, `FB_PAGE_ID` in
   Vercel and redeploy.

Raven detects the `EAA` prefix and routes calls to graph.facebook.com
automatically.
