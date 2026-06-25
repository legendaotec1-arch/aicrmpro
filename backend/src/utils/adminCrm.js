const fs = require('fs');
const path = require('path');
const db = require('../config/database');
const {
  STATIC_SHEETS,
  SCRIPTS,
  ANSWERS,
  SEARCH,
  ANALYTICS,
  FOLLOWUP_EXAMPLES,
} = require('./adminCrmSeed');

let schemaReady = false;

async function ensureCrmSchema() {
  if (schemaReady) return;
  const sqlPath = path.join(__dirname, '../db/migrations/045_admin_crm_workspace.sql');
  const sql = fs.readFileSync(sqlPath, 'utf8');
  await db.query(sql);
  schemaReady = true;
}

async function seedCrmIfEmpty() {
  const [{ count: analyticsCount }] = (await db.query('SELECT COUNT(*)::int AS count FROM admin_crm_analytics')).rows;
  if (analyticsCount === 0) {
    for (let i = 0; i < ANALYTICS.length; i += 1) {
      const row = ANALYTICS[i];
      await db.query(
        `INSERT INTO admin_crm_analytics (metric_key, label, goal_value, sort_order)
         VALUES ($1, $2, $3, $4) ON CONFLICT (metric_key) DO NOTHING`,
        [row.metric_key, row.label, row.goal_value || '', i]
      );
    }
  }

  for (const [key, content] of Object.entries(STATIC_SHEETS)) {
    await db.query(
      `INSERT INTO admin_crm_static (sheet_key, content) VALUES ($1, $2)
       ON CONFLICT (sheet_key) DO NOTHING`,
      [key, content]
    );
  }

  const refCounts = await db.query(
    `SELECT sheet_key, COUNT(*)::int AS c FROM admin_crm_ref_rows GROUP BY sheet_key`
  );
  const refMap = Object.fromEntries(refCounts.rows.map((r) => [r.sheet_key, r.c]));

  if (!refMap.scripts) {
    for (let i = 0; i < SCRIPTS.length; i += 1) {
      await db.query(
        `INSERT INTO admin_crm_ref_rows (sheet_key, cols, sort_order) VALUES ('scripts', $1::jsonb, $2)`,
        [JSON.stringify(SCRIPTS[i]), i]
      );
    }
  }
  if (!refMap.answers) {
    for (let i = 0; i < ANSWERS.length; i += 1) {
      await db.query(
        `INSERT INTO admin_crm_ref_rows (sheet_key, cols, sort_order) VALUES ('answers', $1::jsonb, $2)`,
        [JSON.stringify(ANSWERS[i]), i]
      );
    }
  }
  if (!refMap.search) {
    for (let i = 0; i < SEARCH.length; i += 1) {
      await db.query(
        `INSERT INTO admin_crm_ref_rows (sheet_key, cols, sort_order) VALUES ('search', $1::jsonb, $2)`,
        [JSON.stringify(SEARCH[i]), i]
      );
    }
  }

  const [{ count: followupCount }] = (await db.query('SELECT COUNT(*)::int AS count FROM admin_crm_followups')).rows;
  if (followupCount === 0) {
    for (let i = 0; i < FOLLOWUP_EXAMPLES.length; i += 1) {
      const f = FOLLOWUP_EXAMPLES[i];
      await db.query(
        `INSERT INTO admin_crm_followups (contact, touch_date, touch_number, message_text, sent, sort_order)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [f.contact, f.touch_date, f.touch_number, f.message_text, f.sent, i]
      );
    }
  }
}

function mapLeadRow(r) {
  return {
    id: r.id,
    lead_date: r.lead_date,
    lead_time: r.lead_time,
    platform: r.platform,
    contact: r.contact,
    name: r.name,
    city: r.city,
    niche: r.niche,
    status: r.status,
    script_variant: r.script_variant,
    message_text: r.message_text,
    sent_at: r.sent_at,
    reply_text: r.reply_text,
    replied_at: r.replied_at,
    demo: r.demo,
    demo_at: r.demo_at,
    registered: r.registered,
    registered_at: r.registered_at,
    bonus_60: r.bonus_60,
    tariff: r.tariff,
    amount_rub: r.amount_rub,
    next_action: r.next_action,
    next_action_date: r.next_action_date,
    note: r.note,
    sort_order: r.sort_order,
    updated_at: r.updated_at,
  };
}

function mapFollowupRow(r) {
  return {
    id: r.id,
    contact: r.contact,
    touch_date: r.touch_date,
    touch_number: r.touch_number,
    message_text: r.message_text,
    sent: r.sent,
    sort_order: r.sort_order,
  };
}

const LEAD_FIELDS = [
  'lead_date', 'lead_time', 'platform', 'contact', 'name', 'city', 'niche', 'status',
  'script_variant', 'message_text', 'sent_at', 'reply_text', 'replied_at', 'demo', 'demo_at',
  'registered', 'registered_at', 'bonus_60', 'tariff', 'amount_rub', 'next_action',
  'next_action_date', 'note', 'sort_order',
];

const CRM_STATUSES = [
  'Новый', 'Отправлено', 'Ответил', 'Демо', 'Регистрация', 'Клиент', 'Отказ', 'Дожим', 'Неактивен',
];

module.exports = {
  ensureCrmSchema,
  seedCrmIfEmpty,
  mapLeadRow,
  mapFollowupRow,
  LEAD_FIELDS,
  CRM_STATUSES,
};
