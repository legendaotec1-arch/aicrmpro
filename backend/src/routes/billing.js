const express = require('express');
const {
  isBillingEnabled,
  getBillingConfig
} = require('../utils/billing');
const { isYookassaConfigured, fetchPayment } = require('../utils/yookassa');

const router = express.Router();

router.get('/config', (req, res) => {
  res.json({
    ...getBillingConfig(),
    yookassaConfigured: isYookassaConfigured()
  });
});

router.post('/yookassa/webhook', async (req, res) => {
  try {
    if (!isBillingEnabled() || !isYookassaConfigured()) {
      return res.json({ ok: true });
    }

    const db = require('../config/database');
    const { applyTopup, applyUnlimitedPurchase } = require('../utils/billing');

    const event = req.body?.event;
    const payment = req.body?.object;

    if (event !== 'payment.succeeded' || !payment?.id) {
      return res.json({ ok: true });
    }

    const verified = await fetchPayment(payment.id).catch((err) => {
      console.warn('YooKassa webhook: fetch payment failed', payment.id, err.response?.data || err.message);
      return null;
    });
    if (!verified) {
      return res.json({ ok: true });
    }
    if (verified.status !== 'succeeded') {
      console.warn('YooKassa webhook: payment not succeeded in API', payment.id, verified.status);
      return res.json({ ok: true });
    }

    const metadata = verified.metadata || {};
    const masterId = metadata.master_id;
    const purpose = metadata.purpose;
    const amount = Number(verified.amount?.value || 0);

    if (!masterId || !purpose || amount <= 0) {
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
    res.json({ ok: true });
  }
});

module.exports = router;
