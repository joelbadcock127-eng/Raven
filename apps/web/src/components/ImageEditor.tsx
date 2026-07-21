'use client';

import { useEffect, useRef, useState } from 'react';
import { createUploadUrl, registerEditedAsset } from '@/app/(admin)/media/actions';

/**
 * Lightweight in-app image editor for social posts: crop to an aspect ratio
 * (with pan + zoom), pick a filter, and lay draggable text captions on top.
 * The preview is a CSS-filtered, cropped background with text divs; export
 * redraws exactly the same crop, filter and text onto a canvas and uploads
 * the result to R2 as a new asset (the original is never touched).
 */

interface Filter {
  brightness: number;
  contrast: number;
  saturate: number;
  sepia: number;
  grayscale: number;
  hue: number;
}
const NO_FILTER: Filter = { brightness: 1, contrast: 1, saturate: 1, sepia: 0, grayscale: 0, hue: 0 };
const PRESETS: Record<string, Filter> = {
  Original: NO_FILTER,
  Warm: { brightness: 1.03, contrast: 1.05, saturate: 1.12, sepia: 0.18, grayscale: 0, hue: -4 },
  Cool: { brightness: 1.02, contrast: 1.05, saturate: 1.08, sepia: 0, grayscale: 0, hue: 8 },
  Bright: { brightness: 1.12, contrast: 1.03, saturate: 1.06, sepia: 0, grayscale: 0, hue: 0 },
  Punchy: { brightness: 1.0, contrast: 1.16, saturate: 1.32, sepia: 0, grayscale: 0, hue: 0 },
  Mono: { brightness: 1.03, contrast: 1.12, saturate: 1, sepia: 0, grayscale: 1, hue: 0 },
};
const filterString = (f: Filter) =>
  `brightness(${f.brightness}) contrast(${f.contrast}) saturate(${f.saturate}) sepia(${f.sepia}) grayscale(${f.grayscale}) hue-rotate(${f.hue}deg)`;

const ASPECTS: Array<{ label: string; value: number | null }> = [
  { label: 'Square 1:1', value: 1 },
  { label: 'Portrait 4:5', value: 4 / 5 },
  { label: 'Story 9:16', value: 9 / 16 },
  { label: 'Landscape 1.91:1', value: 1.91 },
  { label: 'Original', value: null },
];

interface TextLayer {
  id: string;
  text: string;
  x: number; // 0..1 of crop width (centre)
  y: number; // 0..1 of crop height (centre)
  size: number; // px in the preview viewport
  color: string;
  bg: boolean;
}

const MAX_OUT = 1440; // longest edge of exported image

