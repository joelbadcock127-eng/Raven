import Sidebar from '@/components/Sidebar';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      {/* Apply the saved admin theme before paint. Only this layout runs it,
          so the property websites are never affected. */}
      <script
        dangerouslySetInnerHTML={{
          __html:
            "try{if(localStorage.getItem('raven-theme')==='dark')document.documentElement.setAttribute('data-raven-theme','dark')}catch(e){}",
        }}
      />
      <Sidebar />
      <main style={{ position: 'relative', flex: 1, minWidth: 0 }}>
        <div className="mesh" />
        <div className="admin-content">{children}</div>
      </main>
    </div>
  );
}
