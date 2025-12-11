import { api } from './api';
import { WhatsAppIntegration } from '../types';

async function initOAuth(tenantId: string): Promise<{ authUrl: string }> {
  // Backend deve responder com { authUrl }
  const res = await api.post(`/whatsapp/oauth/init`, { tenantId });
  return res.data;
}

async function getStatus(tenantId: string): Promise<WhatsAppIntegration> {
  const res = await api.get(`/whatsapp/status`, { params: { tenantId } });
  return res.data.integration as WhatsAppIntegration;
}

async function sendTestMessage(tenantId: string) {
  const res = await api.post(`/whatsapp/test-message`, { tenantId });
  return res.data;
}

export const whatsappService = {
  initOAuth,
  getStatus,
  sendTestMessage,
};
