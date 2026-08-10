-- Seed the Annie May style guide (@anniemaybnb) so captions, music picks and
-- reel grades follow the established feed. Human-readable version:
-- docs/style-guides/annie-may.md. Editable afterwards in Social → Style guides.
insert into style_guides (property_id, voice, vibe, visual, music, hashtags, cta, avoid, example_captions, source_notes)
values (
  'annie-may',
  'First person, host-to-guest (Deb). Warm, personal, softly storytelling. The house and her rooms are always "she/her" — a grand old lady who has waited over 100 years — never "it" or "the property". Short reflective sentences with line breaks between thoughts, sentence case. Personal stories may sign off "— Deb". At most one emoji, usually none.',
  'Quiet luxury in a heritage guesthouse, adults only. Slow mornings, deep sleeps, unhurried connection. Romantic, calm, restorative — an invitation to breathe out, never a pitch.',
  'Two looks: editorial text cards (charcoal #161616 ground, chalk #F5F1EA display serif, generous whitespace, small monogram at the foot) and warm, golden natural light photography of heritage interiors — original brick, timber, linen. Display type is an elegant old-style serif (Cormorant Garamond), sentence case or lowercase, slightly open letter-spacing, never all-caps and never heavy weights. Monogram watermark on photos: chalk white, small, bottom corner.',
  'Easy-going, luxury, relaxing. Soft solo piano, warm acoustic guitar, mellow jazz, gentle ambient or neo-classical. Slow tempo around 60-90 BPM, instrumental or soft vocals only. Never EDM, trap, hype drops or trending meme audio.',
  array[
    '#boutiqueaccommodation','#adultsonlyaccommodation','#luxuryguesthouse','#historicstay',
    '#romanticgetaway','#elegantescapes','#staywithstyle','#privategetaway','#heritagehomestay',
    '#boutiquestayaustralia','#anniemayguesthouse','#anniemaydevonport','#stayatanniemay',
    '#grandoldlady','#boutiquedevonport'
  ],
  'Soft invitations, never a push. Prefer comment/DM keyword CTAs (Message us "STAY" / Book your stay by commenting "RELAX" and let her welcome you), or "Book your stay in Room 2 here" with link in bio, or simply "She''s ready for you."',
  'Hard sell, discounts or urgency ("book now before..."), stacked exclamation marks, ALL-CAPS hype, corporate cliches (nestled, hidden gem, boasts), emoji strings, anything aimed at kids or families — the guesthouse is adults only.',
  array[
    'When I was restoring the house, Room 2 was one of those spaces I kept coming back to. The brick wall, original, strong and beautifully imperfect, I knew this would be the heart of the room. Room 2 is our King Premium Room, and I think it holds something special. A stillness you can feel the moment you step inside. Whether you''re here to rest, reconnect, or breathe out, she''s ready for you. She''s one of a kind. Book your stay in Room 2 here — Deb',
    'Room 1 at Annie May. She''s not just a room. She''s a moment. So come find your moment. Message us "STAY". Annie May is waiting.',
    'Some places you visit. Others, you come home to, even if just for a little while. Annie May is a quiet guesthouse for grownups, designed for slow mornings, deep sleeps, and unhurried connection. If you''re craving beauty, calm, and a place that feels like it''s been waiting for you... she''s ready. Book your stay by commenting "RELAX" and let her welcome you.'
  ],
  'Distilled from @anniemaybnb published posts and site branding, Aug 2026. Logo vectors: apps/web/public/logo/annie-may-monogram.svg, -monogram-draw.svg (animated), -wordmark.svg. Full guide: docs/style-guides/annie-may.md.'
)
on conflict (property_id) do update set
  voice = excluded.voice,
  vibe = excluded.vibe,
  visual = excluded.visual,
  music = excluded.music,
  hashtags = excluded.hashtags,
  cta = excluded.cta,
  avoid = excluded.avoid,
  example_captions = excluded.example_captions,
  source_notes = excluded.source_notes,
  updated_at = now();
