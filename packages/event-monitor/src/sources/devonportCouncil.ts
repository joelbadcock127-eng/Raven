import { politeFetch } from '../util/http.js';
import { decodeEntities, extractJsonLd, findEvents } from '../util/jsonld.js';
import type { RawEvent } from '../types.js';
import type { EventSource } from './base.js';

const LISTING_URL = 'https://www.devonport.tas.gov.au/whats-on-devonport/';
const MAX_DETAIL_PAGES = 25;

/**
 * Devonport City Council "What's On" (Modern Events Calendar WordPress plugin).
 * The listing page only shows day+month, but every event detail page embeds
 * full schema.org Event JSON-LD — so we collect detail links and read those.
 */
export const devonportCouncil: EventSource = {
  name: 'devonport-council',
  async fetchEvents(): Promise<RawEvent[]> {
    const listing = await politeFetch(LISTING_URL);
    const links = new Set<string>();
    const re = /href="(https:\/\/www\.devonport\.tas\.gov\.au\/events\/[^"#?]+\/)"/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(listing))) links.add(m[1]);

    const events: RawEvent[] = [];
    for (const link of [...links].slice(0, MAX_DETAIL_PAGES)) {
      try {
        const html = await politeFetch(link);
        const title = decodeEntities(html.match(/<title>([^<]*)<\/title>/)?.[1]?.split('|')[0] ?? '');
        for (const ev of findEvents(extractJsonLd(html))) {
          if (!ev.startDate) continue;
          const loc = ev.location ?? {};
          events.push({
            source: 'devonport-council',
            sourceUrl: link,
            title: decodeEntities(String(ev.name ?? title)),
            description: ev.description ? decodeEntities(String(ev.description)).slice(0, 500) : undefined,
            startDate: String(ev.startDate),
            endDate: ev.endDate ? String(ev.endDate) : undefined,
            venueName: loc.name ? decodeEntities(String(loc.name)) : undefined,
            address: typeof loc.address === 'string' ? decodeEntities(loc.address) : undefined,
            locality: 'Devonport',
            url: link,
            image: typeof ev.image === 'string' && ev.image ? ev.image : undefined,
          });
        }
      } catch (err) {
        console.warn(`  ! skipped ${link}: ${(err as Error).message}`);
      }
    }
    return events;
  },
};
