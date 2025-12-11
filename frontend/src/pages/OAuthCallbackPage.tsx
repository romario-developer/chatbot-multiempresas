import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { whatsappService } from '../services/whatsappService';

export default function OAuthCallbackPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [message, setMessage] = useState('Processando autorizacao...');

  useEffect(() => {
    const status = params.get('status');
    const tenantId = params.get('tenantId');

    const refreshStatus = async () => {
      if (tenantId) {
        try {
          await whatsappService.getStatus(tenantId);
        } catch (err) {
          // ignore; backend pode ainda estar processando
        }
      }
    };

    if (status === 'success') {
      setMessage('Conexao autorizada, atualizando status...');
      refreshStatus().finally(() => {
        navigate('/dashboard');
      });
    } else {
      setMessage(`Erro ao conectar: ${params.get('reason') || 'tente novamente'}`);
      setTimeout(() => navigate('/dashboard'), 1500);
    }
  }, [navigate, params]);

  return (
    <div style={{ padding: 24 }}>
      <h3>OAuth Meta</h3>
      <div>{message}</div>
    </div>
  );
}
