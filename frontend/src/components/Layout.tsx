import { ReactNode } from 'react';

type LayoutProps = {
  userName?: string;
  sidebar?: ReactNode;
  children: ReactNode;
};

export function Layout({ userName, sidebar, children }: LayoutProps) {
  return (
    <div className="app-shell">
      <aside style={{ borderRight: '1px solid #e2e8f0', background: '#fff' }}>
        <div style={{ padding: '16px', fontWeight: 700, fontSize: 18 }}>Chatbot SaaS</div>
        {sidebar}
      </aside>
      <main style={{ padding: '24px' }}>
        <header style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: 14, color: '#475569' }}>Logado como</div>
            <div style={{ fontWeight: 600 }}>{userName || 'Cliente'}</div>
          </div>
        </header>
        {children}
      </main>
    </div>
  );
}
