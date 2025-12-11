const express = require('express');

const app = express();

// Middleware para JSON
app.use(express.json());

// Rotas (substituir placeholders quando os módulos forem criados)
const whatsappRoutes = require('./routes/whatsapp');
const paymentRoutes = express.Router(); // TODO: implementar rotas de pagamentos
const adminRoutes = express.Router(); // TODO: implementar rotas de administração

app.use('/webhook/whatsapp', whatsappRoutes);
app.use('/webhook/mercadopago', paymentRoutes);
app.use('/admin', adminRoutes);

module.exports = app;
