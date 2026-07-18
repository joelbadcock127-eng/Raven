import Anthropic from '@anthropic-ai/sdk';
import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Model routing (owner's choice):
 *  - classify: scraping sort/tagging/demand estimation  → Haiku
 *  - edit:     website content edits                    → Haiku
 *  - generate: new page creation (Module 3)             → Sonnet 5
 */
export const MODELS = {
  classify: 'claude-haiku-4-5',
  edit: 'claude-haiku-4-5',
  generate: 'claude-sonnet-5',
} as const;

export function anthropic(): Anthropic | null {
  if (!process.env.ANTHROPIC_API_KEY) return null;
  return new Anthropic();
}

/**
 * House writing style, appended to every copy-writing system prompt.
 * The owner's rules: humane English, and no dashes used as punctuation.
 */
export const HOUSE_STYLE =
  ' STYLE RULES: Write like a real person who owns the place, not a marketer. Plain, humane Australian English; contractions are fine. ' +
  'NEVER use a dash as punctuation (no em dashes, en dashes, or hyphens standing in for a pause). Use a comma, a full stop, or start a new sentence instead. ' +
  'Hyphens inside compound words (off-grid, two-night) are fine. No rhetorical questions, no exclamation pileups, no cliches like nestled, hidden gem, or escape the hustle.';

/** Belt and braces: replace punctuation dashes the model sneaks in anyway. */
export function stripDashes(text: string): string {
  return text
    .replace(/\s+[—–]\s+/g, ', ')
    .replace(/([a-zA-Z0-9])—([a-zA-Z0-9])/g, '$1, $2')
    .replace(/\s+-\s+/g, ', ');
}

const VALID_TAGS = [
  'festival', 'music', 'sports', 'conference', 'business', 'community',
  'family', 'wellness', 'nature-walking', 'food-wine', 'arts',
  'wedding-milestone', 'market', 'school-holiday', 'public-holiday',
  'long-weekend', 'cruise', 'romantic', 'funeral',
];

const ENRICH_SCHEMA = {
  type: 'object',
  properties: {
    events: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          tags: { type: 'array', items: { type: 'string', enum: VALID_TAGS } },
          demand: { type: 'integer', description: 'Estimated accommodation demand 0-100' },
          audience: { type: 'integer', description: 'Estimated total event attendance (people)' },
          viable: {
            type: 'boolean',
            description:
              'True only if this is a real, dated, in-person event within reach of Devonport/Port Sorell/Bakers Beach with any realistic chance of driving overnight stays. Online events, vague listings, tiny recurring meetups and things unlikely to actually happen are false.',
          },
          summary: { type: 'string', description: 'One sentence for the property owner: what this event is and why it matters for bookings' },
        },
        required: ['id', 'tags', 'demand', 'audience', 'viable', 'summary'],
        additionalProperties: false,
      },
    },
  },
  required: ['events'],
  additionalProperties: false,
} as const;

interface EnrichedEvent {
  id: string;
  tags: string[];
  demand: number;
  audience: number;
  viable: boolean;
  summary: string;
}

/**
 * Haiku pass over scraped events: refine tags, estimate demand, write an
 * owner-facing one-liner. Batched to keep cost at cents per run.
 */
export async function enrichEvents(supabase: SupabaseClient, limit = 20): Promise<number> {
  const client = anthropic();
  if (!client) throw new Error('ANTHROPIC_API_KEY is not set');

  const { data: events, error } = await supabase
    .from('events')
    .select('id, title, description, start_date, end_date, venue_name, locality, tags')
    .is('ai_enriched_at', null)
    .gte('start_date', new Date().toISOString().slice(0, 10))
    .limit(limit);
  if (error) throw new Error(error.message);
  if (!events?.length) return 0;

  const response = await client.messages.create({
    model: MODELS.classify,
    max_tokens: 4096,
    system:
      'You classify events near Devonport, Tasmania for a short-term accommodation booking platform. ' +
      'For each event: pick the applicable tags, estimate accommodation demand 0-100 ' +
      '(consider likely attendance, whether attendees travel and stay overnight, multi-day span, and seasonality), ' +
      'estimate total attendance as a whole number of people, ' +
      'and write one owner-facing sentence on the booking opportunity. Return every event id you were given.',
    messages: [{ role: 'user', content: JSON.stringify(events) }],
    output_config: { format: { type: 'json_schema', schema: ENRICH_SCHEMA } },
  });

  const text = response.content.find((b) => b.type === 'text')?.text ?? '{"events":[]}';
  const parsed = JSON.parse(text) as { events: EnrichedEvent[] };

  let updated = 0;
  for (const e of parsed.events) {
    const { error: upErr } = await supabase
      .from('events')
      .update({
        tags: e.tags,
        ai_demand: Math.max(0, Math.min(100, e.demand)),
        estimated_audience: Math.max(0, Math.round(e.audience)),
        ai_summary: e.summary,
        ai_enriched_at: new Date().toISOString(),
        dismissed: !e.viable,
      })
      .eq('id', e.id);
    if (!upErr) updated++;

    // Non-viable events leave the feed entirely — dismiss their opportunities.
    if (!e.viable) {
      await supabase
        .from('opportunities')
        .update({ status: 'dismissed', updated_at: new Date().toISOString() })
        .eq('event_id', e.id)
        .eq('status', 'new');
    }
  }
  return updated;
}
