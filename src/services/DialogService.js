const WhatsappService = require('./WhatsappService');
const PaymentService = require('./PaymentService');

// Imports dos helpers (fallbacks simples se ainda nao existirem)
let detectIntent = () => 'CONVERSA_GERAL';
let extractSize = () => null;
let extractDishName = () => null;

try {
  // eslint-disable-next-line global-require
  ({ detectIntent } = require('../utils/intentDetection'));
} catch (err) {
  console.warn('intentDetection helper nao encontrado, usando fallback.');
}

try {
  // eslint-disable-next-line global-require
  ({ extractSize, extractDishName } = require('../utils/textParsing'));
} catch (err) {
  console.warn('textParsing helper nao encontrado, usando fallback.');
}

const STATES = {
  NEW_CONTACT: 'NEW_CONTACT',
  IDLE: 'IDLE',
  BROWSING_MENU: 'BROWSING_MENU',
  BUILDING_ORDER: 'BUILDING_ORDER',
  CONFIRMING_ORDER: 'CONFIRMING_ORDER',
  WAITING_PAYMENT: 'WAITING_PAYMENT',
  PAID: 'PAID',
};

const DialogService = {
  async handleIncomingMessage({ prisma, company, customer, conversation, messageText, phoneNumberId }) {
    const intent = detectIntent(messageText || '');
    let conv = conversation;

    if (!conv) {
      conv = await prisma.conversation.create({
        data: {
          companyId: company.id,
          customerId: customer.id,
          currentState: STATES.NEW_CONTACT,
          context: { slots: {} },
        },
      });
    }

    const isReturning = customer.timesOrdered >= 1;
    const hasAddress = Boolean(customer.defaultDeliveryAddress);
    let context = normalizeContext(conv.context);

    // Fluxos prioritarios que dependem do contexto atual
    if (context.awaitingAddress) {
      return handleAddressCollection({
        prisma,
        company,
        customer,
        conversation: conv,
        context,
        messageText,
        phoneNumberId,
      });
    }

    if (context.awaitingDeliveryMethod) {
      return handleDeliveryChoice({
        prisma,
        company,
        customer,
        conversation: conv,
        context,
        messageText,
        phoneNumberId,
      });
    }

    if (intent === 'SAUDACAO') {
      await sendText({
        to: customer.phone,
        phoneNumberId,
        text: `Oi, tudo bem? Voce esta falando com a ${company.name}.\nPode pedir "cardapio" para ver as opcoes ou ja me dizer o que quer pedir :)`,
      });

      conv = await updateConversation(prisma, conv.id, {
        currentState: STATES.IDLE,
        context,
      });
      return conv;
    }

    if (intent === 'VER_CARDAPIO') {
      const menu = await fetchActiveMenu(prisma, company.id);
      if (!menu) {
        await sendText({
          to: customer.phone,
          phoneNumberId,
          text: 'Ainda nao tenho um cardapio ativo cadastrado.',
        });
        return conv;
      }

      await sendMenu(menu, customer.phone, phoneNumberId);
      conv = await updateConversation(prisma, conv.id, {
        currentState: STATES.BROWSING_MENU,
        context,
      });
      return conv;
    }

    // Demais intents caem no fluxo de pedido
    return handleOrderFlow({
      prisma,
      company,
      customer,
      conversation: conv,
      context,
      messageText,
      phoneNumberId,
      isReturning,
      hasAddress,
    });
  },
};

