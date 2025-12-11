import { Tenant } from '../types';

type Props = {
  tenant: Tenant;
};

export function TenantCard({ tenant }: Props) {
  return (
    <div className="card" style={{ marginBottom: 16 }}>
      <div style={{ fontSize: 14, color: '#475569' }}>Workspace</div>
      <div style={{ fontWeight: 700, fontSize: 20 }}>{tenant.name}</div>
      {tenant.slug && <div style={{ color: '#64748b', marginTop: 4 }}>Slug: {tenant.slug}</div>}
    </div>
  );
}