export default function ImageEditor({
  asset,
  onClose,
  onSaved,
}: {
  asset: { id: string; property_id: string | null; file_name: string };
  onClose: () => void;
  onSaved: (newId: string) => void;
}) {
  const [img, setImg] = useState<HTMLImageElement | null>(null);
  const [aspect, setAspect] = useState<number | null>(1);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0.5, y: 0.5 }); // crop centre, 0..1 of image
  const [filter, setFilter] = useState<Filter>(NO_FILTER);
  const [presetName, setPresetName] = useState('Original');
  const [texts, setTexts] = useState<TextLayer[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [busy, setBusy] = useState('');
  const viewportRef = useRef<HTMLDivElement>(null);
  const drag = useRef<{ id: string | null; kind: 'pan' | 'text'; sx: number; sy: number; ox: number; oy: number } | null>(null);

  // load through the same-origin proxy so the canvas can read pixels
  useEffect(() => {
    const el = new Image();
    el.crossOrigin = 'anonymous';
    el.onload = () => setImg(el);
    el.src = `/api/media-proxy?id=${asset.id}`;
  }, [asset.id]);

  // ── crop geometry in source pixels ──
  const crop = (() => {
    if (!img) return null;
    const iw = img.naturalWidth;
    const ih = img.naturalHeight;
    const a = aspect ?? iw / ih;
    // largest rect of aspect a inside the image, then tightened by zoom
    let w = Math.min(iw, ih * a);
    let h = w / a;
    w /= zoom;
    h /= zoom;
    const cx = pan.x * iw;
    const cy = pan.y * ih;
    let x = cx - w / 2;
    let y = cy - h / 2;
    x = Math.max(0, Math.min(iw - w, x));
    y = Math.max(0, Math.min(ih - h, y));
    return { x, y, w, h, iw, ih, a };
  })();

  const onPointerDown = (e: React.PointerEvent, kind: 'pan' | 'text', id: string | null) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    if (kind === 'text' && id) setSelected(id);
    const t = id ? texts.find((x) => x.id === id) : null;
    drag.current = { id, kind, sx: e.clientX, sy: e.clientY, ox: t?.x ?? pan.x, oy: t?.y ?? pan.y };
  };
  const onPointerMove = (e: React.PointerEvent) => {
    const d = drag.current;
    const vp = viewportRef.current;
    if (!d || !vp) return;
    const rect = vp.getBoundingClientRect();
    const dx = (e.clientX - d.sx) / rect.width;
    const dy = (e.clientY - d.sy) / rect.height;
    if (d.kind === 'text' && d.id) {
      setTexts((prev) => prev.map((t) => (t.id === d.id ? { ...t, x: clamp01(d.ox + dx), y: clamp01(d.oy + dy) } : t)));
    } else {
      // dragging the image pans the crop the opposite way
      setPan((p) => ({ x: clamp01(d.ox - dx / zoom), y: clamp01(d.oy - dy / zoom) }));
    }
  };
  const onPointerUp = () => (drag.current = null);

  const addText = () => {
    const id = Math.random().toString(36).slice(2, 8);
    setTexts((t) => [...t, { id, text: 'Your text', x: 0.5, y: 0.82, size: 34, color: '#ffffff', bg: true }]);
    setSelected(id);
  };
  const patchText = (id: string, patch: Partial<TextLayer>) =>
    setTexts((prev) => prev.map((t) => (t.id === id ? { ...t, ...patch } : t)));
  const removeText = (id: string) => {
    setTexts((prev) => prev.filter((t) => t.id !== id));
    setSelected(null);
  };

  const applyPreset = (name: string) => {
    setPresetName(name);
    setFilter(PRESETS[name]);
  };

  async function save() {
    if (!img || !crop) return;
    setBusy('Rendering…');
    try {
      const outW = Math.min(MAX_OUT, Math.round(crop.w));
      const outH = Math.round(outW / crop.a);
      const canvas = document.createElement('canvas');
      canvas.width = outW;
      canvas.height = outH;
      const ctx = canvas.getContext('2d')!;
      ctx.filter = filterString(filter);
      ctx.drawImage(img, crop.x, crop.y, crop.w, crop.h, 0, 0, outW, outH);
      ctx.filter = 'none';

      // text: preview viewport → output scale
      const vpW = viewportRef.current?.getBoundingClientRect().width ?? outW;
      const scale = outW / vpW;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      for (const t of texts) {
        if (!t.text.trim()) continue;
        const fs = t.size * scale;
        ctx.font = `600 ${fs}px Georgia, serif`;
        const x = t.x * outW;
        const y = t.y * outH;
        if (t.bg) {
          const m = ctx.measureText(t.text);
          const padX = fs * 0.4;
          const padY = fs * 0.28;
          ctx.fillStyle = 'rgba(0,0,0,0.42)';
          ctx.fillRect(x - m.width / 2 - padX, y - fs / 2 - padY, m.width + padX * 2, fs + padY * 2);
        } else {
          ctx.shadowColor = 'rgba(0,0,0,0.55)';
          ctx.shadowBlur = fs * 0.25;
        }
        ctx.fillStyle = t.color;
        ctx.fillText(t.text, x, y);
        ctx.shadowBlur = 0;
      }

      const blob: Blob = await new Promise((res, rej) =>
        canvas.toBlob((b) => (b ? res(b) : rej(new Error('canvas export failed'))), 'image/jpeg', 0.9),
      );

      setBusy('Uploading…');
      const base = asset.file_name.replace(/\.[^.]+$/, '');
      const fileName = `${base}-edited.jpg`;
      const ticket = await createUploadUrl(fileName, 'image/jpeg');
      if (!ticket.ok || !ticket.signedUrl) throw new Error(ticket.message ?? 'no upload URL');
      const put = await fetch(ticket.signedUrl, { method: 'PUT', headers: { 'content-type': 'image/jpeg' }, body: blob });
      if (!put.ok) throw new Error(`upload failed (${put.status})`);

      const reg = await registerEditedAsset({
        sourceId: asset.id,
        propertyId: asset.property_id,
        provider: ticket.provider,
        storagePath: ticket.storagePath!,
        publicUrl: ticket.publicUrl!,
        fileName,
        mimeType: 'image/jpeg',
        sizeBytes: blob.size,
      });
      if (!reg.ok || !reg.id) throw new Error(reg.message ?? 'could not save asset');
      onSaved(reg.id);
    } catch (err) {
      setBusy(`Failed: ${(err as Error).message}`);
    }
  }

  // preview background maths (show exactly the crop rect)
  const bg = (() => {
    if (!img || !crop) return {};
    const vpW = viewportRef.current?.getBoundingClientRect().width ?? 480;
    const s = vpW / crop.w;
    return {
      backgroundImage: `url(/api/media-proxy?id=${asset.id})`,
      backgroundRepeat: 'no-repeat',
      backgroundSize: `${crop.iw * s}px ${crop.ih * s}px`,
      backgroundPosition: `${-crop.x * s}px ${-crop.y * s}px`,
      filter: filterString(filter),
    } as React.CSSProperties;
  })();

  const sel = texts.find((t) => t.id === selected);

  return (
    <div style={overlay} onClick={onClose}>
      <div className="card" style={panel} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 14 }}>
          <h2 className="heading-md">Edit image</h2>
          <button type="button" onClick={onClose} className="caption" style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-mute)', fontSize: 20 }}>
            ✕
          </button>
        </div>

        <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
          {/* preview */}
          <div style={{ flex: '1 1 340px', minWidth: 280 }}>
            <div
              ref={viewportRef}
              onPointerDown={(e) => onPointerDown(e, 'pan', null)}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              style={{
                position: 'relative',
                width: '100%',
                aspectRatio: String(crop?.a ?? 1),
                background: '#111',
                borderRadius: 10,
                overflow: 'hidden',
                cursor: 'grab',
                touchAction: 'none',
                ...bg,
              }}
            >
              {!img && <div style={{ display: 'grid', placeItems: 'center', height: '100%', color: '#fff' }} className="caption">Loading…</div>}
              {texts.map((t) => (
                <div
                  key={t.id}
                  onPointerDown={(e) => {
                    e.stopPropagation();
                    onPointerDown(e, 'text', t.id);
                  }}
                  onPointerMove={onPointerMove}
                  onPointerUp={onPointerUp}
                  style={{
                    position: 'absolute',
                    left: `${t.x * 100}%`,
                    top: `${t.y * 100}%`,
                    transform: 'translate(-50%,-50%)',
                    fontFamily: 'Georgia, serif',
                    fontWeight: 600,
                    fontSize: t.size,
                    color: t.color,
                    padding: t.bg ? '4px 10px' : 0,
                    background: t.bg ? 'rgba(0,0,0,0.42)' : 'transparent',
                    textShadow: t.bg ? 'none' : '0 1px 6px rgba(0,0,0,.55)',
                    whiteSpace: 'nowrap',
                    cursor: 'move',
                    outline: selected === t.id ? '1px dashed rgba(255,255,255,.8)' : 'none',
                    userSelect: 'none',
                  }}
                >
                  {t.text || ' '}
                </div>
              ))}
            </div>
            <p className="caption" style={{ color: 'var(--ink-mute)', marginTop: 8 }}>
              Drag the image to reposition the crop. Drag text to move it.
            </p>
          </div>

          {/* controls */}
          <div style={{ flex: '1 1 260px', minWidth: 240, display: 'grid', gap: 16, alignContent: 'start' }}>
            <div>
              <div className="micro-cap" style={{ color: 'var(--ink-mute)', marginBottom: 6 }}>Crop</div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {ASPECTS.map((a) => (
                  <button key={a.label} type="button" onClick={() => setAspect(a.value)} className="caption" style={chip(aspect === a.value)}>
                    {a.label}
                  </button>
                ))}
              </div>
              <label className="caption" style={{ display: 'block', marginTop: 8 }}>
                Zoom
                <input type="range" min={1} max={3} step={0.02} value={zoom} onChange={(e) => setZoom(Number(e.target.value))} style={{ width: '100%', accentColor: 'var(--primary)' }} />
              </label>
            </div>

            <div>
              <div className="micro-cap" style={{ color: 'var(--ink-mute)', marginBottom: 6 }}>Filter</div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {Object.keys(PRESETS).map((name) => (
                  <button key={name} type="button" onClick={() => applyPreset(name)} className="caption" style={chip(presetName === name)}>
                    {name}
                  </button>
                ))}
              </div>
              <Slider label="Brightness" value={filter.brightness} min={0.6} max={1.5} onChange={(v) => { setFilter((f) => ({ ...f, brightness: v })); setPresetName('Custom'); }} />
              <Slider label="Contrast" value={filter.contrast} min={0.6} max={1.6} onChange={(v) => { setFilter((f) => ({ ...f, contrast: v })); setPresetName('Custom'); }} />
              <Slider label="Saturation" value={filter.saturate} min={0} max={1.8} onChange={(v) => { setFilter((f) => ({ ...f, saturate: v })); setPresetName('Custom'); }} />
            </div>

            <div>
              <div style={{ display: 'flex', alignItems: 'center', marginBottom: 6 }}>
                <span className="micro-cap" style={{ color: 'var(--ink-mute)' }}>Text</span>
                <button type="button" onClick={addText} className="caption" style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--primary)' }}>+ add text</button>
              </div>
              {sel ? (
                <div style={{ display: 'grid', gap: 8 }}>
                  <input value={sel.text} onChange={(e) => patchText(sel.id, { text: e.target.value })} placeholder="Caption text" style={input} />
                  <Slider label="Size" value={sel.size} min={16} max={80} step={1} onChange={(v) => patchText(sel.id, { size: v })} />
                  <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                    <label className="caption" style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                      Colour <input type="color" value={sel.color} onChange={(e) => patchText(sel.id, { color: e.target.value })} />
                    </label>
                    <label className="caption" style={{ display: 'flex', gap: 6, alignItems: 'center', cursor: 'pointer' }}>
                      <input type="checkbox" checked={sel.bg} onChange={(e) => patchText(sel.id, { bg: e.target.checked })} style={{ accentColor: 'var(--primary)' }} /> shaded box
                    </label>
                    <button type="button" onClick={() => removeText(sel.id)} className="caption" style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ruby)' }}>remove</button>
                  </div>
                </div>
              ) : (
                <p className="caption" style={{ color: 'var(--ink-mute)' }}>Add a text layer, then drag it on the image.</p>
              )}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginTop: 18, paddingTop: 14, borderTop: '1px solid var(--hairline)' }}>
          {busy && <span className="caption">{busy}</span>}
          <span style={{ flex: 1 }} />
          <button type="button" onClick={onClose} className="caption" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-mute)' }}>Cancel</button>
          <button type="button" disabled={!img || busy.endsWith('…')} onClick={save} className="pill-primary" style={{ fontSize: 13, padding: '9px 20px' }}>
            Save as new image
          </button>
        </div>
      </div>
    </div>
  );
}

