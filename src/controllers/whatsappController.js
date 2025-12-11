const { handleWebhookPayload } = require('../services/whatsappService');

// Handshake de verificação do webhook do WhatsApp (Meta)
function verifyWebhook(req, res) {
  const verifyToken = process.env.WHATSAPP_VERIFY_TOKEN;
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === verifyToken) {
    console.log('WEBHOOK VERIFICADO!');
    return res.status(200).send(challenge);
  }

  return res.sendStatus(403);
}

// Recebimento de eventos/messages do WhatsApp
function receiveWebhook(req, res) {
  try {
    handleWebhookPayload(req.body);
    return res.sendStatus(200);
  } catch (err) {
    console.error('Erro ao processar webhook do WhatsApp:', err);
    return res.sendStatus(500);
  }
}

module.exports = {
  verifyWebhook,
  receiveWebhook,
};
