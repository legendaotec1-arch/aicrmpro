const express = require('express');
const {
  isBillingEnabled,
  getBillingConfig
} = require('../utils/billing');
const { isYookassaConfigured } = require('../utils/yookassa');

const router = express.Router();

router.get('/config', (req, res) => {
  res.json({
    ...getBillingConfig(),
    yookassaConfigured: isYookassaConfigured()
  });
});

router.post('/yookassa/webhook', async (req, res) => {
  try {
    const db = require('../config/database');
    const { applyTopup, applyUnlimitedPurchase } = require('../utils/billing');

    const event = req.body?.event;
    const payment = req.body?.object;

    if (event !== 'payment.succeeded' || !payment?.id) {
      return res.json({ ok: true });
    }

    const metadata = payment.metadata || {};
    const masterId = metadata.master_id;
    const purpose = metadata.purpose;
    const amount = Number(payment.amount?.value || 0);

    if (!masterId || !purpose) {
      console.warn('YooKassa webhook: missing metadata', payment.id);
      return res.json({ ok: true });
    }

    if (purpose === 'topup') {
      await applyTopup(masterId, amount, payment.id);
    } else if (purpose === 'unlimited') {
      await applyUnlimitedPurchase(masterId, payment.id);
    }

    res.json({ ok: true });
  } catch (error) {
    console.error('YooKassa webhook error:', error);
    res.status(500).json({ error: 'Webhook error' });
  }
});

module.exports = router;