async function handleOrderFlow({
  prisma,
  company,
  customer,
  conversation,
  context,
  messageText,
  phoneNumberId,
  isReturning,
  hasAddress,
}) {
  const menu = await fetchActiveMenu(prisma, company.id);
  if (!menu) {
    await sendText({
      to: customer.phone,
      phoneNumberId,
      text: 'Ainda nao tenho um cardapio ativo cadastrado.',
    });
    return conversation;
  }

  const slots = context.slots || {};
  const size = slots.size || extractSize(messageText);

  const dishNameCandidate = extractDishName(messageText, menu.items) || slots.dishName;
  const menuItemFromNumber = pickByNumber(messageText, menu.items);
  const menuItem =
    slots.menuItemId && menu.items.find((i) => i.id === slots.menuItemId)
      ? menu.items.find((i) => i.id === slots.menuItemId)
      : menuItemFromNumber ||
        findMenuItemByName(dishNameCandidate, menu.items) ||
        null;

  const updatedContext = {
    ...context,
    slots: {
      ...slots,
      size: size || null,
      menuItemId: menuItem ? menuItem.id : slots.menuItemId || null,
      dishName: menuItem ? menuItem.name : dishNameCandidate || slots.dishName || null,
    },
  };

  // Sem tamanho e sem prato
  if (!size && !menuItem) {
    await sendText({
      to: customer.phone,
      phoneNumberId,
      text:
        'Claro! Voce prefere qual tamanho: P, M ou G?\n' +
        'E ja aproveito para te dizer as opcoes de hoje:\n' +
        formatMenuList(menu.items) +
        '\n\nPode me responder algo como: "P de feijoada" ou "M do 1".',
    });

    await updateConversation(prisma, conversation.id, {
      currentState: STATES.BUILDING_ORDER,
      context: updatedContext,
    });
    return conversation;
  }

  // Tem tamanho mas falta prato
  if (size && !menuItem) {
    await sendText({
      to: customer.phone,
      phoneNumberId,
      text:
        `Perfeito, marmita ${size}.\n` +
        'Para esse tamanho, hoje temos:\n' +
        formatMenuList(menu.items) +
        '\n\nMe diz so o numero ou o nome do prato que voce quer.',
    });

    await updateConversation(prisma, conversation.id, {
      currentState: STATES.BUILDING_ORDER,
      context: updatedContext,
    });
    return conversation;
  }

  // Tem prato mas nao tem tamanho
  if (!size && menuItem) {
    await sendText({
      to: customer.phone,
      phoneNumberId,
      text: 'Qual tamanho voce prefere: P, M ou G?',
    });

    await updateConversation(prisma, conversation.id, {
      currentState: STATES.BUILDING_ORDER,
      context: updatedContext,
    });
    return conversation;
  }

  // Tem tamanho e prato
  const orderSummary = `1 marmita ${size} de ${menuItem.name}`;
  const amount = menuItem.price;

  // Empresa sem delivery habilitado: assume retirada
  if (!company.deliveryEnabled) {
    return createOrderAndPayment({
      prisma,
      company,
      customer,
      conversation,
      context: updatedContext,
      menuItem,
      size,
      deliveryAddress: null,
      phoneNumberId,
      orderSummary,
      amount,
      pickup: true,
    });
  }

  // Cliente recorrente com endereco salvo: vai direto pro pagamento
  if (isReturning && hasAddress) {
    return createOrderAndPayment({
      prisma,
      company,
      customer,
      conversation,
      context: updatedContext,
      menuItem,
      size,
      deliveryAddress: customer.defaultDeliveryAddress,
      phoneNumberId,
      orderSummary,
      amount,
      pickup: false,
    });
  }

  // Cliente novo ou sem endereco: perguntar entrega ou retirada
  const nextContext = {
    ...updatedContext,
    awaitingDeliveryMethod: true,
    pendingOrder: {
      size,
      menuItemId: menuItem.id,
      menuItemName: menuItem.name,
      amount,
    },
  };

  await sendText({
    to: customer.phone,
    phoneNumberId,
    text: `Perfeito, ${orderSummary}.\nVoce quer RETIRAR aqui ou que a gente ENTREGUE?`,
  });

  await updateConversation(prisma, conversation.id, {
    currentState: STATES.CONFIRMING_ORDER,
    context: nextContext,
  });

  return conversation;
}

async function handleDeliveryChoice({
  prisma,
  company,
  customer,
  conversation,
  context,
  messageText,
  phoneNumberId,
}) {
  const text = (messageText || '').toLowerCase();
  const pending = context.pendingOrder;
  if (!pending) {
    await sendText({
      to: customer.phone,
      phoneNumberId,
      text: 'Vamos recomecar o pedido? Me fala o tamanho (P, M ou G) e o prato.',
    });
    await updateConversation(prisma, conversation.id, {
      currentState: STATES.BUILDING_ORDER,
      context: { slots: {} },
    });
    return conversation;
  }

  const menuItem = await prisma.menuItem.findUnique({
    where: { id: pending.menuItemId },
  });

  // Cliente escolheu entrega
  if (text.includes('entreg')) {
    const nextContext = {
      ...context,
      awaitingDeliveryMethod: false,
      awaitingAddress: true,
    };

    await sendText({
      to: customer.phone,
      phoneNumberId,
      text: 'Beleza, me manda o endereco completinho para entrega, por favor.',
    });

    await updateConversation(prisma, conversation.id, {
      currentState: STATES.CONFIRMING_ORDER,
      context: nextContext,
    });
    return conversation;
  }

  // Cliente escolheu retirada
  if (text.includes('retira') || text.includes('pegar')) {
    return createOrderAndPayment({
      prisma,
      company,
      customer,
      conversation,
      context: {
        ...context,
        awaitingDeliveryMethod: false,
        awaitingAddress: false,
      },
      menuItem,
      size: pending.size,
      deliveryAddress: null,
      phoneNumberId,
      orderSummary: `1 marmita ${pending.size} de ${pending.menuItemName}`,
      amount: pending.amount,
      pickup: true,
    });
  }

  await sendText({
    to: customer.phone,
    phoneNumberId,
    text: 'Pode me dizer se prefere RETIRAR ou que a gente ENTREGUE?',
  });
  return conversation;
}

