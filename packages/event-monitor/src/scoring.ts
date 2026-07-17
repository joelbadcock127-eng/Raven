import type {
  NormalizedEvent,
  Opportunity,
  PropertyProfile,
  PropertyScore,
  ScoreBreakdown,
} from './types.js';

/**
 * Scoring model from the brief (section 04):
 *   demand 25% · location 20% · guest fit 25% · inventory 20% · stay fit 10%
 * Availability (part of the inventory pillar) is refined once Lodgify is
 * connected — until then inventory scores on structural fit only.
 */
const WEIGHTS = { demand: 25, location: 20, guestFit: 25, inventory: 20, stayFit: 10 };

const R_EARTH_KM = 6371;
function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const rad = (d: number) => (d * Math.PI) / 180;
  const dLat = rad(lat2 - lat1);
  const dLon = rad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R_EARTH_KM * Math.asin(Math.sqrt(a));
}

/** Rough demand signal 0..1 — refined later with attendance data. */
function demandSignal(e: NormalizedEvent): { v: number; why: string } {
  let v = 0.35;
  const why: string[] = [];
  const big = /agfest|marathon|championship|festival|spirit of tasmania|jazz|show\b|grand final|concert/i;
  if (big.test(e.title)) {
    v += 0.3;
    why.push('event type historically drives visitor demand');
  }
  if (e.days >= 2) {
    v += 0.15;
    why.push(`runs ${e.days} days (multi-night potential)`);
  }
  if (e.tags.includes('school-holiday') || e.tags.includes('long-weekend')) {
    v += 0.25;
    why.push('calendar-driven leisure demand');
  }
  if (e.tags.includes('public-holiday')) v += 0.1;
  const dow = new Date(e.start + 'T12:00:00').getUTCDay();
  if (dow === 5 || dow === 6) {
    v += 0.1;
    why.push('starts on a weekend');
  }
  return { v: Math.min(v, 1), why: why.join('; ') || 'baseline local event demand' };
}

/** Location signal 0..1 based on travel distance from the property. */
function locationSignal(e: NormalizedEvent, p: PropertyProfile): { v: number; km?: number } {
  if (e.lat != null && e.lon != null) {
    const km = haversineKm(e.lat, e.lon, p.lat, p.lon);
    // ~full score within 15 km, fading to 0 at 120 km
    const v = Math.max(0, Math.min(1, 1 - (km - 15) / 105));
    return { v, km: Math.round(km) };
  }
  const text = `${e.locality ?? ''} ${e.address ?? ''} ${e.venueName ?? ''} ${e.title}`.toLowerCase();
  const near: Record<string, string[]> = {
    'ten-fifty-bakers': ['bakers beach', 'narawntapu', 'port sorell', 'devonport', 'latrobe'],
    'prescription-pad': ['shearwater', 'port sorell', 'devonport', 'latrobe', 'wesley vale'],
    'annie-may': ['devonport', 'east devonport', 'spreyton', 'latrobe'],
  };
  const hit = near[p.id]?.find((k) => text.includes(k));
  if (hit) return { v: hit === p.locality.toLowerCase() ? 1 : 0.75 };
  if (/tasmania|tas\b/.test(text)) return { v: 0.35 };
  return { v: 0.3 }; // statewide/unknown — assume regional relevance
}

function guestFitSignal(e: NormalizedEvent, p: PropertyProfile): { v: number; top: string } {
  let best = 0;
  let top = '';
  for (const t of e.tags) {
    const a = p.guestFit[t] ?? 0.4;
    if (a > best) {
      best = a;
      top = t;
    }
  }
  return { v: best, top };
}

function inventorySignal(e: NormalizedEvent, p: PropertyProfile): { v: number; why: string } {
  const groupish = e.tags.some((t) =>
    ['family', 'sports', 'wedding-milestone', 'school-holiday', 'festival'].includes(t),
  );
  const individualish = e.tags.some((t) =>
    ['conference', 'business', 'cruise', 'romantic', 'arts', 'music'].includes(t),
  );
  if (p.inventory === 'room-level') {
    if (individualish) return { v: 1, why: 'room-level inventory suits individual travellers/couples' };
    if (groupish) return { v: 0.45, why: 'group demand only partially fits individual rooms' };
    return { v: 0.7, why: 'rooms can absorb general demand' };
  }
  if (groupish) return { v: 1, why: 'whole-property capacity matches group demand' };
  if (individualish) return { v: 0.35, why: 'hard to justify a whole house for 1–2 guests' };
  return { v: 0.6, why: 'whole property fits general leisure demand' };
}

function stayFitSignal(e: NormalizedEvent, p: PropertyProfile): { v: number; why: string } {
  const likelyNights = Math.max(e.days - (e.days > 1 ? 0 : 0), 1);
  if (likelyNights >= p.minStay) return { v: 1, why: `~${likelyNights}-night trips clear the ${p.minStay}-night minimum` };
  const v = Math.max(0.2, likelyNights / p.minStay);
  return { v, why: `single-night demand vs ${p.minStay}-night minimum stay` };
}

export function scoreEventForProperty(e: NormalizedEvent, p: PropertyProfile): PropertyScore {
  const demand = demandSignal(e);
  const location = locationSignal(e, p);
  const guest = guestFitSignal(e, p);
  const inventory = inventorySignal(e, p);
  const stay = stayFitSignal(e, p);

  // Caution rule from the brief: flagged event types are dampened, not banned.
  const cautionHit = e.tags.filter((t) => p.cautionTags.includes(t));
  const cautionFactor = cautionHit.length ? 0.6 : 1;

  const breakdown: ScoreBreakdown = {
    demand: round1(demand.v * WEIGHTS.demand),
    location: round1(location.v * WEIGHTS.location),
    guestFit: round1(guest.v * cautionFactor * WEIGHTS.guestFit),
    inventory: round1(inventory.v * WEIGHTS.inventory),
    stayFit: round1(stay.v * WEIGHTS.stayFit),
  };
  const total = round1(
    breakdown.demand + breakdown.location + breakdown.guestFit + breakdown.inventory + breakdown.stayFit,
  );

  const rationale = [
    `Demand: ${demand.why}`,
    location.km != null
      ? `Location: ~${location.km} km from ${p.name}`
      : `Location: matched by locality text`,
    `Guest fit: strongest tag "${guest.top || 'none'}" (affinity ${guest.v.toFixed(2)})`,
    `Inventory: ${inventory.why}`,
    `Stay: ${stay.why}`,
  ];
  if (cautionHit.length) rationale.push(`⚠ Caution (${cautionHit.join(', ')}): ${p.cautionNote}`);

  return { propertyId: p.id, propertyName: p.name, total, breakdown, rationale };
}

export function buildOpportunity(e: NormalizedEvent, properties: PropertyProfile[]): Opportunity {
  const scores = properties
    .map((p) => scoreEventForProperty(e, p))
    .sort((a, b) => b.total - a.total);
  const top = scores[0];
  const soon = e.daysUntil <= 60;
  const priority = top.total >= 65 && soon ? 'high' : top.total >= 50 ? 'medium' : 'low';
  return { event: e, scores, recommended: top, priority };
}

const round1 = (n: number) => Math.round(n * 10) / 10;
