import { Request, Response } from 'express';
import axios from 'axios';
import crypto from 'crypto';
import { prisma } from '../../shared/prisma';
import { MetaOAuthState, WhatsAppWebhookPayload } from './types';
import { WhatsAppApiClient } from './apiClient/WhatsAppApiClient';

const META_APP_ID = process.env.META_APP_ID || '';
const META_APP_SECRET = process.env.META_APP_SECRET || '';
const WHATSAPP_API_BASE_URL = process.env.WHATSAPP_API_BASE_URL || 'https://graph.facebook.com/v19.0';
const FRONTEND_BASE_URL = process.env.FRONTEND_BASE_URL || 'http://localhost:5173';
const OAUTH_REDIRECT_URI = process.env.OAUTH_REDIRECT_URI || 'http://localhost:3000/whatsapp/oauth/callback';

// POST /whatsapp/oauth/init
export async function initOAuth(req: Request, res: Response) {
  const { tenantId } = req.body;
  const userId = (req as any).user?.id;
  if (!tenantId || !userId) {
    return res.status(400).json({ error: 'tenantId or user missing' });
  }

  const state: MetaOAuthState = {
    tenantId,
    userId,
    nonce: crypto.randomBytes(16).toString('hex'),
  };
  const stateParam = Buffer.from(JSON.stringify(state)).toString('base64url');

  const scopes = [
    'business_management',
    'whatsapp_business_management',
    'whatsapp_business_messaging',
  ].join(',');

  const authUrl =
    'https://www.facebook.com/v19.0/dialog/oauth' +
    `?client_id=${encodeURIComponent(META_APP_ID)}` +
    `&redirect_uri=${encodeURIComponent(OAUTH_REDIRECT_URI)}` +
    `&state=${encodeURIComponent(stateParam)}` +
    `&response_type=code` +
    `&scope=${encodeURIComponent(scopes)}`;

  return res.json({ authUrl });
}

