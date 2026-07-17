/** Tags Raven uses to characterise an event so it can be matched to properties. */
export type EventTag =
  | 'festival'
  | 'music'
  | 'sports'
  | 'conference'
  | 'business'
  | 'community'
  | 'family'
  | 'wellness'
  | 'nature-walking'
  | 'food-wine'
  | 'arts'
  | 'wedding-milestone'
  | 'market'
  | 'school-holiday'
  | 'public-holiday'
  | 'long-weekend'
  | 'cruise'
  | 'romantic';

/** An event as returned by a source adapter, before normalisation. */
export interface RawEvent {
  source: string;
  sourceUrl: string;
  title: string;
  description?: string;
  /** ISO date or datetime string */
  startDate: string;
  endDate?: string;
  venueName?: string;
  address?: string;
  locality?: string;
  lat?: number;
  lon?: number;
  url?: string;
  image?: string;
}

/** A cleaned, deduplicated, tagged event. */
export interface NormalizedEvent {
  /** Stable content hash — used as the upsert key in Supabase later. */
  id: string;
  source: string;
  sourceUrl: string;
  title: string;
  description?: string;
  /** ISO date (yyyy-mm-dd), Australia/Hobart local. */
  start: string;
  end: string;
  days: number;
  daysUntil: number;
  venueName?: string;
  address?: string;
  locality?: string;
  lat?: number;
  lon?: number;
  url?: string;
  image?: string;
  tags: EventTag[];
}

export type InventoryModel = 'whole-property' | 'room-level';

/** Property profile used for per-property opportunity scoring. */
export interface PropertyProfile {
  id: string;
  name: string;
  locality: string;
  lat: number;
  lon: number;
  inventory: InventoryModel;
  maxGuests: number;
  /** Typical minimum stay in nights. */
  minStay: number;
  adultsOnly: boolean;
  /** Tag → affinity 0..1. Missing tags default to 0.4 (neutral). */
  guestFit: Partial<Record<EventTag, number>>;
  /** Tags the brief says to treat with caution for this property. */
  cautionTags: EventTag[];
  /** Free-text cautions surfaced in rationales. */
  cautionNote: string;
}

export interface ScoreBreakdown {
  demand: number;    // 0..25
  location: number;  // 0..20
  guestFit: number;  // 0..25
  inventory: number; // 0..20
  stayFit: number;   // 0..10
}

export interface PropertyScore {
  propertyId: string;
  propertyName: string;
  total: number; // 0..100
  breakdown: ScoreBreakdown;
  rationale: string[];
}

/** An event scored against every property — the unit the Opportunity Feed consumes. */
export interface Opportunity {
  event: NormalizedEvent;
  scores: PropertyScore[]; // sorted best-first
  recommended: PropertyScore;
  priority: 'high' | 'medium' | 'low';
}