async function handleAddressCollection({
  prisma,
  company,
  customer,
  conversation,
  context,
  messageText,
  phoneNumberId,
}) {
  const pending = context.pendingOrder;
  if (!pending) {
    await sendText({
      to: customer.phone,
      phoneNumberId,
      text: 'Nao encontrei o pedido em andamento. Vamos recomecar? Me diga o tamanho e o prato.',
    });
    await updateConversation(prisma, conversation.id, {
      currentState: STATES.BUILDING_ORDER,
      context: { slots: {} },
    });
    return conversation;
  }

  const address = messageText && messageText.trim();
  if (!address) {
    await sendText({
      to: customer.phone,
      phoneNumberId,
      text: 'Nao consegui ler o endereco. Pode mandar novamente, por favor?',
    });
    return conversation;
  }

  await prisma.customer.update({
    where: { id: customer.id },
    data: { defaultDeliveryAddress: address },
  });

  const menuItem = await prisma.menuItem.findUnique({
    where: { id: pending.menuItemId },
  });

  const nextContext = {
    ...context,
    awaitingAddress: false,
    awaitingDeliveryMethod: false,
  };

  return createOrderAndPayment({
    prisma,
    company,
    customer,
    conversation,
    context: nextContext,
    menuItem,
    size: pending.size,
    deliveryAddress: address,
    phoneNumberId,
    orderSummary: `1 marmita ${pending.size} de ${pending.menuItemName}`,
    amount: pending.amount,
    pickup: false,
  });
}

async function createOrderAndPayment({
  prisma,
  company,
  customer,
  conversation,
  context,
  menuItem,
  size,
  deliveryAddress,
  phoneNumberId,
  orderSummary,
  amount,
  pickup,
}) {
  const order = await prisma.order.create({
    data: {
      companyId: company.id,
      customerId: customer.id,
      status: 'PENDING_PAYMENT',
      deliveryAddress: deliveryAddress || null,
      totalAmount: amount,
      items: {
        create: {
          menuItemId: menuItem.id,
          name: menuItem.name,
          unitPrice: menuItem.price,
          quantity: 1,
        },
      },
    },
    include: { items: true },
  });

  const { pixCode } = await PaymentService.createPixCharge(order);
  const priceText = formatCurrency(amount);
  const deliveryText = pickup
    ? 'Vai retirar aqui na loja.'
    : deliveryAddress
      ? 'Vou entregar no endereco informado.'
      : 'Vou entregar no mesmo endereco de sempre.';

  await sendText({
    to: customer.phone,
    phoneNumberId,
    text:
      `Fechado, ${orderSummary}.\n` +
      `O total e ${priceText}.\n\n` +
      `${deliveryText}\n` +
      'Aqui esta o Pix para pagamento (fake):\n' +
      pixCode +
      '\n\nAssim que o pagamento for confirmado, ja colocamos seu pedido em preparo.',
  });

  await updateConversation(prisma, conversation.id, {
    currentState: STATES.WAITING_PAYMENT,
    context: {
      ...context,
      lastOrderId: order.id,
    },
  });

  return conversation;
}

async function fetchActiveMenu(prisma, companyId) {
  return prisma.menu.findFirst({
    where: { companyId, isActive: true },
    include: {
      items: {
        where: { isActive: true },
        orderBy: { position: 'asc' },
      },
    },
  });
}

async function sendMenu(menu, to, phoneNumberId) {
  if (menu.imageUrl && WhatsappService.sendImageMessage) {
    await WhatsappService.sendImageMessage({
      to,
      imageUrl: menu.imageUrl,
      caption: menu.description || 'Cardapio do dia',
      phoneNumberId,
    });
  } else {
    await sendText({
      to,
      phoneNumberId,
      text: menu.items.length
        ? formatMenuList(menu.items)
        : 'Cardapio ativo, mas sem itens cadastrados.',
    });
  }
}

function formatMenuList(items) {
  return items
    .map((item, idx) => `${idx + 1}) ${item.name} - R$ ${formatNumber(item.price)}`)
    .join('\n');
}

function formatCurrency(amount) {
  return `R$ ${formatNumber(amount)}`;
}

function formatNumber(amount) {
  return Number(amount || 0).toFixed(2).replace('.', ',');
}

function findMenuItemByName(name, items) {
  if (!name) return null;
  const lower = name.toLowerCase();
  return items.find((item) => item.name.toLowerCase().includes(lower)) || null;
}

function pickByNumber(text, items) {
  const match = (text || '').match(/\b(\d+)\b/);
  if (!match) return null;
  const idx = Number(match[1]) - 1;
  return items[idx] || null;
}

function normalizeContext(raw) {
  return {
    slots: {},
    awaitingDeliveryMethod: false,
    awaitingAddress: false,
    ...raw,
    slots: {
      ...(raw && raw.slots ? raw.slots : {}),
    },
  };
}

async function updateConversation(prisma, conversationId, data) {
  return prisma.conversation.update({
    where: { id: conversationId },
    data: {
      ...data,
      lastMessageAt: new Date(),
    },
  });
}

async function sendText({ to, text, phoneNumberId }) {
  if (WhatsappService && typeof WhatsappService.sendTextMessage === 'function') {
    await WhatsappService.sendTextMessage({ to, text, phoneNumberId });
  } else {
    console.log('[WhatsApp] Enviar texto:', { to, text });
  }
}

module.exports = DialogService;
