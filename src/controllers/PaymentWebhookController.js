const PaymentService = require('../services/PaymentService');

const SECRET = process.env.MERCADOPAGO_WEBHOOK_SECRET;

async function handleWebhook(req, res) {
  try {
    if (SECRET) {
      const incomingSecret =
        req.headers['x-mercadopago-secret'] ||
        req.headers['x-signature'] ||
        req.query.secret;
      if (incomingSecret !== SECRET) {
        return res.sendStatus(401);
      }
    }

    await PaymentService.processWebhookEvent(req.body);
    return res.sendStatus(200);
  } catch (err) {
    console.error('Erro no webhook do Mercado Pago:', err);
    return res.sendStatus(500);
  }
}

module.exports = {
  handleWebhook,
};
