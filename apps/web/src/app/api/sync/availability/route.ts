import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { listProperties, getAvailability } from '@/lib/lodgify';
import { fetchBookedRanges, toNightlyAvailability } from '@/lib/ical';
import { findGaps } from '@/lib/gaps';

export const maxDuration = 300;
export const dynamic = 'force-dynamic';

const HORIZON_DAYS = 180;

function authorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  const header = req.headers.get('authorization');
  if (secret && (header === `Bearer ${secret}` || req.nextUrl.searchParams.get('secret') === secret))
    return true;
  // owner can trigger a run by hand with the upload token
  const token = process.env.RAVEN_UPLOAD_TOKEN;
  return !!token && req.nextUrl.searchParams.get('token') === token;
}

function isoPlusDays(days: number): string {
  return new Date(Date.now() + days * 86_400_000).toISOString().slice(0, 10);
}

export async function GET(req: NextRequest) {
  if (!authorized(req)) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const supabase = supabaseAdmin();
  if (!supabase) return NextResponse.json({ error: 'supabase env missing' }, { status: 500 });

  const dryRun = req.nextUrl.searchParams.get('dryRun') === '1';
  const today = new Date().toISOString().slice(0, 10);
  const horizon = isoPlusDays(HORIZON_DAYS);
  const detail: Record<string, unknown> = {};
  let status: 'ok' | 'partial' | 'error' = 'ok';

  const { data: properties, error: pErr } = await supabase
    .from('properties')
    .select('id, name, booking_source, lodgify_property_id, ical_urls, inventory');
  if (pErr || !properties) {
    return NextResponse.json({ error: pErr?.message ?? 'no properties' }, { status: 500 });
  }

  // Diagnostic mode: return raw Lodgify shapes without writing anything
  if (dryRun) {
    try {
      const lodgifyProps = await listProperties();
      return NextResponse.json({ dryRun: true, lodgifyProperties: lodgifyProps, ravenProperties: properties });
    } catch (err) {
      return NextResponse.json({ dryRun: true, lodgifyError: (err as Error).message, ravenProperties: properties });
    }
  }

  for (const prop of properties) {
    try {
      const rows: Array<{ property_id: string; unit_id: string; date: string; is_available: boolean; source: string }> = [];

      if (prop.booking_source === 'lodgify') {
        if (!prop.lodgify_property_id) {
          // Attempt auto-mapping by name
          const lodgifyProps = await listProperties();
          const match = lodgifyProps.find((lp) =>
            lp.name.toLowerCase().includes(prop.name.toLowerCase().split(' ')[0]),
          );
          if (!match) {
            detail[prop.id] = 'no lodgify_property_id and no name match — map manually in properties table';
            status = 'partial';
            continue;
          }
          await supabase.from('properties').update({ lodgify_property_id: String(match.id) }).eq('id', prop.id);
          prop.lodgify_property_id = String(match.id);
          detail[`${prop.id}_automapped`] = match.id;
        }
        const periods = await getAvailability(Number(prop.lodgify_property_id), today, horizon);
        for (const period of periods) {
          const unit = period.roomTypeId != null && prop.inventory === 'room-level' ? String(period.roomTypeId) : 'whole';
          const d = new Date(period.start + 'T00:00:00Z');
          const end = new Date(period.end + 'T00:00:00Z');
          while (d <= end) {
            const date = d.toISOString().slice(0, 10);
            if (date >= today && date <= horizon) {
              rows.push({ property_id: prop.id, unit_id: unit, date, is_available: period.available, source: 'lodgify' });
            }
            d.setUTCDate(d.getUTCDate() + 1);
          }
        }
      } else if (prop.booking_source === 'ical') {
        const urls = (prop.ical_urls ?? {}) as Record<string, string>;
        if (!Object.keys(urls).length) {
          detail[prop.id] = 'booking_source=ical but no ical_urls configured';
          status = 'partial';
          continue;
        }
        for (const [unitId, url] of Object.entries(urls)) {
          const booked = await fetchBookedRanges(url);
          const nightly = toNightlyAvailability(booked, today, horizon);
          for (const [date, isAvailable] of nightly) {
            rows.push({ property_id: prop.id, unit_id: unitId, date, is_available: isAvailable, source: 'ical' });
          }
        }
      }

      if (rows.length) {
        // Upsert in chunks
        for (let i = 0; i < rows.length; i += 500) {
          const { error: upErr } = await supabase
            .from('availability_days')
            .upsert(rows.slice(i, i + 500), { onConflict: 'property_id,unit_id,date' });
          if (upErr) throw new Error(upErr.message);
        }

        // Recompute gaps per unit (whole-property gaps only make sense per unit)
        await supabase.from('occupancy_gaps').delete().eq('property_id', prop.id).is('resolved_at', null);
        const byUnit = new Map<string, Map<string, boolean>>();
        for (const r of rows) {
          if (!byUnit.has(r.unit_id)) byUnit.set(r.unit_id, new Map());
          byUnit.get(r.unit_id)!.set(r.date, r.is_available);
        }
        for (const [unitId, nights] of byUnit) {
          const gaps = findGaps(nights).map((g) => ({
            property_id: prop.id,
            unit_id: unitId,
            start_date: g.start,
            end_date: g.end,
            nights: g.nights,
            kind: g.kind,
          }));
          if (gaps.length) {
            await supabase.from('occupancy_gaps').upsert(gaps, { onConflict: 'property_id,unit_id,start_date,end_date' });
          }
        }
        detail[prop.id] = { nights: rows.length, units: byUnit.size };
      }
    } catch (err) {
      detail[prop.id] = `error: ${(err as Error).message}`;
      status = 'partial';
    }
  }

  await supabase.from('sync_runs').insert({
    kind: 'availability',
    status,
    detail,
    finished_at: new Date().toISOString(),
  });

  return NextResponse.json({ status, detail });
}