function Slider({ label, value, min, max, step = 0.01, onChange }: { label: string; value: number; min: number; max: number; step?: number; onChange: (v: number) => void }) {
  return (
    <label className="caption" style={{ display: 'block', marginTop: 6 }}>
      {label}
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} style={{ width: '100%', accentColor: 'var(--primary)' }} />
    </label>
  );
}

const clamp01 = (n: number) => Math.max(0, Math.min(1, n));
const overlay: React.CSSProperties = {
  position: 'fixed', inset: 0, zIndex: 80, background: 'rgba(15,12,8,.55)',
  display: 'grid', placeItems: 'center', padding: 20, backdropFilter: 'blur(3px)',
};
const panel: React.CSSProperties = { width: 'min(920px, 100%)', maxHeight: '92vh', overflowY: 'auto', padding: 22 };
const input: React.CSSProperties = { border: '1px solid var(--hairline)', borderRadius: 8, padding: '8px 10px', fontSize: 13, background: 'var(--canvas)', color: 'var(--ink)', width: '100%' };
const chip = (on: boolean): React.CSSProperties => ({
  padding: '5px 11px', borderRadius: 'var(--r-pill)', cursor: 'pointer', border: '1px solid',
  borderColor: on ? 'var(--primary)' : 'var(--hairline)', background: on ? 'var(--primary)' : 'var(--canvas)',
  color: on ? 'var(--on-primary)' : 'var(--ink-secondary)',
});
