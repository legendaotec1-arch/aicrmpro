const axios = require('axios');
const { v4: uuidv4 } = require('uuid');

const API_URL = 'https://api.yookassa.ru/v3';

function isYookassaConfigured() {
  return Boolean(process.env.YOOKASSA_SHOP_ID && process.env.YOOKASSA_SECRET_KEY);
}

function getAuth() {
  return {
    username: process.env.YOOKASSA_SHOP_ID,
    password: process.env.YOOKASSA_SECRET_KEY
  };
}

function getReturnUrl() {
  const base = (process.env.PUBLIC_URL || process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\/$/, '');
  return process.env.YOOKASSA_RETURN_URL || `${base}/dashboard?section=billing`;
}

function formatAmount(value) {
  return Number(value).toFixed(2);
}

function buildReceipt({ amount, description, customerEmail }) {
  const email = String(customerEmail || process.env.YOOKASSA_RECEIPT_EMAIL || '').trim();
  const receipt = {
    tax_system_code: Number(process.env.YOOKASSA_TAX_SYSTEM_CODE) || 2,
    items: [
      {
        description: String(description).slice(0, 128),
        quantity: '1.00',
        amount: { value: formatAmount(amount), currency: 'RUB' },
        vat_code: Number(process.env.YOOKASSA_VAT_CODE) || 1,
        payment_mode: 'full_payment',
        payment_subject: 'service',
        measure: 'piece'
      }
    ]
  };

  if (email) {
    receipt.customer = { email };
  }

  return receipt;
}

function formatPaymentFailureReason(reason) {
  const map = {
    insufficient_funds: 'Недостаточно средств на карте',
    general_decline: 'Банк отклонил платёж',
    expired_on_confirmation: 'Время на оплату истекло',
    expired_on_capture: 'Время на подтверждение платежа истекло',
    canceled_by_merchant: 'Платёж отменён',
    permission_revoked: 'Оплата отменена пользователем',
    fraud_suspected: 'Платёж отклонён по соображениям безопасности',
    '3d_secure_failed': 'Не пройдена 3-D Secure проверка',
    call_issuer: 'Обратитесь в банк, выпустивший карту',
    card_expired: 'Срок действия карты истёк',
    country_forbidden: 'Оплата картой из этой страны недоступна',
    identification_required: 'Требуется идентификация кошелька ЮMoney',
    invalid_card_number: 'Неверный номер карты',
    invalid_csc: 'Неверный код CVV/CVC',
    issuer_unavailable: 'Банк-эмитент недоступен, попробуйте позже',
    payment_method_limit_exceeded: 'Превышен лимит по способу оплаты',
    payment_method_restricted: 'Способ оплаты недоступен',
    internal_timeout: 'Превышено время ожидания, попробуйте ещё раз',
    unsupported_mobile_operator: 'Оператор не поддерживается'
  };
  if (reason && map[reason]) return map[reason];
  if (reason) return `Оплата не прошла (${reason})`;
  return 'Оплата не прошла. Попробуйте ещё раз или выберите другой способ.';
}

function buildPaymentReturnMessage(record, status, payment = null) {
  const amount = Number(record.amount);
  const purpose = record.purpose;

  if (status === 'succeeded') {
    if (purpose === 'topup') {
      return {
        status: 'succeeded',
        purpose,
        amount,
        message: `Оплачено ${amount.toLocaleString('ru-RU')} ₽. Баланс пополнен.`
      };
    }
    return {
      status: 'succeeded',
      purpose,
      amount,
      message: `Тариф «Безлимит» за ${amount.toLocaleString('ru-RU')} ₽ подключён.`
    };
  }

  if (status === 'pending') {
    return { status: 'pending', purpose, amount };
  }

  const reason = payment?.cancellation_details?.reason;
  return {
    status: 'failed',
    purpose,
    amount,
    reason: reason || null,
    message: formatPaymentFailureReason(reason)
  };
}

async function createPayment({ amount, description, metadata, returnUrl, customerEmail }) {
  if (!isYookassaConfigured()) {
    throw new Error('YooKassa не настроена');
  }

  const idempotenceKey = uuidv4();
  const payload = {
    amount: { value: formatAmount(amount), currency: 'RUB' },
    capture: true,
    confirmation: { type: 'redirect', return_url: returnUrl || getReturnUrl() },
    description,
    metadata,
    receipt: buildReceipt({ amount, description, customerEmail })
  };

  const res = await axios.post(`${API_URL}/payments`, payload, {
    auth: getAuth(),
    headers: { 'Idempotence-Key': idempotenceKey },
    timeout: 20000
  });

  return res.data;
}

async function fetchPayment(paymentId) {
  if (!isYookassaConfigured()) {
    throw new Error('YooKassa не настроена');
  }
  const res = await axios.get(`${API_URL}/payments/${encodeURIComponent(paymentId)}`, {
    auth: getAuth(),
    timeout: 20000
  });
  return res.data;
}

module.exports = {
  isYookassaConfigured,
  getReturnUrl,
  formatPaymentFailureReason,
  buildPaymentReturnMessage,
  createPayment,
  fetchPayment
};
