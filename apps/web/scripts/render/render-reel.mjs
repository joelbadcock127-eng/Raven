/**
 * Reel renderer — runs inside GitHub Actions (ffmpeg preinstalled).
 *
 * Payload (from repository_dispatch client_payload, env PAYLOAD):
 * {
 *   jobId, completeUrl, completeToken,
 *   uploadUrl,                 // presigned PUT for the output MP4
 *   publicUrl,                 // where the output will be readable
 *   spec: {
 *     width, height,           // 1080x1920 default
 *     clipSeconds,             // seconds kept from each clip (default 2.8)
 *     maxDuration,             // hard cap (default 30)
 *     clips: [{ url }],        // source videos, R2 public URLs
 *     filter,                  // 'none' | 'warm' | 'cool' | 'mono' | 'punchy'
 *     caption,                 // optional overlay text (bottom third)
 *     musicUrl,                // optional audio track URL
 *   }
 * }
 */
import { execFileSync } from 'node:child_process';
import { writeFileSync, mkdirSync, readFileSync, statSync } from 'node:fs';

const payload = JSON.parse(process.env.PAYLOAD ?? '{}');
const { jobId, completeUrl, completeToken, uploadUrl, publicUrl } = payload;
const spec = payload.spec ?? {};
const W = spec.width ?? 1080;
const H = spec.height ?? 1920;
const CLIP_S = spec.clipSeconds ?? 2.8;
const MAX_S = spec.maxDuration ?? 30;

const FILTERS = {
  none: '',
  warm: ',colorbalance=rm=0.06:gm=0.02:bm=-0.06,eq=saturation=1.12:contrast=1.05',
  cool: ',colorbalance=rm=-0.05:bm=0.06,eq=saturation=1.05:contrast=1.04',
  mono: ',hue=s=0,eq=contrast=1.12:brightness=0.02',
  punchy: ',eq=saturation=1.25:contrast=1.12:brightness=0.01',
};
const grade = FILTERS[spec.filter] ?? '';

async function report(status, fields = {}) {
  if (!completeUrl) return;
  await fetch(completeUrl, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ token: completeToken, jobId, status, ...fields }),
  }).catch((e) => console.error('report failed:', e.message));
}

function sh(cmd, args) {
  console.log('$', cmd, args.join(' '));
  execFileSync(cmd, args, { stdio: 'inherit' });
}

