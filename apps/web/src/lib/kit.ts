import type { SupabaseClient } from '@supabase/supabase-js';
import { anthropic, MODELS, HOUSE_STYLE, stripDashes } from './ai';

/** stripDashes over every string in a JSON-ish structure. */
function deepStrip<T>(value: T): T {
  if (typeof value === 'string') return stripDashes(value) as T;
  if (Array.isArray(value)) return value.map(deepStrip) as T;
  if (value && typeof value === 'object')
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, deepStrip(v)])) as T;
  return value;
}

/**
 * One-click campaign kit: from an approved campaign, generate every asset
 * needed to get the word out — original landing page (Sonnet), social posts,
 * guest email, organiser outreach and a Google Business Profile post (Haiku)
 * — all as drafts for owner approval. Copy is always written fresh from the
 * scraped event *facts*, never from a source's article text.
 */

export interface KitResult {
  ok: boolean;
  message: string;
  pageSlug?: string;
}

const PROPERTY_PITCH: Record<string, { name: string; domain: string; pitch: string; bookUrl: string }> = {
  'ten-fifty-bakers': {
    name: 'Ten Fifty Bakers',
    domain: 'tenfiftybakers.com.au',
    pitch:
      'Off-grid luxury wilderness retreat at Bakers Beach beside Narawntapu National Park. Hand-built timber home, outdoor bath under the stars, sleeps 10, minimum 2 nights. Guests: couples, wellness seekers, walkers, milestone groups.',
    bookUrl: 'https://tenfiftybakers.com.au/book-now/',
  },
  'prescription-pad': {
    name: 'The Prescription Pad',
    domain: 'theprescriptionpad.com.au',
    pitch:
      'Spacious group accommodation in Shearwater, minutes from the beach and Port Sorell. Built for families, sports weekends and reunions, sleeps 10, minimum 2 nights.',
    bookUrl: 'https://theprescriptionpad.com.au/bookings/',
  },
  'annie-may': {
    name: 'Annie May',
    domain: 'anniemay.com.au',
    pitch:
      'Refined adults-only heritage guesthouse in central Devonport. Seven ensuite rooms bookable individually — ideal for business travellers, cruise stopovers, couples and visiting family.',
    bookUrl: 'https://anniemay.com.au/accommodation/',
  },
};

const PAGE_SCHEMA = {
  type: 'object',
  properties: {
    headline: { type: 'string', description: 'Specific, not generic — name the event or the reason to travel' },
    subheadline: { type: 'string' },
    intro: { type: 'string', description: 'Opening: 2-3 sentences setting the scene — the event, the dates, the place' },
    tieIn: {
      type: 'string',
      description:
        'One substantial paragraph on how this property and this event fit together — travel logistics, who it suits, what the stay adds to the trip. Concrete, no filler.',
    },
    aboutProperty: {
      type: 'string',
      description: 'One substantial paragraph about the property itself — what staying here is actually like. Written for someone who has never heard of it.',
    },
    whyStay: { type: 'array', items: { type: 'string' }, description: '3-5 short, concrete reasons to stay at this property for this event' },
    plan: { type: 'array', items: { type: 'string' }, description: '3-4 line suggested itinerary weaving the event and the property together' },
    heroImageUrl: { type: 'string', description: 'Pick ONE image URL from the provided media list that best sells the property' },
    galleryUrls: { type: 'array', items: { type: 'string' }, description: 'Exactly 3 or 4 more image URLs from the media list, varied (rooms, grounds, details)' },
    practical: {
      type: 'array',
      items: { type: 'object', properties: { label: { type: 'string' }, value: { type: 'string' } }, required: ['label', 'value'], additionalProperties: false },
      description: '3-4 practical facts: drive time to the venue, sleeps how many, check-in style, nearest supplies',
    },
    cta: { type: 'string', description: 'Button label, e.g. Check availability' },
    metaDescription: { type: 'string' },
  },
  required: ['headline', 'subheadline', 'intro', 'tieIn', 'aboutProperty', 'whyStay', 'plan', 'heroImageUrl', 'galleryUrls', 'practical', 'cta', 'metaDescription'],
  additionalProperties: false,
} as const;

const BUNDLE_SCHEMA = {
  type: 'object',
  properties: {
    posts: {
      type: 'array',
      items: { type: 'string' },
      description: 'Exactly two distinct Instagram captions (2-4 lines, soft book-direct CTA, 5-8 hashtags on the last line)',
    },
    reelCaption: { type: 'string', description: 'Caption for a reel about staying here for this event' },
    guestEmailSubject: { type: 'string' },
    guestEmailBody: {
      type: 'string',
      description: 'Warm email to past guests: the event, why this property is the place to stay, book-direct link. Plain text, 120-180 words.',
    },
    organiserEmailSubject: { type: 'string' },
    organiserEmailBody: {
      type: 'string',
      description:
        'Short professional email to the event organiser proposing an accommodation partnership: we list their event on our page, they share our stay link with attendees. Plain text, under 150 words.',
    },
    gbpPost: {
      type: 'string',
      description: 'Google Business Profile event post, max 1400 chars, plain text with a clear CTA line.',
    },
  },
  required: ['posts', 'reelCaption', 'guestEmailSubject', 'guestEmailBody', 'organiserEmailSubject', 'organiserEmailBody', 'gbpPost'],
  additionalProperties: false,
} as const;

