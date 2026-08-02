# Connecting Meta so Raven can publish

Until this is done, Raven still drafts and schedules everything — posts just stop
at **approved** and the Social page shows "Meta not connected, manual posting for
now". Once connected, the Publish button posts straight to Instagram and Facebook
and the nightly insights sync starts filling in reach, likes and saves.

Raven calls Graph API **v21.0** (`apps/web/src/lib/meta.ts`).

---

## What you need at the end

Three values, set as environment variables in Vercel:

| Variable | What it is | Required |
|---|---|---|
| `META_ACCESS_TOKEN` | A long-lived **Page** access token | Yes |
| `IG_USER_ID` | The Instagram **Business account** ID (a number, not the @handle) | Yes |
| `FB_PAGE_ID` | The Facebook Page ID | Only for posting to Facebook |

Raven treats Meta as connected when `META_ACCESS_TOKEN` **and** `IG_USER_ID` are
both set. Facebook posting additionally needs `FB_PAGE_ID`.

---

## Step 0 — Prerequisites (do these first or nothing else works)

1. **The Instagram account must be a Business account.** Personal and Creator
   accounts cannot use the Content Publishing API.
   In the Instagram app: Settings → Account type and tools → Switch to
   professional account → **Business**.
2. **The Instagram account must be linked to a Facebook Page.**
   Instagram app: Settings → Account type and tools → Sharing to other apps →
   Facebook, or from the Page: Settings → Linked accounts → Instagram.
3. You must be an **admin** of that Facebook Page.

Repeat per property if each has its own Instagram account. Raven currently holds
one set of credentials, so it publishes to one account — see "Multiple
properties" at the bottom.

---

## Step 1 — Create a Meta app

1. Go to <https://developers.facebook.com/apps/> and log in as the account that
   administers the Page.
2. **Create app** → use case **Other** → type **Business** → name it something
   like `Raven Publisher` → create.
3. In the app dashboard, add the **Instagram** product (in some consoles it is
   listed as "Instagram Graph API").

**Leave the app in Development mode.** For posting to Instagram accounts you own,
with you as the app admin, Development mode is sufficient and avoids App Review
entirely. You only need App Review and Advanced Access if the app publishes on
behalf of *other* people's accounts.

---

## Step 2 — Generate a token with the right permissions

1. Open the **Graph API Explorer**:
   <https://developers.facebook.com/tools/explorer/>
2. Top right: select your app in the **Meta App** dropdown.
3. **User or Page** dropdown → *User access token*.
4. Click **Add a permission** and tick all of these:

   - `instagram_basic`
   - `instagram_content_publish`  ← the one that actually allows posting
   - `instagram_manage_insights`  ← for the reach/saves sync
   - `pages_show_list`
   - `pages_read_engagement`
   - `pages_manage_posts`  ← only needed for Facebook posting
   - `business_management`  ← needed if the Page sits in a Business Portfolio

5. Click **Generate Access Token** and complete the popup, making sure you tick
   the correct Page and Instagram account when asked.

You now have a **short-lived** user token (about 1 hour). Don't use it directly.

---

## Step 3 — Turn it into a token that doesn't expire

Two exchanges. Do them in the browser address bar, or with curl.

### 3a. Short-lived user token → long-lived user token (60 days)

You need your App ID and App Secret from the app dashboard
(Settings → Basic; click **Show** for the secret).

```
https://graph.facebook.com/v21.0/oauth/access_token
  ?grant_type=fb_exchange_token
  &client_id=YOUR_APP_ID
  &client_secret=YOUR_APP_SECRET
  &fb_exchange_token=SHORT_LIVED_TOKEN_FROM_STEP_2
```

Copy the `access_token` from the response.

### 3b. Long-lived user token → Page token (does not expire)

```
https://graph.facebook.com/v21.0/me/accounts
  ?access_token=LONG_LIVED_USER_TOKEN_FROM_3A
```

The response lists your Pages. For the right Page, copy:

- `access_token` → this is your **`META_ACCESS_TOKEN`**
- `id` → this is your **`FB_PAGE_ID`**

