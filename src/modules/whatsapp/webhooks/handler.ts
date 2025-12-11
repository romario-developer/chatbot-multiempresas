// Handler de webhooks da Meta para WhatsApp Cloud API (multi-tenant)
export async function handleWhatsappWebhook(_payload: any) {
  // TODO: extrair phone_number_id / waba_id / app_id para resolver o tenant correto
  // TODO: registrar em WebhookLog e despachar para messageFlows
}
