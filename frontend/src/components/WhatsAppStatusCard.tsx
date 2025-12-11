import { WhatsAppIntegration } from '../types';

type Props = {
  integration: WhatsAppIntegration | null;
  onReconnect?: () => void;
  onSendTest?: () => void;
};

const colors: Record<string, string> = {
  connected: '#16a34a',
  disconnected: '#64748b',
  error: '#dc2626',
  unknown: '#94a3b8',
};

export function WhatsAppStatusCard({ integration, onReconnect, onSendTest }: Props) {
  const status = integration?.status || 'unknown';
  const color = colors[status] || colors.unknown;

  return (
    <div className="card">
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div
          style={{
            width: 12,
            height: 12,
            borderRadius: '50%',
            background: color,
          }}
        />
        <div style={{ fontWeight: 700 }}>Status do WhatsApp</div>
      </div>

      <div style={{ marginTop: 12, color: '#0f172a' }}>
        <div>Status: {status}</div>
        <div>Número: {integration?.phoneNumber || '—'}</div>
        <div>Negócio: {integration?.businessName || '—'}</div>
      </div>

      <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
        <button className="btn btn-secondary" onClick={onReconnect}>
          Rever configurações
        </button>
        <button className="btn btn-primary" onClick={onSendTest}>
          Enviar mensagem de teste
        </button>
      </div>
    </div>
  );
}
