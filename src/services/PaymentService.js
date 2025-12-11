const { PrismaClient } = require('@prisma/client');
const WhatsappService = require('./WhatsappService');

const prisma = new PrismaClient();

const MERCADOPAGO_ACCESS_TOKEN = process.env.MERCADOPAGO_ACCESS_TOKEN;

async function createPixCharge(orderInput) {
  // Aceita tanto order direto quanto { order }
  const order = orderInput && orderInput.id ? orderInput : orderInput && orderInput.order;
  if (!order) {
    throw new Error('Order nao informado para criar Pix.');
  }

  const providerPaymentId = `fake-${order.id}-${Date.now()}`;
  const pixCode = `PIX-${providerPaymentId}`;

  const payment = await prisma.payment.create({
    data: {
      orderId: order.id,
      companyId: order.companyId,
      provider: 'MERCADOPAGO',
      providerPaymentId,
      status: 'PENDING',
      amount: order.totalAmount,
      qrCode: pixCode,
      rawPayload: {
        simulated: true,
        providerPaymentId,
        accessTokenSet: Boolean(MERCADOPAGO_ACCESS_TOKEN),
      },
    },
  });

  // TODO: substituir pela chamada real ao Mercado Pago para gerar cobranca Pix/QRCode
  return {
    paymentId: payment.id,
    amount: payment.amount,
    pixCode,
    providerPaymentId,
  };
}

async function processWebhookEvent(eventData) {
  // eventData deve conter um id de pagamento do Mercado Pago
  const providerPaymentId = eventData?.data?.id || eventData?.id;
  if (!providerPaymentId) {
    console.warn('Webhook sem providerPaymentId');
    return;
  }

  // TODO: chamar API do Mercado Pago para confirmar status real
  const simulatedStatus = (eventData?.data?.status || 'approved').toLowerCase();
  const normalizedStatus = simulatedStatus === 'approved' ? 'APPROVED' : simulatedStatus.toUpperCase();

  const payment = await prisma.payment.findUnique({
    where: { providerPaymentId },
    include: {
      order: {
        include: {
          customer: true,
        },
      },
    },
  });

  if (!payment) {
    console.warn('Pagamento nao encontrado para providerPaymentId:', providerPaymentId);
    return;
  }

  await prisma.payment.update({
    where: { id: payment.id },
    data: { status: normalizedStatus, rawPayload: eventData },
  });

  let orderStatus = payment.order.status;
  if (normalizedStatus === 'APPROVED') {
    orderStatus = 'PAID';
  } else if (normalizedStatus === 'REJECTED') {
    orderStatus = 'CANCELLED';
  } else {
    orderStatus = 'PENDING_PAYMENT';
  }

  await prisma.order.update({
    where: { id: payment.orderId },
    data: { status: orderStatus },
  });

  if (normalizedStatus === 'APPROVED') {
    await prisma.customer.update({
      where: { id: payment.order.customerId },
      data: {
        timesOrdered: { increment: 1 },
        lastOrderAt: new Date(),
      },
    });

    if (WhatsappService && typeof WhatsappService.sendTextMessage === 'function') {
      await WhatsappService.sendTextMessage({
        to: payment.order.customer.phone,
        text: 'Pagamento confirmado! Seu pedido ja esta em preparo.',
        // Se tiver phoneNumberId salvo em algum lugar, inclua aqui.
      });
    } else {
      console.log('[WhatsApp] Pagamento aprovado - enviar mensagem para cliente:', {
        to: payment.order.customer.phone,
      });
    }
  }
}

module.exports = {
  createPixCharge,
  processWebhookEvent,
};
