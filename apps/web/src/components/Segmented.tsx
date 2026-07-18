'use client';

/** One joined pill with clickable segments — the app's standard switcher. */
export default function Segmented({
  items,
  activeId,
  onSelect,
  size = 'md',
  activeBg = 'var(--primary)',
}: {
  items: { id: string; label: string }[];
  activeId?: string | null;
  onSelect: (id: string) => void;
  size?: 'sm' | 'md';
  activeBg?: string;
}) {
  return (
    <div
      role="tablist"
      style={{
        display: 'inline-flex',
        padding: 3,
        borderRadius: 'var(--r-pill)',
        background: 'var(--canvas)',
        border: '1px solid var(--hairline)',
        boxShadow: 'var(--shadow-1)',
        flexWrap: 'wrap',
      }}
    >
      {items.map((item) => {
        const on = activeId === item.id;
        return (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={on}
            onClick={() => onSelect(item.id)}
            style={{
              border: 'none',
              cursor: 'pointer',
              fontSize: size === 'sm' ? 12 : 14,
              fontWeight: on ? 500 : 400,
              padding: size === 'sm' ? '6px 12px' : '8px 16px',
              borderRadius: 'var(--r-pill)',
              background: on ? activeBg : 'transparent',
              color: on ? '#fff' : 'var(--ink-secondary)',
              transition: 'background .15s, color .15s',
              whiteSpace: 'nowrap',
            }}
          >
            {item.label}
          </button>
        );
      })}
    </div>
  );
}