// GET /whatsapp/oauth/callback
export async function oauthCallback(req: Request, res: Response) {
  try {
    const { code, state } = req.query as { code?: string; state?: string };
    if (!code || !state) {
      return res.status(400).json({ error: 'missing code or state' });
    }

    const decoded = JSON.parse(Buffer.from(state, 'base64url').toString()) as MetaOAuthState;
    const { tenantId } = decoded;

    // Troca code por access token short-lived
    // Endpoint real: https://graph.facebook.com/v19.0/oauth/access_token
    // Aqui apenas ilustrativo:
    const tokenResp = await axios.get('https://graph.facebook.com/v19.0/oauth/access_token', {
      params: {
        client_id: META_APP_ID,
        client_secret: META_APP_SECRET,
        redirect_uri: OAUTH_REDIRECT_URI,
        code,
      },
    });

    const accessTokenShortLived = tokenResp.data.access_token;
    const expiresIn = tokenResp.data.expires_in;

    // Opcional: trocar por long-lived token
    // Endpoint real: GET /v19.0/oauth/access_token?grant_type=fb_exchange_token&client_id=...&client_secret=...&fb_exchange_token=...
    const longLivedResp = await axios.get('https://graph.facebook.com/v19.0/oauth/access_token', {
      params: {
        grant_type: 'fb_exchange_token',
        client_id: META_APP_ID,
        client_secret: META_APP_SECRET,
        fb_exchange_token: accessTokenShortLived,
      },
    }).catch(() => null);

    const accessTokenLongLived = longLivedResp?.data?.access_token || accessTokenShortLived;
    const tokenExpiresAt = longLivedResp?.data?.expires_in
      ? new Date(Date.now() + longLivedResp.data.expires_in * 1000)
      : new Date(Date.now() + expiresIn * 1000);

    // Buscar businesses (WABAs) do usuário
    // Endpoint: GET https://graph.facebook.com/v19.0/me/businesses?access_token=...
    const businessesResp = await axios.get('https://graph.facebook.com/v19.0/me/businesses', {
      params: { access_token: accessTokenLongLived },
    }).catch(() => ({ data: { data: [] } }));

    const businesses = businessesResp.data.data || [];

    // Para cada WABA, buscar phone numbers
    const numbers: Array<{ wabaId: string; phoneNumberId: string; displayPhoneNumber?: string; verifiedName?: string; capabilities?: any }> = [];
    for (const b of businesses) {
      const wabaId = b.id;
      const numbersResp = await axios.get(`https://graph.facebook.com/v19.0/${wabaId}/phone_numbers`, {
        params: { access_token: accessTokenLongLived },
      }).catch(() => ({ data: { data: [] } }));

      (numbersResp.data.data || []).forEach((pn: any) => {
        numbers.push({
          wabaId,
          phoneNumberId: pn.id,
          displayPhoneNumber: pn.display_phone_number,
          verifiedName: pn.verified_name,
          capabilities: pn.capabilities,
        });
      });
    }

    // Armazenar tokens no integration (draft) e guardar números disponíveis
    const verifyTokenWebhook = crypto.randomBytes(12).toString('hex');
    await prisma.whatsAppIntegration.upsert({
      where: { tenantId_phoneNumberId: { tenantId, phoneNumberId: numbers[0]?.phoneNumberId || 'draft' } },
      update: {
        metaAppId: META_APP_ID,
        metaAppSecret: META_APP_SECRET,
        metaUserId: tokenResp.data.user_id || null,
        accessTokenShortLived,
        accessTokenLongLived,
        tokenExpiresAt,
        status: 'disconnected',
        verifyTokenWebhook,
      },
      create: {
        tenantId,
        metaAppId: META_APP_ID,
        metaAppSecret: META_APP_SECRET,
        metaUserId: tokenResp.data.user_id || null,
        wabaId: numbers[0]?.wabaId || 'pending-waba',
        phoneNumberId: numbers[0]?.phoneNumberId || 'pending-phone',
        phoneNumber: numbers[0]?.displayPhoneNumber || 'pending',
        accessTokenShortLived,
        accessTokenLongLived,
        tokenExpiresAt,
        verifyTokenWebhook,
        status: 'disconnected',
      },
    });

    // Salvar números disponíveis
    await prisma.tenantAvailableNumber.deleteMany({ where: { tenantId } });
    if (numbers.length) {
      await prisma.tenantAvailableNumber.createMany({
        data: numbers.map((n) => ({
          tenantId,
          wabaId: n.wabaId,
          phoneNumberId: n.phoneNumberId,
          displayPhoneNumber: n.displayPhoneNumber,
          verifiedName: n.verifiedName,
          capabilities: n.capabilities,
        })),
      });
    }

    const redirect = `${FRONTEND_BASE_URL}/oauth/meta/callback?status=success&tenantId=${tenantId}`;
    return res.redirect(redirect);
  } catch (err) {
    const redirect = `${FRONTEND_BASE_URL}/oauth/meta/callback?status=error`;
    return res.redirect(redirect);
  }
}

// GET /whatsapp/available-numbers/:tenantId
export async function listAvailableNumbers(req: Request, res: Response) {
  const { tenantId } = req.params;
  const numbers = await prisma.tenantAvailableNumber.findMany({ where: { tenantId } });
  return res.json({ numbers });
}

