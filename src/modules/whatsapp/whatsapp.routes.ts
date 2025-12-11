import { Router } from 'express';
import {
  initOAuth,
  oauthCallback,
  listAvailableNumbers,
  selectNumber,
  verifyWebhook,
  handleWebhook,
  getStatus,
  sendTestMessage,
} from './whatsapp.controller';
import { authMiddleware } from '../../shared/middlewares/auth';

const router = Router();

// OAuth
router.post('/oauth/init', authMiddleware, initOAuth);
router.get('/oauth/callback', oauthCallback);

// Disponibilidade e seleção de números
router.get('/available-numbers/:tenantId', authMiddleware, listAvailableNumbers);
router.post('/select-number', authMiddleware, selectNumber);

// Status e teste
router.get('/status', authMiddleware, getStatus);
router.post('/test-message', authMiddleware, sendTestMessage);

// Webhook (public)
router.get('/webhook/whatsapp', verifyWebhook);
router.post('/webhook/whatsapp', handleWebhook);

export const whatsappRoutes = router;
