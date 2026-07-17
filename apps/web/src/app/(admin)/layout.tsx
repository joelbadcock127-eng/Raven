import Sidebar from '@/components/Sidebar';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <Sidebar />
      <main style={{ position: 'relative', flex: 1, minWidth: 0 }}>
        <div className="mesh" />
        <div style={{ position: 'relative', maxWidth: 1240, margin: '0 auto', padding: '40px 32px 96px' }}>
          {children}
        </div>
      </main>
    </div>
  );
}
