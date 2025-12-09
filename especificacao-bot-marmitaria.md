A partir de agora você é um desenvolvedor SÊNIOR Node.js especializado em APIs para WhatsApp e pagamentos Pix, e vai gerar CÓDIGO-FONTE completo, organizado, em JavaScript com Express e Prisma.

Quero que você implemente o BACKEND de um sistema de chatbot multi-empresas para WhatsApp, focado inicialmente em marmitarias, mas que possa atender outros pequenos negócios (salgados, pastelaria, etc.).

REGRAS GERAIS DO PROJETO
- Linguagem: JavaScript (Node.js)
- Framework HTTP: Express
- ORM: Prisma
- Banco em desenvolvimento: SQLite (facilitando testes locais)
- Integrações:
  - WhatsApp Cloud API (Meta)
  - Mercado Pago (Pix)
- Estilo de código:
  - Código limpo, organizado em camadas (routes, controllers, services, prisma)
  - Comentários explicando os pontos mais importantes
  - Usar async/await

NÃO escreva textos explicativos longos.  
Apenas:
1) Mostre a estrutura de pastas do projeto  
2) Mostre o conteúdo dos principais arquivos (em blocos de código separados)  

===================================================================
OBJETIVO DO SISTEMA
===================================================================
Criar um backend que:
- Recebe mensagens do WhatsApp via webhook
- Entende mensagens simples de pedido de marmita
- Monta o pedido com o mínimo de perguntas possível
- Gera cobrança via Pix (Mercado Pago)
- Envia o Pix para o cliente pelo WhatsApp
- Atualiza o pedido quando o pagamento for confirmado (webhook Mercado Pago)
- Suporta múltiplas empresas (multi-tenant)

===================================================================
ESTRUTURA DE PASTAS SUGERIDA
===================================================================
Crie uma estrutura parecida com:

/prisma
  schema.prisma
/src
  server.js
  app.js
  /config
    whatsappConfig.js
    mercadopagoConfig.js
  /routes
    whatsappRoutes.js
    paymentRoutes.js
    adminRoutes.js
  /controllers
    WhatsappWebhookController.js
    PaymentWebhookController.js
    AdminController.js
  /services
    WhatsappService.js
    DialogService.js
    MenuService.js
    OrderService.js
    PaymentService.js
  /repositories
    CompanyRepository.js
    CustomerRepository.js
    MenuRepository.js
    OrderRepository.js
    PaymentRepository.js
  /utils
    intentDetection.js
    textParsing.js
.env.example

Você pode ajustar pequenos detalhes dessa estrutura se achar necessário, mas mantenha a separação em camadas (routes, controllers, services, repositories).

===================================================================
MODELAGEM COM PRISMA
===================================================================
No arquivo prisma/schema.prisma, defina os modelos principais a seguir.

Use SQLite por padrão (para desenvolvimento):

datasource db {
  provider = "sqlite"
  url      = "file:./dev.db"
}

generator client {
  provider = "prisma-client-js"
}

MODELOS:

1) Company
- id           String  @id @default(uuid())
- name         String
- legalName    String?
- document     String?
- deliveryEnabled Boolean @default(true)
- createdAt    DateTime @default(now())
- updatedAt    DateTime @updatedAt
- whatsappNumbers WhatsappNumber[]
- customers    Customer[]
- menus        Menu[]
- orders       Order[]
- payments     Payment[]

2) WhatsappNumber
- id              String   @id @default(uuid())
- companyId       String
- company         Company  @relation(fields: [companyId], references: [id])
- phoneNumber     String   // número em formato internacional
- waPhoneNumberId String   // phone_number_id da Cloud API
- displayName     String?
- welcomeMessage  String?  // mensagem de boas-vindas personalizada
- createdAt       DateTime @default(now())
- updatedAt       DateTime @updatedAt

3) Customer
- id                     String   @id @default(uuid())
- companyId              String
- company                Company  @relation(fields: [companyId], references: [id])
- phone                  String
- name                   String?
- defaultDeliveryAddress String?  // endereço principal para entrega
- timesOrdered           Int      @default(0)
- lastOrderAt            DateTime?
- createdAt              DateTime @default(now())
- updatedAt              DateTime @updatedAt
- conversations          Conversation[]
- orders                 Order[]

@@unique([companyId, phone])

