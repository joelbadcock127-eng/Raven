/**
 * Instant-navigation placeholder rendered by the admin pages' loading.tsx
 * boundaries while server data (Lodgify, Supabase) streams in. Without these
 * boundaries a dynamic page blocks the whole navigation until its fetches
 * finish, which reads as the app hanging.
 */
export default function PageSkeleton({
  title,
  tiles = 0,
  columns = 1,
}: {
  title: string;
  tiles?: number;
  columns?: number;
}) {
  return (
    <>
      <header style={{ marginBottom: 22 }}>
        <h1 className="display-lg" style={{ marginBottom: 8 }}>{title}</h1>
        <div className="skeleton" style={{ height: 14, width: 320, maxWidth: '80%' }} />
      </header>
      {tiles > 0 && (
        <section style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 22 }}>
          {Array.from({ length: tiles }, (_, i) => (
            <div key={i} className="skeleton" style={{ height: 76, width: 170 }} />
          ))}
        </section>
      )}
      <div style={{ display: 'grid', gap: 16, gridTemplateColumns: `repeat(auto-fit, minmax(300px, 1fr))` }}>
        {Array.from({ length: columns }, (_, i) => (
          <div key={i} className="skeleton" style={{ height: 380 }} />
        ))}
      </div>
    </>
  );
}
