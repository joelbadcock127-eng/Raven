'use client';

import { useState } from 'react';
import type { SiteDef } from '@/lib/sites';
import type { SitePageV2, SiteVersion } from '@/lib/siteBuilder';
import SitesWorkspace from '@/components/SitesWorkspace';
import SiteBuilder from '@/components/SiteBuilder';

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
  const [builderProperty, setBuilderProperty] = useState(sites[0]?.propertyId ?? '');
  const site = sites.find((s) => s.propertyId === builderProperty) ?? sites[0];
  const data = builder[builderProperty] ?? { versions: [], pagesByVersion: {}, liveVersionId: null, domains: [] };

  return (
    <div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        {(
          [
            ['mirror', 'Current sites'],
            ['builder', 'Site builder'],
          ] as const
        ).map(([m, label]) => (
          <button
            key={m}
            type="button"
            onClick={() => setMode(m)}
            className="pill-primary"
            style={{
              background: mode === m ? 'var(--brand-dark-900)' : 'var(--canvas)',
              color: mode === m ? '#fff' : 'var(--ink-secondary)',
              border: `1px solid ${mode === m ? 'var(--brand-dark-900)' : 'var(--hairline)'}`,
            }}
          >
            {label}
          </button>
        ))}
        {mode === 'builder' && (
          <>
            <span style={{ width: 8 }} />
            {sites.map((s) => (
              <button
                key={s.propertyId}
                type="button"
                onClick={() => setBuilderProperty(s.propertyId)}
                className="pill-primary"
                style={{
                  fontSize: 13,
                  background: s.propertyId === builderProperty ? 'var(--primary)' : 'var(--canvas)',
                  color: s.propertyId === builderProperty ? '#fff' : 'var(--ink-secondary)',
                  border: `1px solid ${s.propertyId === builderProperty ? 'var(--primary)' : 'var(--hairline)'}`,
                }}
              >
                {s.name}
              </button>
            ))}
          </>
        )}
      </div>

      {mode === 'mirror' ? (
        <SitesWorkspace sites={sites} />
      ) : (
        <SiteBuilder
          key={builderProperty}
          propertyId={builderProperty}
          propertyName={site?.name ?? builderProperty}
          versions={data.versions}
          pagesByVersion={data.pagesByVersion}
          liveVersionId={data.liveVersionId}
          domains={data.domains}
        />
      )}
    </div>
  );
}
