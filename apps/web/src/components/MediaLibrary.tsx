'use client';

import { useRef, useState, useTransition } from 'react';
import {
  createUploadUrl,
  registerAsset,
  updateAsset,
  deleteAsset,
  createFolder,
  deleteFolder,
  setAssetFolders,
  searchMusic,
  importMusic,
  type MusicResult,
} from '@/app/(admin)/media/actions';

export interface MediaAsset {
  id: string;
  property_id: string | null;
  kind: 'image' | 'video' | 'audio';
  public_url: string;
  file_name: string;
  tags: string[];
  caption: string | null;
  times_used: number;
  folder_ids: string[];
  created_at: string;
}

export interface MediaFolder {
  id: string;
  property_id: string | null;
  name: string;
}

const PROPERTIES = [
  { id: 'ten-fifty-bakers', name: 'Ten Fifty Bakers' },
  { id: 'prescription-pad', name: 'The Prescription Pad' },
  { id: 'annie-may', name: 'Annie May' },
];

export default function MediaLibrary({ assets, folders }: { assets: MediaAsset[]; folders: MediaFolder[] }) {
  const [filter, setFilter] = useState<string>('all');
  const [folderFilter, setFolderFilter] = useState<string | null>(null);
  const [uploadProperty, setUploadProperty] = useState<string>('ten-fifty-bakers');
  const [progress, setProgress] = useState<string>('');
  const [pending, startTransition] = useTransition();
  const [musicOpen, setMusicOpen] = useState(false);
  const [musicQuery, setMusicQuery] = useState('calm acoustic');
  const [musicResults, setMusicResults] = useState<MusicResult[]>([]);
  const [musicBusy, setMusicBusy] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  const visibleFolders = folders.filter((f) => filter === 'all' || f.property_id === filter || f.property_id === null);
  const visible = assets.filter(
    (a) =>
      (filter === 'all' || a.property_id === filter) &&
      (!folderFilter || a.folder_ids?.includes(folderFilter)),
  );

  const editFolders = (a: MediaAsset) => {
    const names = folders.filter((f) => a.folder_ids?.includes(f.id)).map((f) => f.name);
    const next = window.prompt(
      `Folders for this file (comma separated). Existing: ${folders.map((f) => f.name).join(', ') || 'none yet'}`,
      names.join(', '),
    );
    if (next === null) return;
    startTransition(async () => {
      const wanted = next.split(',').map((n) => n.trim()).filter(Boolean);
      const ids: string[] = [];
      for (const name of wanted) {
        const existing = folders.find((f) => f.name.toLowerCase() === name.toLowerCase());
        if (existing) ids.push(existing.id);
        else {
          const created = await createFolder(a.property_id, name);
          if (created.ok && created.id) ids.push(created.id);
        }
      }
      await setAssetFolders(a.id, ids);
    });
  };

  const runMusicSearch = async () => {
    setMusicBusy(true);
    const res = await searchMusic(musicQuery);
    setMusicResults(res.results ?? []);
    if (!res.ok) setProgress(res.message ?? 'search failed');
    setMusicBusy(false);
  };

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    const list = [...files];
    let done = 0;
    for (const file of list) {
      setProgress(`Uploading ${done + 1}/${list.length}: ${file.name}…`);
      try {
        const ticket = await createUploadUrl(file.name, file.type);
        if (!ticket.ok || !ticket.signedUrl) throw new Error(ticket.message ?? 'no upload URL');
        const put = await fetch(ticket.signedUrl, {
          method: 'PUT',
          headers: { 'content-type': file.type || 'application/octet-stream' },
          body: file,
        });
        if (!put.ok) throw new Error(`upload failed (${put.status})`);
        const reg = await registerAsset({
          propertyId: uploadProperty || null,
          provider: ticket.provider,
          storagePath: ticket.storagePath!,
          publicUrl: ticket.publicUrl!,
          fileName: file.name,
          mimeType: file.type,
          sizeBytes: file.size,
        });
        if (!reg.ok) throw new Error(reg.message ?? 'could not register asset');
        done++;
      } catch (err) {
        setProgress(`${file.name}: ${(err as Error).message}`);
        return;
      }
    }
    setProgress(`Uploaded ${done} file${done === 1 ? '' : 's'}.`);
    if (fileInput.current) fileInput.current.value = '';
  }

  const editTags = (a: MediaAsset) => {
    const next = window.prompt('Tags (comma separated)', a.tags.join(', '));
    if (next === null) return;
    const tags = next.split(',').map((t) => t.trim().toLowerCase()).filter(Boolean);
    startTransition(async () => {
      await updateAsset(a.id, { tags });
    });
  };

  const editCaption = (a: MediaAsset) => {
    const next = window.prompt('Caption / notes', a.caption ?? '');
    if (next === null) return;
    startTransition(async () => {
      await updateAsset(a.id, { caption: next });
    });
  };

  const remove = (a: MediaAsset) => {
    if (!window.confirm(`Delete ${a.file_name}? This removes it from storage too.`)) return;
    startTransition(async () => {
      await deleteAsset(a.id);
    });
  };

  return (
    <div>
      {/* ── Upload panel ── */}
      <section className="card" style={{ padding: '20px 24px', marginBottom: 24 }}>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          <span className="caption">Upload to</span>
          <select
            value={uploadProperty}
            onChange={(e) => setUploadProperty(e.target.value)}
            style={{
              font: 'inherit',
              fontSize: 13,
              padding: '6px 10px',
              borderRadius: 'var(--r-md)',
              border: '1px solid var(--hairline-input)',
              background: 'var(--canvas)',
            }}
          >
            {PROPERTIES.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
            <option value="">Shared / no property</option>
          </select>
          <input
            ref={fileInput}
            type="file"
            accept="image/*,video/*"
            multiple
            onChange={(e) => handleFiles(e.target.files)}
            style={{ fontSize: 13 }}
          />
          {progress && <span className="caption">{progress}</span>}
        </div>
        <p className="caption" style={{ marginTop: 10 }}>
          Photos and videos land in Raven&apos;s media library (Cloudflare R2). Tag the good ones —
          campaign reels and the social regular pull from here, preferring least-used assets. On
          your phone, use <a href="/u">raven…/u</a> (add it to your home screen) or the &quot;Send to
          Raven&quot; shortcut.
        </p>
      </section>

      {/* ── Music finder (Openverse, CC0/CC-BY) ── */}
      <section className="card" style={{ padding: '16px 20px', marginBottom: 16 }}>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <span className="heading-md" style={{ fontSize: 16 }}>Music for reels</span>
          <span className="caption">free Creative-Commons tracks via Openverse — imported straight into the library</span>
          <button type="button" className="pill-primary" style={{ fontSize: 12, padding: '6px 12px', marginLeft: 'auto' }} onClick={() => setMusicOpen((v) => !v)}>
            {musicOpen ? 'Close' : 'Find music'}
          </button>
        </div>
        {musicOpen && (
          <div style={{ marginTop: 12 }}>
            <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
              <input
                value={musicQuery}
                onChange={(e) => setMusicQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && runMusicSearch()}
                placeholder="e.g. calm acoustic, upbeat folk, ambient piano"
                style={{ flex: 1, font: 'inherit', fontSize: 13, padding: '8px 12px', borderRadius: 8, border: '1px solid var(--hairline-input)' }}
              />
              <button type="button" disabled={musicBusy} className="pill-primary" style={{ fontSize: 13 }} onClick={runMusicSearch}>
                {musicBusy ? 'Searching…' : 'Search'}
              </button>
            </div>
            <div style={{ display: 'grid', gap: 8 }}>
              {musicResults.map((t) => (
                <div key={t.id} style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', borderTop: '1px solid var(--hairline)', paddingTop: 8 }}>
                  <audio src={t.url} controls preload="none" style={{ height: 32, maxWidth: 220 }} />
                  <span style={{ fontSize: 13 }}>{t.title}</span>
                  <span className="caption tnum">
                    {t.creator} · {t.license}
                    {t.duration ? ` · ${Math.floor(t.duration / 60)}:${String(t.duration % 60).padStart(2, '0')}` : ''}
                  </span>
                  <button
                    type="button"
                    disabled={pending}
                    className="pill-primary"
                    style={{ fontSize: 11, padding: '4px 12px', marginLeft: 'auto' }}
                    onClick={() =>
                      startTransition(async () => {
                        const res = await importMusic(t, uploadProperty || null);
                        setProgress(res.message ?? '');
                      })
                    }
                  >
                    Import
                  </button>
                </div>
              ))}
              {musicResults.length === 0 && !musicBusy && (
                <p className="caption">Search to see tracks. CC0 needs no credit; CC-BY credits are saved automatically and can ride along in captions.</p>
              )}
            </div>
          </div>
        )}
      </section>

      {/* ── Filters ── */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
        {[{ id: 'all', name: `All (${assets.length})` }, ...PROPERTIES].map((p) => {
          const on = filter === p.id;
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => {
                setFilter(p.id);
                setFolderFilter(null);
              }}
              className="pill-primary"
              style={{
                fontSize: 13,
                background: on ? 'var(--primary)' : 'var(--canvas)',
                color: on ? 'var(--on-primary)' : 'var(--ink-secondary)',
                border: `1px solid ${on ? 'var(--primary)' : 'var(--hairline)'}`,
              }}
            >
              {p.name}
            </button>
          );
        })}
      </div>

      {/* folder chips */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        <span className="micro-cap" style={{ color: 'var(--ink-mute)' }}>Folders</span>
        {visibleFolders.map((f) => {
          const on = folderFilter === f.id;
          return (
            <button
              key={f.id}
              type="button"
              onClick={() => setFolderFilter(on ? null : f.id)}
              className="tag-soft"
              style={{
                cursor: 'pointer',
                border: '1px solid',
                borderColor: on ? 'var(--primary)' : 'transparent',
                background: on ? 'var(--primary)' : 'var(--primary-subdued)',
                color: on ? '#fff' : 'var(--primary-deep)',
                textTransform: 'none',
                letterSpacing: 0,
                fontSize: 12,
              }}
            >
              {f.name} ({assets.filter((a) => a.folder_ids?.includes(f.id)).length})
            </button>
          );
        })}
        <button
          type="button"
          className="caption"
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--primary)' }}
          onClick={() => {
            const name = window.prompt('New folder name (e.g. Winter shots, Sauna, Hero images)');
            if (name)
              startTransition(async () => {
                await createFolder(filter === 'all' ? null : filter, name);
              });
          }}
        >
          + folder
        </button>
        {folderFilter && (
          <button
            type="button"
            className="caption"
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ruby)' }}
            onClick={() => {
              if (window.confirm('Delete this folder? Files stay in the library.'))
                startTransition(async () => {
                  await deleteFolder(folderFilter);
                  setFolderFilter(null);
                });
            }}
          >
            delete folder
          </button>
        )}
      </div>

      {/* ── Grid ── */}
      {visible.length === 0 ? (
        <section className="card" style={{ padding: 32, maxWidth: 560 }}>
          <h2 className="heading-md">Nothing here yet</h2>
          <p className="caption">Upload your raw photos and videos above — Ten Fifty first.</p>
        </section>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
            gap: 16,
          }}
        >
          {visible.map((a) => (
            <figure key={a.id} className="card" style={{ overflow: 'hidden', opacity: pending ? 0.7 : 1 }}>
              {a.kind === 'audio' ? (
                <div style={{ aspectRatio: '4 / 3', display: 'grid', placeItems: 'center', background: 'var(--canvas-soft)', padding: 12 }}>
                  <audio src={a.public_url} controls preload="none" style={{ width: '100%' }} />
                </div>
              ) : a.kind === 'video' ? (
                <video
                  src={a.public_url}
                  controls
                  preload="metadata"
                  style={{ width: '100%', aspectRatio: '4 / 3', objectFit: 'cover', display: 'block', background: '#000' }}
                />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={a.public_url}
                  alt={a.caption ?? a.file_name}
                  loading="lazy"
                  style={{ width: '100%', aspectRatio: '4 / 3', objectFit: 'cover', display: 'block' }}
                />
              )}
              <figcaption style={{ padding: '10px 12px' }}>
                <div className="caption" style={{ color: 'var(--ink-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {a.caption || a.file_name}
                </div>
                <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', margin: '6px 0' }}>
                  <span className="micro-cap" style={{ color: 'var(--ink-mute)' }}>
                    {PROPERTIES.find((p) => p.id === a.property_id)?.name ?? 'shared'}
                    {a.times_used > 0 ? ` · used ×${a.times_used}` : ''}
                  </span>
                </div>
                {a.tags.length > 0 && (
                  <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 6 }}>
                    {a.tags.map((t) => (
                      <span key={t} className="tag-soft">{t}</span>
                    ))}
                  </div>
                )}
                <div style={{ display: 'flex', gap: 10 }}>
                  <button type="button" onClick={() => editTags(a)} className="caption" style={linkBtn}>tags</button>
                  <button type="button" onClick={() => editCaption(a)} className="caption" style={linkBtn}>caption</button>
                  <button type="button" onClick={() => editFolders(a)} className="caption" style={linkBtn}>folders</button>
                  <button type="button" onClick={() => remove(a)} className="caption" style={{ ...linkBtn, color: 'var(--ruby)', marginLeft: 'auto' }}>delete</button>
                </div>
              </figcaption>
            </figure>
          ))}
        </div>
      )}
    </div>
  );
}

const linkBtn: React.CSSProperties = {
  background: 'none',
  border: 'none',
  padding: 0,
  cursor: 'pointer',
  color: 'var(--primary)',
};
