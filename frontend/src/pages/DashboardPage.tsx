import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { Sidebar } from '../components/Sidebar';
import { TenantCard } from '../components/TenantCard';
import { WhatsAppStatusCard } from '../components/WhatsAppStatusCard';
import { ConnectButton } from '../components/ConnectButton';
import { Modal } from '../components/Modal';
import { authService } from '../services/authService';
import { tenantService } from '../services/tenantService';
import { whatsappService } from '../services/whatsappService';
import { Tenant, WhatsAppIntegration } from '../types';

export default function DashboardPage() {
  const navigate = useNavigate();
  const [userName, setUserName] = useState<string>('Cliente');
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [selectedTenantId, setSelectedTenantId] = useState<string | null>(null);
  const [newTenantName, setNewTenantName] = useState('');
  const [integration, setIntegration] = useState<WhatsAppIntegration | null>(null);
  const [loadingTenants, setLoadingTenants] = useState(false);
  const [loadingIntegration, setLoadingIntegration] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    const bootstrap = async () => {
      try {
        const user = await authService.me();
        setUserName(user?.name || user?.email || 'Cliente');
        setLoadingTenants(true);
        const list = await tenantService.listTenants();
        setTenants(list);
        if (list.length > 0) {
          setSelectedTenantId(list[0].id);
        }
      } catch (err) {
        authService.clearToken();
        navigate('/login');
      } finally {
        setLoadingTenants(false);
      }
    };
    bootstrap();
  }, [navigate]);

  useEffect(() => {
    const fetchStatus = async () => {
      if (!selectedTenantId) {
        setIntegration(null);
        return;
      }
      setLoadingIntegration(true);
      try {
        const status = await whatsappService.getStatus(selectedTenantId);
        setIntegration(status);
      } catch (err) {
        setIntegration({ status: 'disconnected' });
      } finally {
        setLoadingIntegration(false);
      }
    };
    fetchStatus();
  }, [selectedTenantId]);

  const handleCreateTenant = async () => {
    if (!newTenantName) return;
    try {
      const tenant = await tenantService.createTenant({ name: newTenantName });
      const updated = [...tenants, tenant];
      setTenants(updated);
      setSelectedTenantId(tenant.id);
      setNewTenantName('');
    } catch (err) {
      setFeedback({ type: 'error', message: 'Erro ao criar workspace' });
    }
  };

  const handleConnectWhatsApp = async () => {
    if (!selectedTenantId) return;
    try {
      const { authUrl } = await whatsappService.initOAuth(selectedTenantId);
      // Redireciona o cliente para o login/OAuth da Meta
      window.location.href = authUrl;
    } catch (err) {
      setFeedback({ type: 'error', message: 'Erro ao iniciar OAuth do WhatsApp' });
    }
  };

  const handleSendTestMessage = async () => {
    if (!selectedTenantId) return;
    try {
      await whatsappService.sendTestMessage(selectedTenantId);
      setFeedback({ type: 'success', message: 'Mensagem de teste enviada' });
    } catch (err) {
      setFeedback({ type: 'error', message: 'Erro ao enviar mensagem de teste' });
    }
  };

  const currentTenant = tenants.find((t) => t.id === selectedTenantId) || null;

  if (loadingTenants) {
    return <div style={{ padding: 24 }}>Carregando...</div>;
  }

  const showEmptyState = tenants.length === 0;

  return (
    <Layout
      userName={userName}
      sidebar={<Sidebar tenants={tenants} activeTenantId={selectedTenantId || undefined} onSelectTenant={setSelectedTenantId} />}
    >
      {showEmptyState ? (
        <div className="card" style={{ maxWidth: 480 }}>
          <h3>Crie seu primeiro workspace</h3>
          <div className="stack">
            <input
              className="input"
              placeholder="Nome da empresa"
              value={newTenantName}
              onChange={(e) => setNewTenantName(e.target.value)}
            />
            <button className="btn btn-primary" onClick={handleCreateTenant}>
              Criar workspace
            </button>
          </div>
        </div>
      ) : (
        <>
          {currentTenant && <TenantCard tenant={currentTenant} />}

          <div className="card" style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 18 }}>Conectar WhatsApp</div>
                <div style={{ color: '#475569' }}>
                  Use o login do Facebook/Meta para autorizar o seu numero do WhatsApp Business.
                </div>
              </div>
              <ConnectButton onConnect={handleConnectWhatsApp} disabled={!selectedTenantId} />
            </div>
          </div>

          <WhatsAppStatusCard
            integration={integration}
            onReconnect={handleConnectWhatsApp}
            onSendTest={handleSendTestMessage}
          />

          {loadingIntegration && <div style={{ marginTop: 8, color: '#475569' }}>Atualizando status...</div>}
        </>
      )}

      <Modal
        open={Boolean(feedback)}
        onClose={() => setFeedback(null)}
        title={feedback?.type === 'success' ? 'Tudo certo' : 'Ops, algo deu errado'}
        description={feedback?.message}
      />
    </Layout>
  );
}