4) Menu
- id          String   @id @default(uuid())
- companyId   String
- company     Company  @relation(fields: [companyId], references: [id])
- title       String
- description String?
- imageUrl    String?
- isActive    Boolean  @default(true)
- createdAt   DateTime @default(now())
- updatedAt   DateTime @updatedAt
- items       MenuItem[]

5) MenuItem
- id          String   @id @default(uuid())
- menuId      String
- menu        Menu     @relation(fields: [menuId], references: [id])
- name        String
- description String?
- price       Float
- category    String?
- position    Int?
- isActive    Boolean  @default(true)
- createdAt   DateTime @default(now())
- updatedAt   DateTime @updatedAt

6) Conversation
- id             String   @id @default(uuid())
- companyId      String
- customerId     String
- company        Company  @relation(fields: [companyId], references: [id])
- customer       Customer @relation(fields: [customerId], references: [id])
- currentState   String   // ex: "IDLE", "BUILDING_ORDER", "WAITING_PAYMENT"
- context        Json?
- lastMessageAt  DateTime @default(now())
- createdAt      DateTime @default(now())
- updatedAt      DateTime @updatedAt

@@unique([companyId, customerId])

7) Order
- id          String   @id @default(uuid())
- companyId   String
- customerId  String
- company     Company  @relation(fields: [companyId], references: [id])
- customer    Customer @relation(fields: [customerId], references: [id])
- status      String   // "DRAFT", "PENDING_PAYMENT", "PAID", "IN_PREPARATION", "COMPLETED", "CANCELLED"
- totalAmount Float    @default(0)
- note        String?
- deliveryAddress String?
- createdAt   DateTime @default(now())
- updatedAt   DateTime @updatedAt
- items       OrderItem[]
- payments    Payment[]

8) OrderItem
- id          String   @id @default(uuid())
- orderId     String
- order       Order    @relation(fields: [orderId], references: [id])
- menuItemId  String?
- name        String   // nome do item no momento do pedido
- unitPrice   Float
- quantity    Int
- createdAt   DateTime @default(now())
- updatedAt   DateTime @updatedAt

9) Payment
- id                 String   @id @default(uuid())
- orderId            String
- companyId          String
- order              Order    @relation(fields: [orderId], references: [id])
- company            Company  @relation(fields: [companyId], references: [id])
- provider           String   // "MERCADOPAGO"
- providerPaymentId  String   // ID do pagamento no Mercado Pago
- status             String   // "PENDING", "APPROVED", "REJECTED", etc.
- amount             Float
- qrCode             String?
- qrCodeBase64       String?
- checkoutUrl        String?
- rawPayload         Json?
- createdAt          DateTime @default(now())
- updatedAt          DateTime @updatedAt

===================================================================
VARIÁVEIS DE AMBIENTE (.env.example)
===================================================================
Crie um arquivo .env.example com:

PORT=3000

DATABASE_URL="file:./dev.db"

WHATSAPP_API_BASE_URL="https://graph.facebook.com/v20.0"
WHATSAPP_ACCESS_TOKEN="SEU_TOKEN_DO_WHATSAPP"
WHATSAPP_VERIFY_TOKEN="SEU_VERIFY_TOKEN"

MERCADOPAGO_ACCESS_TOKEN="SEU_ACCESS_TOKEN_MERCADOPAGO"
MERCADOPAGO_WEBHOOK_SECRET="SEGREDO_OPCIONAL"

===================================================================
SERVER E APP (Express)
===================================================================
Implemente:

- src/server.js
  - Lê variáveis de ambiente
  - Importa app.js
  - Sobe o servidor na porta configurada

- src/app.js
  - Cria a instância do Express
  - Aplica middlewares (JSON, logs simples)
  - Registra as rotas:
    - /webhook/whatsapp
    - /webhook/mercadopago
    - /admin

===================================================================
ROTAS E CONTROLLERS
===================================================================
1) Rotas WhatsApp
Arquivo: src/routes/whatsappRoutes.js

- GET /webhook/whatsapp
  - Usado pela Meta para verificação do webhook
  - Lê query params "hub.mode", "hub.verify_token", "hub.challenge"
  - Se verify_token for igual ao WHATSAPP_VERIFY_TOKEN, devolve o "hub.challenge"

- POST /webhook/whatsapp
  - Recebe eventos de mensagens
  - Delega para WhatsappWebhookController.handleIncoming

Arquivo: src/controllers/WhatsappWebhookController.js

