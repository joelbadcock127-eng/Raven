import { politeFetch } from '../util/http.js';
import { decodeEntities, extractJsonLd, findEvents } from '../util/jsonld.js';
import type { RawEvent } from '../types.js';
import type { EventSource } from './base.js';

/**
 * Eventbrite public search pages (no API). Each results page embeds a
 * schema.org ItemList of Event objects with dates, geo and addresses.
 */
const SEARCH_URLS = [
  'https://www.eventbrite.com.au/d/australia--devonport/events/',
  'https://www.eventbrite.com.au/d/australia--devonport/events/?page=2',
  'https://www.eventbrite.com.au/d/australia--launceston/events/',
];

export const eventbrite: EventSource = {
  name: 'eventbrite',
  async fetchEvents(): Promise<RawEvent[]> {
    const events: RawEvent[] = [];
    for (const url of SEARCH_URLS) {
      try {
        const html = await politeFetch(url);
        for (const ev of findEvents(extractJsonLd(html))) {
          if (!ev.startDate || !ev.name) continue;
          const loc = ev.location ?? {};
          const addr = loc.address ?? {};
          const geo = loc.geo ?? {};
          events.push({
            source: 'eventbrite',
            sourceUrl: url,
            title: decodeEntities(String(ev.name)),
            description: ev.description
              ? decodeEntities(String(ev.description)).slice(0, 500)
              : undefined,
            startDate: String(ev.startDate),
            endDate: ev.endDate ? String(ev.endDate) : undefined,
            venueName: loc.name ? decodeEntities(String(loc.name)) : undefined,
            address: [addr.streetAddress, addr.addressLocality, addr.addressRegion]
              .filter(Boolean)
              .join(', ') || undefined,
            locality: addr.addressLocality ? String(addr.addressLocality) : undefined,
            lat: geo.latitude != null ? Number(geo.latitude) : undefined,
            lon: geo.longitude != null ? Number(geo.longitude) : undefined,
            url: ev.url ? String(ev.url) : undefined,
            image: typeof ev.image === 'string' ? ev.image : undefined,
            organiser: ev.organizer?.name
              ? decodeEntities(String(ev.organizer.name))
              : undefined,
            ticketUrl: (() => {
              const offers = Array.isArray(ev.offers) ? ev.offers[0] : ev.offers;
              const t = offers?.url ?? ev.url;
              return t ? String(t) : undefined;
            })(),
          });
        }
      } catch (err) {
        console.warn(`  ! eventbrite page failed ${url}: ${(err as Error).message}`);
      }
    }
    return events;
  },
};
