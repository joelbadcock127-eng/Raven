import { politeFetch } from '../util/http.js';
import { decodeEntities, extractJsonLd, findEvents } from '../util/jsonld.js';
import type { RawEvent } from '../types.js';
import type { EventSource } from './base.js';

/**
 * Latrobe Council events (covers Latrobe, Port Sorell, Shearwater and
 * Hawley Beach — The Prescription Pad's home turf, and the closest council
 * area to Ten Fifty Bakers).
 *
 * The site sits behind Cloudflare, so we try several listing paths and
 * fall back gracefully; detail pages embed schema.org Event JSON-LD like
 * most council CMSs. If every path is blocked the source just returns
 * nothing rather than failing the run.
 */
const LISTING_URLS = [
  'https://www.latrobe.tas.gov.au/events',
  'https://www.latrobe.tas.gov.au/Events',
  'https://www.latrobe.tas.gov.au/community/events',
  'https://www.latrobe.tas.gov.au/whats-on',
];
const MAX_DETAIL_PAGES = 25;

export const latrobeCouncil: EventSource = {
  name: 'latrobe-council',
  async fetchEvents(): Promise<RawEvent[]> {
    let listing = '';
    let listingUrl = '';
    for (const url of LISTING_URLS) {
      try {
        const html = await politeFetch(url, 1);
        // Cloudflare interstitials come back tiny with a challenge marker
        if (html.length > 10_000 && !/just a moment|cf-challenge/i.test(html)) {
          listing = html;
          listingUrl = url;
          break;
        }
      } catch {
        // try the next candidate path
      }
    }
    if (!listing) {
      console.warn('  ! latrobe-council: listing unreachable (Cloudflare or moved) — skipped');
      return [];
    }

    // Event detail links: absolute or relative paths containing /event
    const links = new Set<string>();
    const re = /href="((?:https:\/\/www\.latrobe\.tas\.gov\.au)?\/[Ee]vents?\/[^"#?]+)"/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(listing))) {
      const href = m[1].startsWith('http') ? m[1] : `https://www.latrobe.tas.gov.au${m[1]}`;
      links.add(href);
    }

    const events: RawEvent[] = [];
    for (const link of [...links].slice(0, MAX_DETAIL_PAGES)) {
      try {
        const html = await politeFetch(link, 1);
        const title = decodeEntities(html.match(/<title>([^<]*)<\/title>/)?.[1]?.split(/[|–-]/)[0] ?? '');
        for (const ev of findEvents(extractJsonLd(html))) {
          if (!ev.startDate) continue;
          const loc = ev.location ?? {};
          const addr = typeof loc.address === 'object' ? loc.address : {};
          events.push({
            source: 'latrobe-council',
            sourceUrl: link,
            title: decodeEntities(String(ev.name ?? title)),
            description: ev.description
              ? decodeEntities(String(ev.description)).slice(0, 280)
              : undefined,
            startDate: String(ev.startDate),
            endDate: ev.endDate ? String(ev.endDate) : undefined,
            venueName: loc.name ? decodeEntities(String(loc.name)) : undefined,
            address:
              typeof loc.address === 'string'
                ? decodeEntities(loc.address)
                : [addr.streetAddress, addr.addressLocality].filter(Boolean).join(', ') || undefined,
            locality: addr.addressLocality ? String(addr.addressLocality) : 'Latrobe',
            url: link,
            image: typeof ev.image === 'string' && ev.image ? ev.image : undefined,
            organiser: ev.organizer?.name ? decodeEntities(String(ev.organizer.name)) : undefined,
            ticketUrl: (() => {
              const offers = Array.isArray(ev.offers) ? ev.offers[0] : ev.offers;
              return offers?.url ? String(offers.url) : undefined;
            })(),
          });
        }
      } catch (err) {
        console.warn(`  ! skipped ${link}: ${(err as Error).message}`);
      }
    }
    return events;
  },
};