function slugify(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60);
}

function promoCode(title: string, startDate: string): string {
  const word = (title.match(/[a-zA-Z]{4,}/)?.[0] ?? 'STAY').slice(0, 6).toUpperCase();
  const month = new Date(startDate + 'T12:00:00').toLocaleDateString('en-AU', { month: 'short' }).toUpperCase();
  return `${word}${month}`;
}

export async function generateCampaignKit(
  supabase: SupabaseClient,
  campaignId: string,
): Promise<KitResult> {
  const client = anthropic();
  if (!client) return { ok: false, message: 'ANTHROPIC_API_KEY is not set' };

  const { data: campaign } = await supabase
    .from('campaigns')
    .select('id, property_id, event_id, status, kit, offer, target_start, target_end, events(id, title, description, start_date, end_date, venue_name, locality, organiser, ticket_url, url, tags, ai_summary, estimated_audience)')
    .eq('id', campaignId)
    .maybeSingle();
  if (!campaign) return { ok: false, message: 'Campaign not found' };
  const event = campaign.events as unknown as {
    id: string; title: string; description: string | null; start_date: string; end_date: string;
    venue_name: string | null; locality: string | null; organiser: string | null;
    ticket_url: string | null; url: string | null; tags: string[]; ai_summary: string | null;
    estimated_audience: number | null;
  } | null;
  if (!event) return { ok: false, message: 'Campaign has no event attached' };

  const propertyId = campaign.property_id ?? 'ten-fifty-bakers';
  const prop = PROPERTY_PITCH[propertyId] ?? PROPERTY_PITCH['ten-fifty-bakers'];

  // Event FACTS only — the AI writes original copy from these.
  const facts = {
    event: event.title,
    dates: `${event.start_date}${event.end_date !== event.start_date ? ` to ${event.end_date}` : ''}`,
    venue: event.venue_name,
    locality: event.locality,
    organiser: event.organiser,
    ticketUrl: event.ticket_url,
    category: event.tags,
    estimatedAudience: event.estimated_audience,
    note: event.ai_summary,
  };

  // media for the page hero + gallery + reel — captions let the model choose well
  const { data: media } = await supabase
    .from('media_assets')
    .select('id, kind, public_url, caption, times_used')
    .eq('property_id', propertyId)
    .order('times_used', { ascending: true })
    .limit(24);
  const images = (media ?? []).filter((m) => m.kind === 'image');
  const heroImage = images[0];
  const reelVideo = media?.find((m) => m.kind === 'video');
  const mediaList = images
    .map((m) => `${m.public_url} — ${m.caption ?? 'no caption'}`)
    .join('\n');

  const offer = campaign.offer as { id: string; name: string; pitch: string } | null;

  // a tracked booking link so clicks from this campaign's page and posts are
  // attributable (falls back to the plain booking URL if tracking is unavailable)
  let bookHref = prop.bookUrl;
  try {
    const { getOrCreateTrackedLink } = await import('./links');
    const tl = await getOrCreateTrackedLink(supabase, {
      propertyId,
      campaignId: campaign.id,
      label: `${prop.name} — ${event.title}`,
      targetUrl: prop.bookUrl,
      kind: 'booking',
    });
    if (tl) bookHref = tl.goUrl;
  } catch {
    /* tracking optional */
  }

  // ── Landing page (Sonnet — new page creation per the model routing) ──
  const pageRes = await client.messages.create({
    model: MODELS.generate,
    max_tokens: 3500,
    system:
      'You write landing pages for boutique Tasmanian accommodation, aimed at people travelling for a specific local event or reason. ' +
      'The page must be genuinely useful content, not thin SEO filler: concrete detail about the property, honest logistics, and a clear picture of the trip. ' +
      'Warm, plain, understated — no hype clichés (no "nestled", "hidden gem", "escape the hustle"). Never copy source text — write fresh from the facts given. ' +
      'Never mention prices or rates. For imagery, choose URLs ONLY from the provided media list, matching captions to the copy. Australian English.' +
      HOUSE_STYLE,
    messages: [
      {
        role: 'user',
        content:
          `Property: ${prop.name} — ${prop.pitch}\n` +
          `Event facts: ${JSON.stringify(facts)}\n` +
          (offer ? `The stay is packaged as an offer — weave it through the page: "${offer.name}" — ${offer.pitch}\n` : '') +
          `Media library (url — caption):\n${mediaList || '(none)'}\n\nWrite the landing page content.`,
      },
    ],
    output_config: { format: { type: 'json_schema', schema: PAGE_SCHEMA } },
  });
  const pageContent = deepStrip(
    JSON.parse(pageRes.content.find((b) => b.type === 'text')?.text ?? '{}'),
  ) as Record<string, unknown> & {
    heroImageUrl?: string;
    galleryUrls?: string[];
  };
  // guard: only URLs that really exist in the library
  const validUrls = new Set(images.map((m) => m.public_url));
  if (pageContent.heroImageUrl && !validUrls.has(pageContent.heroImageUrl)) delete pageContent.heroImageUrl;
  pageContent.galleryUrls = (pageContent.galleryUrls ?? []).filter((u) => validUrls.has(u)).slice(0, 4);

  // ── Everything else (Haiku, one batched call) ──
  const bundleRes = await client.messages.create({
    model: MODELS.classify,
    max_tokens: 2500,
    system:
      'You write marketing copy for boutique Tasmanian accommodation. Understated, warm, book-direct. ' +
      'Write original copy from the facts given, never reuse source text. Never mention prices. Australian English.' +
      HOUSE_STYLE,
    messages: [
      {
        role: 'user',
        content:
          `Property: ${prop.name} — ${prop.pitch}\nBooking link: ${prop.bookUrl}\nEvent facts: ${JSON.stringify(facts)}\n` +
          (offer ? `Sell this specific offer in every piece: "${offer.name}" — ${offer.pitch}\n` : '') +
          `Organiser name (for the outreach email greeting, if known): ${event.organiser ?? 'unknown'}`,
      },
    ],
    output_config: { format: { type: 'json_schema', schema: BUNDLE_SCHEMA } },
  });
  const bundle = deepStrip(JSON.parse(bundleRes.content.find((b) => b.type === 'text')?.text ?? '{}'));

  // ── Persist: landing page ──
  const slug = `${slugify(event.title)}-${event.start_date.slice(0, 7)}`;
  await supabase.from('event_pages').upsert({
    slug,
    campaign_id: campaign.id,
    property_id: propertyId,
    event_id: event.id,
    content: {
      ...pageContent,
      heroImageUrl: (pageContent.heroImageUrl as string | undefined) ?? heroImage?.public_url ?? null,
      offer: offer ? { name: offer.name, pitch: offer.pitch } : null,
      bookUrl: bookHref,
      propertyName: prop.name,
      propertyDomain: prop.domain,
      eventTitle: event.title,
      eventDates: facts.dates,
      venue: event.venue_name,
      locality: event.locality,
      ticketUrl: event.ticket_url,
    },
    published: false,
    updated_at: new Date().toISOString(),
  });

  // ── Persist: social drafts tied to the campaign ──
  const socialRows = [];
  for (const caption of (bundle.posts ?? []).slice(0, 2)) {
    socialRows.push({
      campaign_id: campaign.id,
      property_id: propertyId,
      kind: 'post',
      platform: 'instagram',
      caption,
      media_ids: heroImage ? [heroImage.id] : [],
      status: 'draft',
      scheduled_for: new Date().toISOString().slice(0, 10),
    });
  }
  if (reelVideo && bundle.reelCaption) {
    socialRows.push({
      campaign_id: campaign.id,
      property_id: propertyId,
      kind: 'reel',
      platform: 'instagram',
      caption: bundle.reelCaption,
      media_ids: [reelVideo.id],
      status: 'draft',
      scheduled_for: new Date().toISOString().slice(0, 10),
    });
  }
  if (socialRows.length) await supabase.from('social_posts').insert(socialRows);

  // ── Persist: kit (email, outreach, GBP, promo code) + checklist ──
  const code = promoCode(event.title, event.start_date);
  const kit = {
    guestEmail: { subject: bundle.guestEmailSubject, body: bundle.guestEmailBody },
    organiserOutreach: {
      subject: bundle.organiserEmailSubject,
      body: bundle.organiserEmailBody,
      organiser: event.organiser,
    },
    gbpPost: bundle.gbpPost,
    promoCode: code,
    generatedAt: new Date().toISOString(),
  };

  await supabase
    .from('campaigns')
    .update({
      kit,
      landing_page_slug: slug,
      // the campaign's goal defaults to filling the event dates
      target_start: campaign.target_start ?? event.start_date,
      target_end: campaign.target_end ?? event.end_date,
      status: 'ready_for_approval',
      assets: {
        page: 'draft',
        reel: reelVideo ? 'draft' : 'todo',
        posts: socialRows.length ? 'draft' : 'todo',
        email: 'draft',
        outreach: 'draft',
      },
      updated_at: new Date().toISOString(),
    })
    .eq('id', campaign.id);

  return { ok: true, message: 'Kit generated — review below', pageSlug: slug };
}