A Page token derived from a long-lived user token does not expire on a timer. It
*is* invalidated if you change your Facebook password, remove the app, or revoke
permissions, in which case redo steps 2 and 3.

---

## Step 4 — Find `IG_USER_ID`

Using the Page ID and Page token from the previous step:

```
https://graph.facebook.com/v21.0/YOUR_FB_PAGE_ID
  ?fields=instagram_business_account
  &access_token=YOUR_PAGE_TOKEN
```

The response looks like:

```json
{ "instagram_business_account": { "id": "17841400000000000" }, "id": "1234567890" }
```

That inner `id` (usually starting `1784…`) is **`IG_USER_ID`**. It is not your
@handle and not your follower-facing profile number.

If `instagram_business_account` is missing, the Instagram account is either not
a Business account or not linked to that Page — go back to Step 0.

---

## Step 5 — Set the variables in Vercel

1. Vercel → the Raven project → **Settings** → **Environment Variables**.
2. Add each one for **Production** (and Preview if you want to test there):

   ```
   META_ACCESS_TOKEN = <Page token from step 3b>
   IG_USER_ID        = <number from step 4>
   FB_PAGE_ID        = <Page id from step 3b>
   ```

3. **Redeploy.** Environment variables only take effect on a new deployment —
   Deployments → latest → ⋯ → Redeploy.

---

## Step 6 — Verify

Open Raven → **Social**. The badge at the top of the queue should now read
**"Meta connected"** instead of "Meta not connected".

Then do one real end-to-end test:

1. Draft a post (Posting plans → *draft now*, or wait for the nightly run).
2. Approve it.
3. Hit **Publish now**.
4. A published post shows a **"view live ↗"** link. If it fails, the exact Graph
   API error is shown on the post card — that message is Meta's own wording and
   usually names the missing permission.

---

## The rest of the posting sequence

Publishing is the last step of a chain. For the whole sequence to run unattended
you also need:

| Variable | Why |
|---|---|
| `ANTHROPIC_API_KEY` | Writes the captions. Without it posts are drafted with an empty caption. |
| `CRON_SECRET` | Guards the scheduled routes. Vercel automatically sends it as `Authorization: Bearer …` to your crons when it is set. Without it the nightly draft and insights runs return 401. |
| R2 vars (`R2_*`) | Media must be at a **publicly reachable URL** — Meta fetches the image or video from your URL. Private buckets fail. |

Scheduled runs (already configured in `apps/web/vercel.json`, times are UTC):

- `0 20 * * *` → `/api/social/draft` — drafts posts from active posting plans
- `0 21 * * *` → `/api/social/insights` — refreshes reach, saves, likes, comments

Run either by hand with:
`https://YOUR_APP_URL/api/social/insights?secret=YOUR_CRON_SECRET`

---

## Things that will bite you

- **Media must be public.** Meta downloads the file from the URL Raven supplies.
  Anything behind auth fails with an unhelpful media error.
- **Reels and stories are slow.** Raven polls Meta for up to 2 minutes while it
  transcodes. A "timed out waiting for Meta to process media" error usually means
  the video is large or not a standard MP4 (H.264/AAC).
- **Instagram allows 50 published posts per rolling 24 hours** via the API.
- **Carousels are capped at 10 images** — Raven trims to 10 automatically.
- **Facebook posts are photo-only** in the current implementation, using the
  first attached image (`/photos` endpoint).
- **Stories don't return insights** the same way posts do; blank metrics there
  are expected, not a bug.
- **Token invalidation** is silent until a publish fails. If publishing suddenly
  starts erroring with an auth message, regenerate via steps 2 and 3.

---

## Multiple properties

Raven holds one Meta credential set, so it publishes to a single Instagram
account and single Page. To post to all three properties' accounts, the options
are:

1. Point the credentials at whichever account matters most for now, and copy
   captions manually for the others (the queue shows exactly what to post).
2. Extend `lib/meta.ts` to look up per-property credentials, e.g.
   `IG_USER_ID_TEN_FIFTY_BAKERS`, and pass `property_id` through
   `publishPost`. All three Instagram accounts still need Business status and a
   linked Page each, and one Meta app can hold tokens for all of them.

Option 2 is a small change when you want it.
