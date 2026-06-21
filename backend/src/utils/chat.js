const { v4: uuidv4 } = require('uuid');
const db = require('../config/database');

async function getOrCreateConversation(salonId, clientId) {
  const existing = await db.query(
    'SELECT id FROM conversations WHERE salon_id = $1 AND client_id = $2',
    [salonId, clientId]
  );
  if (existing.rows.length > 0) return existing.rows[0].id;

  const id = uuidv4();
  await db.query(
    'INSERT INTO conversations (id, salon_id, client_id) VALUES ($1, $2, $3)',
    [id, salonId, clientId]
  );
  return id;
}

async function listMessages(conversationId, limit = 100) {
  const result = await db.query(
    `SELECT id, sender_type, body, read_at, created_at
     FROM messages WHERE conversation_id = $1
     ORDER BY created_at ASC LIMIT $2`,
    [conversationId, limit]
  );
  return result.rows;
}

async function addMessage(conversationId, senderType, body) {
  const id = uuidv4();
  await db.query(
    `INSERT INTO messages (id, conversation_id, sender_type, body) VALUES ($1, $2, $3, $4)`,
    [id, conversationId, senderType, body]
  );
  await db.query(
    'UPDATE conversations SET last_message_at = NOW() WHERE id = $1',
    [conversationId]
  );
  return id;
}

async function markClientMessagesRead(conversationId) {
  await db.query(
    `UPDATE messages SET read_at = NOW()
     WHERE conversation_id = $1 AND sender_type = 'client' AND read_at IS NULL`,
    [conversationId]
  );
}

module.exports = {
  getOrCreateConversation,
  listMessages,
  addMessage,
  markClientMessagesRead
};
