const express = require('express');
const cors = require('cors');
const axios = require('axios');
const crypto = require('crypto');

const app = express();
app.use(cors());
app.use(express.json());

const MAX_API_URL = process.env.MAX_API_URL || 'https://platform-api.max.ru';
const BOT_TOKEN = process.env.MAX_BOT_TOKEN || process.env.BOT_TOKEN;
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3000';

const api = axios.create({
  baseURL: MAX_API_URL,
  headers: {
    'Authorization': BOT_TOKEN
  }
});

// Утилита для отправки сообщений через MAX API
async function sendMaxMessage(chatId, text, keyboard = null) {
  try {
    const payload = {
      chat_id: chatId,
      text: text
    };

    if (keyboard) {
      payload.reply_markup = keyboard;
    }

    await api.post('/messages/send', payload);
    return true;
  } catch (error) {
    console.error('Error sending message:', error.response?.data || error.message);
    return false;
  }
}

// Генерация ссылки для мастера
function generateMasterLink(masterId) {
  const encoded = Buffer.from(masterId).toString('base64');
  return `https://aicrmpro.ru/m/${encoded}`;
}

// Обработчик webhook от MAX
app.post('/webhook', async (req, res) => {
  try {
    console.log('Webhook received:', JSON.stringify(req.body));

    const { update_type, chat_id, user, payload, message, callback_query } = req.body;

    // Обработка bot_started (пользователь нажал Start в MAX)
    if (update_type === 'bot_started') {
      const chatId = chat_id;
      const userName = user?.name || 'друг';

      const welcomeText = `👋 Привет, ${userName}!\n\nЯ помогу тебе записаться к мастеру. Просто нажми кнопку ниже 👇`;

      const keyboard = {
        inline: true,
        buttons: [[{
          text: '📋 Открыть запись',
          url: `https://aicrmpro.ru`
        }]]
      };

      await sendMaxMessage(chatId, welcomeText, keyboard);
      res.json({ ok: true });
      return;
    }

    // Обработка callback query (нажатия на инлайн-кнопки)
    if (callback_query) {
      await handleCallbackQuery(callback_query);
    }

    // Обработка текстовых сообщений
    if (message) {
      await handleMessage(message);
    }

    res.json({ ok: true });
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Обработка входящих сообщений
async function handleMessage(message) {
  // MAX API format - try different field names
  const chatId = message.chat?.id || message.fromChatId || message.chatId;
  const userId = message.from?.id?.toString() || message.userId?.toString() || chatId?.toString();
  const text = message.text;

  if (!chatId) {
    console.error('No chatId in message:', JSON.stringify(message));
    return;
  }

  // Команда /start
  if (text && text.startsWith('/start')) {
    const args = text.split(' ');
    
    if (args[1] && args[1].startsWith('ref_')) {
      // Пользователь перешел по ссылке мастера
      const masterId = Buffer.from(args[1].replace('ref_', ''), 'base64').toString();
      
      const welcomeText = `👋 Добро пожаловать!\n\nЯ помогу вам записаться к мастеру. Нажмите на кнопку ниже, чтобы открыть страницу мастера.`;

      const keyboard = {
        inline: true,
        buttons: [[{
          text: '📋 Открыть страницу мастера',
          url: `https://aicrmpro.ru/m/${masterId}`
        }]]
      };

      await sendMaxMessage(chatId, welcomeText, keyboard);
    } else {
      // Обычный старт
      const welcomeText = `👋 Добро пожаловать в CRM MAX!\n\nЧтобы записаться к мастеру, перейдите по ссылке, которую вам дал мастер.\n\nЕсли вы мастер и хотите создать свою страницу записи, нажмите /register`;
      await sendMaxMessage(chatId, welcomeText);
    }
    return;
  }

  // Команда /help
  if (text === '/help') {
    const helpText = `📚 Доступные команды:\n\n/start - Начать работу\n/help - Показать эту справку\n/my - Показать ваши записи\n/cancel - Отменить запись`;
    await sendMaxMessage(chatId, helpText);
    return;
  }

  // Команда /my - показать свои записи
  if (text === '/my') {
    try {
      const response = await axios.get(`${BACKEND_URL}/api/client/my/${userId}`);
      const appointments = response.data;

      if (appointments.length === 0) {
        await sendMaxMessage(chatId, '📅 У вас пока нет записей');
        return;
      }

      let messageText = '📅 Ваши записи:\n\n';
      
      for (const apt of appointments) {
        const date = new Date(apt.appointment_time).toLocaleDateString('ru-RU', {
          day: 'numeric',
          month: 'long',
          hour: '2-digit',
          minute: '2-digit'
        });
        
        messageText += `━━━━━━━━━━━━━━━━━━━━\n`;
        messageText += `💅 ${apt.service_name}\n`;
        messageText += `📆 ${date}\n`;
        messageText += `📍 ${apt.address || 'Адрес не указан'}\n`;
        messageText += `🔗 Мастер: ${apt.master_name}\n\n`;
        
        // Добавляем кнопку отмены
        messageText += `❌ Отменить: /cancel_${apt.id}\n`;
        messageText += `━━━━━━━━━━━━━━━━━━━━\n\n`;
      }

      await sendMaxMessage(chatId, messageText);
    } catch (error) {
      console.error('Error fetching appointments:', error);
      await sendMaxMessage(chatId, 'Произошла ошибка при получении записей');
    }
    return;
  }

  // Команда /cancel_<appointment_id>
  if (text && text.startsWith('/cancel_')) {
    const appointmentId = text.split('_')[1];
    
    try {
      await axios.post(`${BACKEND_URL}/api/client/cancel/${appointmentId}`, { maxUserId: userId });
      await sendMaxMessage(chatId, '✅ Ваша запись отменена');
    } catch (error) {
      console.error('Error cancelling appointment:', error);
      await sendMaxMessage(chatId, '❌ Не удалось отменить запись. Возможно, она уже отменена.');
    }
    return;
  }

  // Неизвестная команда
  const unknownText = `Извините, я не понимаю эту команду. Нажмите /help для списка доступных команд.`;
  await sendMaxMessage(chatId, unknownText);
}

// Обработка callback query (inline кнопки)
async function handleCallbackQuery(callbackQuery) {
  const { id, data, from } = callbackQuery;
  const chatId = from.id;
  const userId = from.id.toString();

  // Отвечаем на callback чтобы убрать "часики"
  await api.post('/callbacks/answer', {
    callback_query_id: id
  });

  // Обработка отмены записи
  if (data.startsWith('cancel_')) {
    const appointmentId = data.split('_')[1];
    
    try {
      await axios.post(`${BACKEND_URL}/api/client/cancel/${appointmentId}`, { maxUserId: userId });
      await sendMaxMessage(chatId, '✅ Запись отменена');
    } catch (error) {
      await sendMaxMessage(chatId, '❌ Не удалось отменить запись');
    }
  }
}

// Webhook для уведомлений (вызывается с бэкенда)
app.post('/notify', async (req, res) => {
  try {
    const { maxUserId, message } = req.body;
    
    if (!maxUserId || !message) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    await sendMaxMessage(maxUserId, message);
    res.json({ success: true });
  } catch (error) {
    console.error('Error sending notification:', error);
    res.status(500).json({ error: 'Failed to send notification' });
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`MAX Bot запущен на порту ${PORT}`);
});

module.exports = app;