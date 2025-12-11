const express = require('express');
const PaymentWebhookController = require('../controllers/PaymentWebhookController');

const router = express.Router();

router.post('/', PaymentWebhookController.handleWebhook);

module.exports = router;
