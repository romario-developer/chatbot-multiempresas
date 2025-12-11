import { Tenant } from '../types';

type SidebarProps = {
  tenants: Tenant[];
  activeTenantId?: string;
  onSelectTenant: (tenantId: string) => void;
};

export function Sidebar({ tenants, activeTenantId, onSelectTenant }: SidebarProps) {
  return (
    <nav style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: '0 12px 24px' }}>
      <div style={{ padding: '8px 12px', fontSize: 12, color: '#64748b', textTransform: 'uppercase' }}>
        Workspaces
      </div>
      {tenants.map((t) => (
        <button
          key={t.id}
          onClick={() => onSelectTenant(t.id)}
          style={{
            textAlign: 'left',
            border: '1px solid #e2e8f0',
            background: activeTenantId === t.id ? '#e0f2fe' : '#fff',
            color: '#0f172a',
            padding: '10px 12px',
            borderRadius: 10,
            cursor: 'pointer',
          }}
        >
          <div style={{ fontWeight: 600 }}>{t.name}</div>
          {t.slug && <div style={{ fontSize: 12, color: '#475569' }}>{t.slug}</div>}
        </button>
      ))}
      {tenants.length === 0 && (
        <div style={{ color: '#94a3b8', fontSize: 14, padding: '0 12px' }}>Nenhum workspace ainda</div>
      )}
    </nav>
  );
}