// POST /whatsapp/select-number
export async function selectNumber(req: Request, res: Response) {
  const { tenantId, wabaId, phoneNumberId, displayPhoneNumber } = req.body;
  if (!tenantId || !wabaId || !phoneNumberId) {
    return res.status(400).json({ error: 'tenantId, wabaId, phoneNumberId required' });
  }

  const integration = await prisma.whatsAppIntegration.findFirst({ where: { tenantId } });
  if (!integration || !integration.accessTokenLongLived) {
    return res.status(400).json({ error: 'OAuth not completed for this tenant' });
  }

  // Configurar webhook / subscribed_apps (comentário: usar POST /{waba_id}/subscribed_apps com access token)
  await axios.post(`${WHATSAPP_API_BASE_URL}/${wabaId}/subscribed_apps`, null, {
    params: { access_token: integration.accessTokenLongLived },
  }).catch(() => null);

  const updated = await prisma.whatsAppIntegration.upsert({
    where: { tenantId_phoneNumberId: { tenantId, phoneNumberId } },
    update: {
      wabaId,
      phoneNumberId,
      phoneNumber: displayPhoneNumber || integration.phoneNumber,
      status: 'connected',
    },
    create: {
      tenantId,
      metaAppId: integration.metaAppId,
      metaAppSecret: integration.metaAppSecret,
      metaUserId: integration.metaUserId,
      wabaId,
      phoneNumberId,
      phoneNumber: displayPhoneNumber || 'unknown',
      verifyTokenWebhook: integration.verifyTokenWebhook || crypto.randomBytes(12).toString('hex'),
      accessTokenShortLived: integration.accessTokenShortLived,
      accessTokenLongLived: integration.accessTokenLongLived,
      tokenExpiresAt: integration.tokenExpiresAt,
      status: 'connected',
    },
  });

  return res.json({ integration: updated });
}

// GET /webhook/whatsapp (verificação)
export async function verifyWebhook(req: Request, res: Response) {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'] as string;
  const challenge = req.query['hub.challenge'] as string;

  if (mode === 'subscribe' && token) {
    const integration = await prisma.whatsAppIntegration.findFirst({
      where: { verifyTokenWebhook: token },
    });
    if (integration) {
      return res.status(200).send(challenge);
    }
  }
  return res.sendStatus(403);
}

// POST /webhook/whatsapp (eventos)
export async function handleWebhook(req: Request, res: Response) {
  const payload = req.body as WhatsAppWebhookPayload;
  const entry = payload.entry?.[0];
  const change = entry?.changes?.[0];
  const metadata = change?.value?.metadata;
  const phoneNumberId = metadata?.phone_number_id;

  let integration = null;
  if (phoneNumberId) {
    integration = await prisma.whatsAppIntegration.findFirst({ where: { phoneNumberId } });
  }

  if (integration) {
    await prisma.webhookLog.create({
      data: {
        tenantId: integration.tenantId,
        whatsappIntegrationId: integration.id,
        eventType: change?.field || 'message',
        payload,
      },
    });

    const messages = change?.value?.messages || [];
    for (const msg of messages) {
      await prisma.messageLog.create({
        data: {
          tenantId: integration.tenantId,
          whatsappIntegrationId: integration.id,
          direction: 'IN',
          status: msg.status || null,
          from: msg.from || null,
          to: metadata?.display_phone_number || null,
          payload: msg,
          messageId: msg.id || null,
        },
      });
    }

    // Stub de resposta: responder ao primeiro remetente com mensagem padrão
    const firstFrom = messages[0]?.from;
    if (firstFrom) {
      try {
        await WhatsAppApiClient.sendTextMessage(integration.tenantId, firstFrom, 'Mensagem recebida! Em breve responderemos.');
      } catch (err) {
        // log de erro silencioso
      }
    }
  }

  return res.sendStatus(200);
}

// GET /whatsapp/status
export async function getStatus(req: Request, res: Response) {
  const tenantId = (req.query.tenantId as string) || (req as any).user?.tenantId;
  if (!tenantId) return res.status(400).json({ error: 'tenantId required' });
  const integration = await prisma.whatsAppIntegration.findFirst({ where: { tenantId } });
  return res.json({ integration });
}

// POST /whatsapp/test-message
export async function sendTestMessage(req: Request, res: Response) {
  const { tenantId, to } = req.body;
  if (!tenantId) return res.status(400).json({ error: 'tenantId required' });

  // TODO: usar um campo de telefone de teste salvo no Tenant se "to" não vier
  const recipient = to || 'SEU_NUMERO_TESTE';
  await WhatsAppApiClient.sendTextMessage(tenantId, recipient, 'Olá, esta é uma mensagem de teste do seu chatbot conectado!');
  return res.json({ ok: true });
}