- handleVerification(req, res)
- handleIncoming(req, res)
  - Extrai phone_number_id (para descobrir a empresa)
  - Extrai número do cliente (from) e texto da mensagem
  - Usa repositórios para:
    - encontrar o WhatsappNumber pelo phone_number_id
    - encontrar ou criar Company, Customer, Conversation
  - Chama DialogService.handleIncomingMessage(company, customer, conversation, messageText)
  - Esse serviço decide o que fazer e retorna:
    - novo estado
    - ações de resposta (mensagens a enviar)
  - Usa WhatsappService para enviar as mensagens de volta pelo WhatsApp Cloud API

2) Rotas Mercado Pago
Arquivo: src/routes/paymentRoutes.js

- POST /webhook/mercadopago
  - Recebe notificações de pagamento
  - Delega para PaymentWebhookController.handleWebhook

Arquivo: src/controllers/PaymentWebhookController.js

- handleWebhook(req, res)
  - Valida a origem (MERCADOPAGO_WEBHOOK_SECRET, se estiver usando)
  - Lê o id do pagamento
  - Chama PaymentService.processWebhookEvent(eventData)

3) Rotas Admin (MVP simples)
Arquivo: src/routes/adminRoutes.js

- POST /admin/companies
- POST /admin/companies/:companyId/menus
- POST /admin/menus/:menuId/items

Arquivo: src/controllers/AdminController.js
- Métodos simples que usam repositórios Prisma para criar empresas, menus e itens.

===================================================================
SERVIÇOS PRINCIPAIS
===================================================================
1) WhatsappService (src/services/WhatsappService.js)
- Responsável por enviar mensagens para o WhatsApp Cloud API.
- Funções:
  - sendTextMessage({ to, text, phoneNumberId })
  - sendImageMessage({ to, imageUrl, caption, phoneNumberId })

2) DialogService (src/services/DialogService.js)
- Coração da lógica de conversa.
- Função principal:
  - handleIncomingMessage({ company, customer, conversation, messageText })

REGRAS DO DIALOGSERVICE:

- Usar uma pequena detecção de intenção baseada em palavras-chave (implementar helpers em utils/intentDetection.js):
  - Se a mensagem tiver "cardápio", "menu" → intenção = VER_CARDAPIO
  - Se tiver "marmita", "quero uma", "quero pedir" → intenção = FAZER_PEDIDO
  - Se for apenas "oi", "bom dia", "boa tarde", "boa noite" → intenção = SAUDACAO
  - Caso não se encaixe: intenção = CONVERSA_GERAL

- Estado da conversa:
  - conversation.currentState pode ser:
    - "NEW_CONTACT"
    - "IDLE"
    - "BROWSING_MENU"
    - "BUILDING_ORDER"
    - "CONFIRMING_ORDER"
    - "WAITING_PAYMENT"
    - "PAID"

- Preenchimento de “slots” para pedido de marmita:
  - Slots principais:
    - tamanho (P, M, G)
    - prato (nome ou número do prato)
  - Implementar um helper em utils/textParsing.js para:
    - extrair tamanho da frase ("P", "pequena", "marmita P", etc.)
    - extrair possível nome do prato, batendo com MenuItem.name

FLUXOS QUE DEVEM SER IMPLEMENTADOS:

A) CLIENTE NOVO (sem endereço salvo) – EXEMPLO:
Cliente: "Bom dia, quero uma marmita P (pequena)."
Bot:
  - Detecta intenção FAZER_PEDIDO.
  - Extrai tamanho = "P".
  - Falta o prato.
Resposta:
  "Bom dia! 🙌
   Para a marmita P de hoje temos:
   1️⃣ Feijão de calda com bife acebolado
   2️⃣ Feijoada completa

   Me diga só o número ou o nome do prato que você quer."

Cliente: "Feijoada."
Bot:
  - Agora já tem tamanho = P e prato = "Feijoada"
  - Como é cliente novo, perguntar se é ENTREGA ou RETIRADA:
    "Perfeito, 1 marmita P de Feijoada.
     Você quer RETIRAR aqui ou que a gente ENTREGUE?"

Se cliente responder "entregar":
  Bot:
    - pede endereço COMPLETO (uma única vez):
      "Beleza, me manda o endereço completinho pra entrega, por favor."

