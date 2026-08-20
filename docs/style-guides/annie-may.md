# Annie May — content style guide

The single source of truth for how Decra generates Annie May's social content:
captions, reels, music picks, text cards and logo usage. The machine-readable
version lives in the `style_guides` table (`property_id = 'annie-may'`, seeded
by `supabase/migrations/0016_anniemay_style_guide.sql`) and is threaded into
every caption prompt and reel grade via `apps/web/src/lib/styleGuides.ts`.

Instagram: [@anniemaybnb](https://instagram.com/anniemaybnb) · adults-only
boutique guesthouse, Devonport, Tasmania.

---

## Brand idea

Annie May is a heritage guesthouse personified: **the house is "she", a grand
old lady who has waited over 100 years**. Content is written as if the host
(Deb) is introducing you to her. Everything — words, type, music, grading —
serves one feeling: *quiet luxury, unhurried calm, adults only*.

---

## Voice

- First person, host-to-guest. Warm, personal, softly storytelling.
- The house and its rooms are always **she/her**, never "it" or "the property".
- Short reflective sentences. Line breaks between thoughts. Sentence case.
- Personal stories (restoration, rooms, history) may sign off **"— Deb"**.
- One emoji maximum, and usually none. 🍷 is the only on-brand regular.

**Never:** hard sell, discount or urgency language ("book now before…"),
stacked exclamation marks, ALL-CAPS hype, corporate speak ("nestled",
"hidden gem", "boasts"), emoji strings, anything aimed at kids or families
(the guesthouse is adults only).

## Captions — shape and close

Typical structure (see examples at the bottom):

1. A quiet opening line that lands a feeling, not a feature.
2. 2–3 short paragraphs of story or detail.
3. A soft close — an invitation, not a push.

Preferred CTAs, in order of preference:

- Comment/DM keyword: *"Message us 'STAY'"*, *"Book your stay by commenting
  'RELAX' and let her welcome you."*
- *"Book your stay in Room 2 here"* / link in bio.
- A plain warm invitation: *"She's ready for you."*

Hashtags go after the caption, separated by `.` spacer lines, drawn from:

```
#boutiqueaccommodation #adultsonlyaccommodation #luxuryguesthouse #historicstay
#romanticgetaway #elegantescapes #staywithstyle #privategetaway #heritagehomestay
#boutiquestayaustralia #anniemayguesthouse #anniemaydevonport #stayatanniemay
#grandoldlady #boutiquedevonport
```

---

## Visual

The feed alternates two looks:

1. **Editorial text cards** — near-black charcoal ground, chalk-white display
   serif, lots of air, monogram small at the foot. E.g. *"What does summer
   mean to you?"*
2. **Warm natural-light photography** — interiors and the house at golden
   hour, soft shadows, original brick and timber tones. Overlay captions in
   the display serif, lowercase, e.g. *"where comfort is effortless"*.

Grade: warm, golden, natural. Never punchy/saturated filters, never cool/moody
blue, never black-and-white for photography.

### Palette

| Role | Hex | Use |
|---|---|---|
| Charcoal ink | `#161616` | text-card grounds, dark logo |
| Chalk | `#F5F1EA` | type on dark, light grounds |
| Warm neutrals | from photo | brick, timber, linen — let photography supply colour |

### Type

Display face is a high-contrast old-style serif with elegant long extenders.
Working match in Decra's renderer: **Cormorant Garamond** (already loaded in
`apps/web/src/app/site/[property]/page.tsx`). Rules:

- Sentence case or lowercase; never all-caps headlines.
- Slightly open letter-spacing (`0.02–0.04em`) at display sizes.
- No bold weights — the contrast comes from size, not weight.

---

## Logo

Vector assets (all `fill="currentColor"` — set CSS `color` to produce black,
chalk, or any variant; no separate colour files needed):

| File | What |
|---|---|
| `apps/web/public/logo/annie-may-monogram.svg` | Interlocked AM monogram |
| `apps/web/public/logo/annie-may-monogram-draw.svg` | Monogram with a "being drawn" animation — outline strokes on (~2.6s), then the fill fades in. For reel intros/outros and text-card stings. |
| `apps/web/public/logo/annie-may-wordmark.svg` | Monogram + "Annie May / Boutique Bed + Breakfast" lockup |

Raster originals remain in `apps/web/public/mirror-assets/` (e.g.
`22a4ec25b5-cropped-Annie-May-Logo-4-270x270.png` is a white cutout).

Usage:

- On photography: monogram as a small watermark, chalk white, 55–70% opacity,
  bottom corner or bottom centre. Never large over a photo.
- On text cards: monogram small at the foot, same colour as the type.
- Clear space: at least the width of one of the monogram's stems on all sides.
- Don't stretch, recolour outside the palette, outline, or add shadows/glows.

---

## Music (reels)

Easy-going, luxury, relaxing. Pick from: soft solo piano, warm acoustic
guitar, mellow jazz, gentle ambient/neo-classical. Slow tempo (~60–90 BPM),
no vocals or soft vocals only. **Never:** EDM, trap, hype drops, novelty or
trending-meme audio.

---

## Example captions (real posts — match rhythm and length)

> When I was restoring the house, Room 2 was one of those spaces I kept coming
> back to. The brick wall, original, strong and beautifully imperfect, I knew
> this would be the heart of the room. […] Whether you're here to rest,
> reconnect, or breathe out, she's ready for you. She's one of a kind. Book
> your stay in Room 2 here — Deb

> Room 1 at Annie May. She's not just a room. She's a moment. So come find
> your moment. Message us "STAY". Annie May is waiting.

> Some places you visit. Others, you come home to, even if just for a little
> while. Annie May is a quiet guesthouse for grownups, designed for slow
> mornings, deep sleeps, and unhurried connection. If you're craving beauty,
> calm, and a place that feels like it's been waiting for you… she's ready.
> Book your stay by commenting "RELAX" and let her welcome you.
