// Serviço básico para tratar payloads do webhook do WhatsApp
function handleWebhookPayload(payload) {
  if (!payload || payload.object !== 'whatsapp_business_account') {
    return;
  }

  const entries = payload.entry || [];
  entries.forEach((entry) => {
    const changes = entry.changes || [];
    changes.forEach((change) => {
      const value = change.value || {};
      const messages = value.messages || [];
      const statuses = value.statuses || [];

      messages.forEach((message) => {
        const from = message.from;
        const text = message.text?.body;
        console.log('[WhatsApp] Mensagem recebida', { from, text, messageId: message.id });
        // TODO: adicionar roteamento para Conversation/Order a partir do conteúdo
      });

      statuses.forEach((status) => {
        console.log('[WhatsApp] Status de mensagem', {
          id: status.id,
          status: status.status,
          timestamp: status.timestamp,
        });
      });
    });
  });
}

module.exports = {
  handleWebhookPayload,
};
