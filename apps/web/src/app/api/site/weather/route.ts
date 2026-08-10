import { NextResponse } from 'next/server';

/**
 * "What she's like right now" — live Devonport conditions for the Annie May
 * site's awake strip, written in the house voice. Open-Meteo is free and
 * keyless; responses cache for 10 minutes so the API is hit ~144×/day
 * regardless of traffic.
 */

export const revalidate = 600;

const LAT = -41.18; // 16 Formby Road, Devonport
const LON = 146.35;

const DIRECTIONS = [
  'northerly', 'north-easterly', 'easterly', 'south-easterly',
  'southerly', 'south-westerly', 'westerly', 'north-westerly',
] as const;

function windWord(deg: number): string {
  return DIRECTIONS[Math.round((deg % 360) / 45) % 8];
}

/** "5.42" in Devonport local time, from an ISO timestamp Open-Meteo returns in-zone. */
function clockTime(iso: string): string {
  const m = iso.match(/T(\d{2}):(\d{2})/);
  if (!m) return '';
  const h = Number(m[1]);
  return `${((h + 11) % 12) + 1}.${m[2]}`;
}

/** The house's read on the conditions — one small flourish, never a forecast. */
function flourish(tempC: number, code: number, hour: number): string {
  const raining = (code >= 51 && code <= 67) || (code >= 80 && code <= 82);
  const snowy = code >= 71 && code <= 77;
  if (snowy) return 'Snow on the wind. The breakfast room has the fire on.';
  if (raining && hour < 12) return 'Rain on the windows. A good morning for a long breakfast.';
  if (raining) return 'Rain on the windows. She has the lamps on early.';
  if (tempC <= 8) return 'The breakfast room has the fire on.';
  if (tempC <= 13) return 'Cool enough for the fire tonight.';
  if (tempC >= 24) return 'The sheers are drawn against the afternoon sun.';
  if (code === 0 && hour >= 15) return 'Clear skies for the evening.';
  if (code === 0) return 'The house is full of light.';
  return 'The windows are open to the river air.';
}

export async function GET() {
  try {
    const url =
      `https://api.open-meteo.com/v1/forecast?latitude=${LAT}&longitude=${LON}` +
      '&current=temperature_2m,weather_code,wind_direction_10m' +
      '&daily=sunrise,sunset&forecast_days=2&timezone=Australia%2FHobart';
    const res = await fetch(url, { next: { revalidate: 600 } });
    if (!res.ok) throw new Error(`open-meteo ${res.status}`);
    const data = (await res.json()) as {
      current: { temperature_2m: number; weather_code: number; wind_direction_10m: number; time: string };
      daily: { sunrise: string[]; sunset: string[] };
    };

    const temp = Math.round(data.current.temperature_2m);
    const wind = windWord(data.current.wind_direction_10m);
    const hour = Number(data.current.time.match(/T(\d{2})/)?.[1] ?? 12);
    // Always name the NEXT sun event: before dawn it's today's sunrise,
    // during the day it's sunset, late evening it's tomorrow's sunrise.
    const sunLine =
      hour < 7
        ? `Sunrise at ${clockTime(data.daily.sunrise[0])}.`
        : hour >= 20
          ? `Sunrise at ${clockTime(data.daily.sunrise[1] ?? data.daily.sunrise[0])}.`
          : `Sunset at ${clockTime(data.daily.sunset[0])}.`;

    const line = [
      `Right now in Devonport: ${temp} degrees, ${wind}.`,
      flourish(temp, data.current.weather_code, hour),
      sunLine,
    ]
      .filter(Boolean)
      .join(' ');

    return NextResponse.json({ ok: true, line });
  } catch {
    // The strip simply doesn't render without a line — never an error state.
    return NextResponse.json({ ok: false, line: null });
  }
}