function shOut(cmd, args) {
  return execFileSync(cmd, args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
}

/**
 * Find the best-sounding start point in a music track: scan RMS loudness in
 * one-second buckets and pick the window with the highest average energy
 * (usually a chorus), skipping the first 10 seconds of intro. Falls back to
 * 0 for short tracks or if the scan fails.
 */
function bestMusicStart(file, windowSeconds) {
  try {
    const durOut = shOut('ffprobe', [
      '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', file,
    ]);
    const total = parseFloat(durOut);
    if (!Number.isFinite(total) || total < windowSeconds + 20) return 0;

    // per-frame RMS via astats; asetnsamples makes each frame ~1s of audio
    const scan = shOut('ffmpeg', [
      '-i', file, '-map', '0:a:0',
      '-af', 'asetnsamples=44100,astats=metadata=1:reset=1,ametadata=print:key=lavfi.astats.Overall.RMS_level',
      '-f', 'null', '-',
    ]);
    const rms = [...scan.matchAll(/RMS_level=(-?[\d.]+|-inf)/g)].map((m) =>
      m[1] === '-inf' ? -90 : parseFloat(m[1]),
    );
    if (rms.length < windowSeconds + 12) return 0;

    const win = Math.ceil(windowSeconds);
    let best = 10; // never start inside the first 10s
    let bestAvg = -Infinity;
    for (let t = 10; t + win < rms.length; t++) {
      const avg = rms.slice(t, t + win).reduce((a, b) => a + b, 0) / win;
      if (avg > bestAvg) {
        bestAvg = avg;
        best = t;
      }
    }
    console.log(`music: track ${total.toFixed(0)}s, loudest ${win}s window starts at ${best}s`);
    return best;
  } catch (err) {
    console.warn('music scan failed, starting from 0:', err.message);
    return 0;
  }
}

try {
  const clips = (spec.clips ?? []).slice(0, Math.floor(MAX_S / CLIP_S));
  if (!clips.length) throw new Error('spec has no clips');
  await report('rendering');

  mkdirSync('work', { recursive: true });

  // 1. download + normalise each clip: trim, scale-crop to 9:16, grade, 30fps.
  //    Image clips become a slow Ken Burns pan/zoom so reels can be built from
  //    the photo library alone (alternating zoom-in / zoom-out for variety).
  const FRAMES = Math.round(CLIP_S * 30);
  const parts = [];
  for (let i = 0; i < clips.length; i++) {
    const src = `work/src${i}`;
    const res = await fetch(clips[i].url);
    if (!res.ok) throw new Error(`clip ${i}: HTTP ${res.status}`);
    writeFileSync(src, Buffer.from(await res.arrayBuffer()));
    const out = `work/part${i}.mp4`;

    const isImage =
      clips[i].type === 'image' ||
      (!clips[i].type && /\.(jpe?g|png|webp|gif)($|\?)/i.test(clips[i].url));

    if (isImage) {
      // scale to a 2x canvas so there's resolution to zoom into, then zoompan
      const zoomIn = i % 2 === 0;
      const z = zoomIn
        ? `min(zoom+0.0011,1.16)`
        : `if(lte(zoom,1.0),1.16,max(zoom-0.0011,1.0))`;
      sh('ffmpeg', [
        '-y', '-loop', '1', '-t', String(CLIP_S), '-i', src,
        '-vf',
        `scale=${W * 2}:${H * 2}:force_original_aspect_ratio=increase,crop=${W * 2}:${H * 2},` +
          `zoompan=z='${z}':d=${FRAMES}:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':s=${W}x${H}:fps=30,` +
          `format=yuv420p${grade}`,
        '-r', '30', '-an', '-c:v', 'libx264', '-preset', 'fast', '-crf', '21', out,
      ]);
    } else {
      sh('ffmpeg', [
        '-y', '-i', src, '-t', String(CLIP_S),
        '-vf',
        `scale=${W}:${H}:force_original_aspect_ratio=increase,crop=${W}:${H},fps=30,format=yuv420p${grade}`,
        '-an', '-c:v', 'libx264', '-preset', 'fast', '-crf', '21', out,
      ]);
    }
    parts.push(out);
  }

  // 2. concat
  writeFileSync('work/list.txt', parts.map((p) => `file '${p.replace('work/', '')}'`).join('\n'));
  sh('ffmpeg', ['-y', '-f', 'concat', '-safe', '0', '-i', 'work/list.txt', '-c', 'copy', 'work/joined.mp4']);
  let current = 'work/joined.mp4';

  // 3. caption overlay (bottom third, subtle box)
  if (spec.caption) {
    const text = String(spec.caption).replace(/[\\']/g, '').replace(/[:%]/g, '\\$&');
    sh('ffmpeg', [
      '-y', '-i', current,
      '-vf',
      `drawtext=fontfile=/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf:text='${text}':fontsize=54:fontcolor=white:borderw=2:bordercolor=black@0.55:x=(w-text_w)/2:y=h-360`,
      '-c:a', 'copy', 'work/captioned.mp4',
    ]);
    current = 'work/captioned.mp4';
  }

  // 4. music — long tracks get their loudest section (usually the chorus),
  // not the first N seconds of intro; fade in and out
  if (spec.musicUrl) {
    const res = await fetch(spec.musicUrl);
    if (res.ok) {
      writeFileSync('work/music', Buffer.from(await res.arrayBuffer()));
      const dur = clips.length * CLIP_S;
      const start = bestMusicStart('work/music', dur);
      sh('ffmpeg', [
        '-y', '-i', current, '-ss', String(start), '-i', 'work/music',
        '-filter_complex',
        `[1:a]atrim=0:${dur},afade=t=in:st=0:d=0.8,afade=t=out:st=${Math.max(0, dur - 1.5)}:d=1.5[a]`,
        '-map', '0:v', '-map', '[a]', '-c:v', 'copy', '-c:a', 'aac', '-shortest', 'work/final.mp4',
      ]);
      current = 'work/final.mp4';
    }
  }

  // 5. upload to R2
  const buf = readFileSync(current);
  console.log(`output ${(statSync(current).size / 1024 / 1024).toFixed(1)} MB`);
  const put = await fetch(uploadUrl, {
    method: 'PUT',
    headers: { 'content-type': 'video/mp4' },
    body: buf,
  });
  if (!put.ok) throw new Error(`upload failed: HTTP ${put.status}`);

  await report('done', { outputUrl: publicUrl });
  console.log('render complete →', publicUrl);
} catch (err) {
  console.error(err);
  await report('failed', { error: String(err.message ?? err) });
  process.exit(1);
}