Cliente envia o endereço:
  - Salvar em customer.defaultDeliveryAddress
  - Criar Order + OrderItems (status "PENDING_PAYMENT")
  - Criar Payment via Mercado Pago (PaymentService.createPixCharge(order))
  - Enviar Pix:
    "Fechado! O total é R$ XX,XX.
     Aqui está o Pix para pagamento:
     [QR code ou código copia e cola]

     Assim que o pagamento for confirmado, já colocamos seu pedido em preparo. ✅"
  - Atualizar Conversation.state = "WAITING_PAYMENT"

B) CLIENTE RECORRENTE (já pediu antes e tem endereço salvo) – OPÇÃO A (fluxo 100% direto)

Regra:
- Se customer.timesOrdered >= 1 E customer.defaultDeliveryAddress != null
- E a empresa tiver deliveryEnabled = true
→ NÃO perguntar endereço novamente, assumir entrega no mesmo lugar de sempre.

Exemplo:

Cliente: "Bom dia, quero uma marmita P (pequena)."
Bot:
  - Detecta FAZER_PEDIDO.
  - Extrai tamanho = "P".
  - Falta prato.
  - Mostra opções:
    "Bom dia! 🙌
     Para a marmita P de hoje temos:
     1️⃣ Feijão de calda
     2️⃣ Feijoada

     Me fala o número ou o nome do prato que você quer."

Cliente: "Feijoada."
Bot:
  - Tamanho = P, prato = "Feijoada".
  - Cliente é recorrente (timesOrdered >= 1) e tem defaultDeliveryAddress.
  - NÃO pergunta endereço, nem pergunta se é retirada:
    - Assume entrega no mesmo endereço de sempre.
  - Cria Order (deliveryAddress = customer.defaultDeliveryAddress).
  - Cria Payment (Pix Mercado Pago).
  - Responde:
    "Fechado, 1 marmita P de Feijoada.
     O total é R$ XX,XX.

     Vou entregar no mesmo endereço de sempre, tudo bem?
     Aqui está o Pix:
     [QR / código]

     Assim que o pagamento for confirmado, já colocamos seu pedido em preparo. ✅"

(Se quiser, você pode colocar a frase "no mesmo endereço de sempre" já assumindo isso, sem pedir confirmação.)

C) Cliente já manda tudo de uma vez:
Cliente: "Bom dia, quero uma marmita P de feijoada."

Bot:
  - Extrai tamanho = P
  - Extrai prato = Feijoada
  - Se for recorrente com endereço salvo: pular endereço e ir direto para o Pix.
  - Se for novo: perguntar entrega/retirada e endereço, conforme fluxo A.

===================================================================
PAYMENT SERVICE (Mercado Pago)
===================================================================
Arquivo: src/services/PaymentService.js

- Funções:
  - createPixCharge(order)
    - Usa MERCADOPAGO_ACCESS_TOKEN
    - Cria cobrança Pix ou preferência de pagamento
    - Salva registro em Payment (status "PENDING")
    - Retorna os dados necessários para o DialogService enviar:
      - valor
      - qrCode ou checkoutUrl

Arquivo: src/controllers/PaymentWebhookController.js

- handleWebhook:
  - Recebe evento do Mercado Pago
  - Encontra Payment por providerPaymentId
  - Confirma status via API Mercado Pago (para evitar fraude)
  - Atualiza Payment.status e Order.status
    - Se aprovado:
      - Payment.status = "APPROVED"
      - Order.status = "PAID"
      - customer.timesOrdered += 1
      - customer.lastOrderAt = now()
  - Usa WhatsappService para enviar:
    "Pagamento confirmado! Seu pedido já está em preparo. ✅"

===================================================================
INTENT DETECTION E PARSING
===================================================================
Crie helpers simples:

utils/intentDetection.js:
- detectIntent(messageText) → "SAUDACAO", "VER_CARDAPIO", "FAZER_PEDIDO", "CONVERSA_GERAL"

utils/textParsing.js:
- extractSize(messageText) → "P", "M", "G" ou null
- extractDishName(messageText, menuItems) → nome aproximado do prato ou null

===================================================================
SAÍDA ESPERADA
===================================================================
Na sua resposta:
- MOSTRE a estrutura de pastas
- DEPOIS mostre o conteúdo dos principais arquivos (server.js, app.js, schema.prisma, controllers, services principais)
- Comente o suficiente para eu entender onde configurar tokens e endpoints.

NÃO escreva explicações longas em texto corrido.  
Foque em entregar código organizado, pronto para ser ajustado e rodado.
