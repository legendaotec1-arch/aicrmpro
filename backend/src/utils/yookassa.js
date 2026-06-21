const axios = require('axios');
const { v4: uuidv4 } = require('uuid');

const API_URL = 'https://api.yookassa.ru/v3';

function isYookassaConfigured() {
  return Boolean(process.env.YOOKASSA_SHOP_ID && process.env.YOOKASSA_SECRET_KEY);
}

function getReturnUrl() {
  const base = (process.env.PUBLIC_URL || process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\/$/, '');
  return process.env.YOOKASSA_RETURN_URL || `${base}/dashboard?section=billing`;
}

function formatAmount(value) {
  return Number(value).toFixed(2);
}

async function createPayment({ amount, description, metadata }) {
  if (!isYookassaConfigured()) {
    throw new Error('YooKassa не настроена');
  }

  const idempotenceKey = uuidv4();
  const res = await axios.post(
    `${API_URL}/payments`,
    {
      amount: { value: formatAmount(amount), currency: 'RUB' },
      capture: true,
      confirmation: { type: 'redirect', return_url: getReturnUrl() },
      description,
      metadata
    },
    {
      auth: {
        username: process.env.YOOKASSA_SHOP_ID,
        password: process.env.YOOKASSA_SECRET_KEY
      },
      headers: { 'Idempotence-Key': idempotenceKey },
      timeout: 20000
    }
  );

  return res.data;
}

module.exports = {
  isYookassaConfigured,
  getReturnUrl,
  createPayment
};
