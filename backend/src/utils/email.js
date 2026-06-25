const nodemailer = require('nodemailer');

const SERVICE_NAME = process.env.BILLING_FROM_NAME || 'Woner.ru';

function isPlaceholder(value) {
  if (value == null) return true;
  const v = String(value).trim();
  if (!v) return true;
  if (v === '...') return true;
  return /^(your_|ваш_|change_|замените|example)/i.test(v);
}

function isEmailConfigured() {
  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  return Boolean(host && user && pass && !isPlaceholder(user) && !isPlaceholder(pass));
}

function getTransporter() {
  if (!isEmailConfigured()) return null;

  const port = Number(process.env.SMTP_PORT) || 465;
  const secure = process.env.SMTP_SECURE !== 'false' && port !== 587;

  return nodemailer.createTransport({
    host: process.env.SMTP_HOST.trim(),
    port,
    secure,
    auth: {
      user: process.env.SMTP_USER.trim(),
      pass: String(process.env.SMTP_PASS).trim()
    }
  });
}

async function sendMail({ to, subject, text, html }) {
  const from = (process.env.BILLING_FROM_EMAIL || process.env.SMTP_USER || '').trim();
  if (!from || !to) return false;

  if (!isEmailConfigured()) {
    console.log(`[email] SMTP не настроен — письмо не отправлено. To: ${to} | ${subject}`);
    return false;
  }

  const transporter = getTransporter();
  try {
    await transporter.sendMail({
      from: `"${SERVICE_NAME}" <${from}>`,
      to,
      subject,
      text,
      html
    });
    return true;
  } catch (err) {
    console.error('[email] Ошибка отправки:', err.message);
    if (String(err.message).includes('535') || String(err.message).includes('authentication failed')) {
      console.error(
        '[email] Проверьте SMTP_USER (полный email) и SMTP_PASS (пароль приложения Яндекса, не пароль от почты).'
      );
    }
    return false;
  }
}

async function sendBalanceAlertEmail({
  to,
  balance,
  level,
  warnThreshold,
  perBookingFee
}) {
  const balanceStr = `${Number(balance).toFixed(0)} ₽`;
  const dashboardUrl = `${(process.env.PUBLIC_URL || process.env.FRONTEND_URL || '').replace(/\/$/, '')}/dashboard?section=billing`;

  if (level === 'critical') {
    const subject = `${SERVICE_NAME}: срочно пополните баланс — клиенты не могут записаться`;
    const text = [
      'Здравствуйте!',
      '',
      `На вашем балансе ${SERVICE_NAME} осталось ${balanceStr}.`,
      `При балансе ниже ${perBookingFee} ₽ клиенты не могут забронировать дату и время онлайн.`,
      'Срочно пополните баланс, чтобы снова принимать записи.',
      '',
      `Пополнить баланс: ${dashboardUrl}`,
      '',
      `С уважением, команда ${SERVICE_NAME}`
    ].join('\n');
    return sendMail({ to, subject, text });
  }

  const subject = `${SERVICE_NAME}: пополните баланс (${balanceStr})`;
  const text = [
    'Здравствуйте!',
    '',
    `На балансе ${SERVICE_NAME} сейчас ${balanceStr} — меньше рекомендуемых ${warnThreshold} ₽.`,
    'Пополните баланс заранее, чтобы онлайн-запись не прерывалась.',
    `Списание: ${perBookingFee} ₽ за каждую запись.`,
    '',
    `Пополнить баланс: ${dashboardUrl}`,
    '',
    `С уважением, команда ${SERVICE_NAME}`
  ].join('\n');
  return sendMail({ to, subject, text });
}

module.exports = {
  isEmailConfigured,
  sendMail,
  sendBalanceAlertEmail
};
