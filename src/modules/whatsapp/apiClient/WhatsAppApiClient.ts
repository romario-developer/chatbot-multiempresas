import axios from 'axios';
import { prisma } from '../../../shared/prisma';
import { MessageLog } from '@prisma/client';

const GRAPH_BASE = process.env.WHATSAPP_API_BASE_URL || 'https://graph.facebook.com/v19.0';

export class WhatsAppApiClient {
  // Envia texto usando a integration do tenant (usa accessTokenLongLived e phone_number_id)
  static async sendTextMessage(tenantId: string, to: string, body: string) {
    const integration = await prisma.whatsAppIntegration.findFirst({
      where: { tenantId, status: 'connected' },
    });
    if (!integration || !integration.accessTokenLongLived) {
      throw new Error('Integration not connected or missing token');
    }

    const url = `${GRAPH_BASE}/${integration.phoneNumberId}/messages`;
    const payload = {
      messaging_product: 'whatsapp',
      to,
      type: 'text',
      text: { body },
    };

    try {
      await axios.post(url, payload, {
        headers: {
          Authorization: `Bearer ${integration.accessTokenLongLived}`,
          'Content-Type': 'application/json',
        },
      });

      await logMessage({
        tenantId,
        whatsappIntegrationId: integration.id,
        direction: 'OUT',
        status: 'sent',
        to,
        payload,
      });
    } catch (err: any) {
      await logMessage({
        tenantId,
        whatsappIntegrationId: integration.id,
        direction: 'OUT',
        status: 'error',
        to,
        payload,
      });
      throw err;
    }
  }
}

async function logMessage(data: {
  tenantId: string;
  whatsappIntegrationId: string;
  direction: 'IN' | 'OUT';
  status?: string | null;
  to?: string | null;
  from?: string | null;
  payload?: any;
}) {
  const record: Omit<MessageLog, 'id' | 'createdAt'> = {
    tenantId: data.tenantId,
    whatsappIntegrationId: data.whatsappIntegrationId,
    direction: data.direction,
    status: data.status || null,
    to: data.to || null,
    from: data.from || null,
    payload: data.payload || null,
    messageId: null,
  };

  await prisma.messageLog.create({ data: record });
}
