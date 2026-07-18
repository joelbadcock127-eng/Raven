# Phone → media library

Two ways to get shots into Raven the moment you take them. Both upload the
full-size file straight to Cloudflare R2 (no size limits through the app).

## 1 · Home-screen app (`/u`)

Open `https://<your-app>/u` in Safari → Share → **Add to Home Screen**.
It opens like an app: pick the property, tap **Shoot now** (camera) or
**From camera roll** (multi-select), watch the ticks appear.

## 2 · "Send to Raven" iOS Shortcut (share sheet)

One-time setup in the Shortcuts app — then any photo/video can be shared to
Raven from anywhere (Camera, Photos, Files):

1. New Shortcut → tap ⓘ → enable **Show in Share Sheet**; set input types
   to Images and Media.
2. Add actions in this order:
   1. **Get Contents of URL** —
      `https://<your-app>/api/ingest?token=YOUR_TOKEN&name=Shortcut Input name&type=video/quicktime&property=ten-fifty-bakers`
      (Method GET). Use the magic-variable *Name* of the Shortcut Input for
      `name`. This returns JSON with an `uploadUrl`.
   2. **Get Dictionary from Input** → **Get Dictionary Value** `uploadUrl`.
   3. **Get Contents of URL** — URL = the `uploadUrl` value, Method **PUT**,
      Request Body **File** = Shortcut Input.
   4. **Get Dictionary Value** `storagePath`, `publicUrl`, `provider` from
      the step-1 response, then **Get Contents of URL** —
      `https://<your-app>/api/ingest`, Method **POST**, JSON body:
      `token`, `provider`, `storagePath`, `publicUrl`, `fileName`,
      `mimeType`, `property`.
3. Name it **Send to Raven**.

Duplicate the shortcut per property (change the `property` value:
`ten-fifty-bakers`, `prescription-pad`, `annie-may`) so the share sheet has
"Send to Ten Fifty", "Send to Annie May", etc.

`YOUR_TOKEN` is the `RAVEN_UPLOAD_TOKEN` env var — any long random string,
set in Vercel.

## Server setup (once)

```bash
cd apps/web
R2_ACCOUNT_ID=… R2_ACCESS_KEY_ID=… R2_SECRET_ACCESS_KEY=… \
  node scripts/setup-r2.mjs --origin https://<your-app>.vercel.app
```

Then in the Cloudflare dashboard: R2 → `raven-media` → Settings → enable
**Public access** (or connect `media.<your-domain>`), and set in Vercel:

- `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`
- `R2_BUCKET` (default `raven-media`)
- `R2_PUBLIC_BASE` — the public URL from the dashboard step
- `RAVEN_UPLOAD_TOKEN` — for the Shortcut

Until the `R2_*` vars are set, uploads quietly fall back to Supabase
Storage; existing files stay where they are either way (each asset records
its own provider).
