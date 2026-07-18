'use client';

import { useState } from 'react';
import type { SiteDef } from '@/lib/sites';
import type { SitePageV2, SiteVersion } from '@/lib/siteBuilder';
import SitesWorkspace from '@/components/SitesWorkspace';
import SiteBuilder from '@/components/SiteBuilder';
import Segmented from '@/components/Segmented';

export interface BuilderData {
  versions: SiteVersion[];
  pagesByVersion: Record<string, SitePageV2[]>;
  liveVersionId: string | null;
  domains: string[];
}

export default function SitesHub({
  sites,
  builder,
}: {
  sites: SiteDef[];
  builder: Record<string, BuilderData>;
}) {
  const [mode, setMode] = useState<'mirror' | 'builder'>('mirror');
  // one property selection shared by both views, so the pill never jumps
  const [property, setProperty] = useState(sites[0]?.propertyId ?? '');
  const site = sites.find((s) => s.propertyId === property) ?? sites[0];
  const data = builder[property] ?? { versions: [], pagesByVersion: {}, liveVersionId: null, domains: [] };

  return (
    <div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        {/* single segmented pill */}
        <div
          role="tablist"
          style={{
            display: 'inline-flex',
            padding: 3,
            borderRadius: 'var(--r-pill)',
            background: 'var(--canvas)',
            border: '1px solid var(--hairline)',
            boxShadow: 'var(--shadow-1)',
          }}
        >
          {(
            [
              ['mirror', 'Current sites'],
              ['builder', 'Site builder'],
            ] as const
          ).map(([m, label]) => (
            <button
              key={m}
              type="button"
              role="tab"
              aria-selected={mode === m}
              onClick={() => setMode(m)}
              style={{
                border: 'none',
                cursor: 'pointer',
                fontSize: 14,
                fontWeight: mode === m ? 500 : 400,
                padding: '8px 18px',
                borderRadius: 'var(--r-pill)',
                background: mode === m ? 'var(--brand-dark-900)' : 'transparent',
                color: mode === m ? '#fff' : 'var(--ink-secondary)',
                transition: 'background .15s, color .15s',
              }}
            >
              {label}
            </button>
          ))}
        </div>
        <Segmented
          items={sites.map((s) => ({ id: s.propertyId, label: s.name }))}
          activeId={property}
          onSelect={setProperty}
        />
      </div>

      {mode === 'mirror' ? (
        <SitesWorkspace sites={sites} activeSiteId={property} />
      ) : (
        <SiteBuilder
          key={property}
          propertyId={property}
          propertyName={site?.name ?? property}
          versions={data.versions}
          pagesByVersion={data.pagesByVersion}
          liveVersionId={data.liveVersionId}
          domains={data.domains}
        />
      )}
    </div>
  );
}
