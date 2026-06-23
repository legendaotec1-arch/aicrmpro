const fs = require('fs');
const path = require('path');
const { uploadsDir } = require('../config/paths');

const TASK_STATUSES = ['todo', 'in_progress', 'review', 'done'];

const adminWorkspaceDir = path.join(uploadsDir, 'admin-workspace');

function ensureAdminWorkspaceDir() {
  if (!fs.existsSync(adminWorkspaceDir)) {
    fs.mkdirSync(adminWorkspaceDir, { recursive: true });
  }
  return adminWorkspaceDir;
}

function listAdminAccounts() {
  const accounts = [];
  const ownerEmail = (process.env.SITE_OWNER_EMAIL || '').trim().toLowerCase();
  const ownerName = (process.env.SITE_OWNER_NAME || 'Владелец').trim();
  const ownerPassword = process.env.SITE_OWNER_PASSWORD || '';
  if (ownerEmail && ownerPassword.length >= 8) {
    accounts.push({ email: ownerEmail, name: ownerName });
  }

  const partnerEmail = (process.env.SITE_PARTNER_EMAIL || '').trim().toLowerCase();
  const partnerName = (process.env.SITE_PARTNER_NAME || 'Партнёр').trim();
  const partnerPassword = process.env.SITE_PARTNER_PASSWORD || '';
  if (partnerEmail && partnerPassword.length >= 8) {
    accounts.push({ email: partnerEmail, name: partnerName });
  }

  return accounts;
}

function displayNameForEmail(email) {
  const found = listAdminAccounts().find((a) => a.email === String(email || '').trim().toLowerCase());
  if (found) return found.name;
  const local = String(email || '').split('@')[0];
  return local || email || '—';
}

const IMAGE_EXT = new Set(['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.bmp', '.avif']);
const VIDEO_EXT = new Set(['.mp4', '.webm', '.mov', '.mkv', '.m4v', '.ogv']);

function getPreviewKind(mimeType, fileName) {
  const mime = String(mimeType || '').toLowerCase();
  if (mime.startsWith('image/')) return 'image';
  if (mime.startsWith('video/')) return 'video';
  const ext = path.extname(String(fileName || '')).toLowerCase();
  if (IMAGE_EXT.has(ext)) return 'image';
  if (VIDEO_EXT.has(ext)) return 'video';
  return 'file';
}

function sanitizeFileName(name) {
  const cleaned = String(name || '')
    .trim()
    .replace(/[\\/:*?"<>|]/g, '')
    .replace(/\s+/g, ' ');
  return cleaned || null;
}

const AD_STATUSES = ['new', 'contacted', 'negotiating', 'agreed', 'paid', 'rejected', 'done'];
const AD_PLATFORMS = ['telegram', 'instagram', 'youtube', 'vk', 'tiktok', 'blog', 'other'];
const AD_PRIORITIES = ['low', 'normal', 'high'];

function mapTaskRow(row) {
  return {
    ...row,
    assignee_name: row.assignee_email ? displayNameForEmail(row.assignee_email) : null,
    created_by_name: displayNameForEmail(row.created_by),
    comment_count: Number(row.comment_count ?? 0),
    attachment_count: Number(row.attachment_count ?? 0),
  };
}

function mapTaskCommentRow(row) {
  return {
    ...row,
    author_name: displayNameForEmail(row.created_by),
  };
}

function mapTaskAttachmentRow(row) {
  return {
    id: row.id,
    task_id: row.task_id,
    file_id: row.file_id,
    attached_by: row.attached_by,
    attached_by_name: displayNameForEmail(row.attached_by),
    created_at: row.created_at,
    original_name: row.original_name,
    mime_type: row.mime_type,
    size_bytes: Number(row.size_bytes),
    preview_kind: getPreviewKind(row.mime_type, row.original_name),
  };
}

function mapAdLeadRow(row) {
  return {
    ...row,
    quoted_price: row.quoted_price != null ? Number(row.quoted_price) : null,
    allocated_budget: Number(row.allocated_budget ?? 0),
    audience_size: row.audience_size != null ? Number(row.audience_size) : null,
    created_by_name: displayNameForEmail(row.created_by),
    updated_by_name: row.updated_by ? displayNameForEmail(row.updated_by) : null,
  };
}

async function getFinanceBalance(db) {
  const earned = await db.query(
    `SELECT COALESCE(SUM(amount), 0)::numeric AS s FROM billing_payments WHERE status = 'succeeded'`
  );
  const withdrawn = await db.query(
    `SELECT COALESCE(SUM(amount), 0)::numeric AS s FROM admin_withdrawals`
  );
  return Number(earned.rows[0].s) - Number(withdrawn.rows[0].s);
}

module.exports = {
  TASK_STATUSES,
  adminWorkspaceDir,
  ensureAdminWorkspaceDir,
  listAdminAccounts,
  displayNameForEmail,
  getPreviewKind,
  sanitizeFileName,
  AD_STATUSES,
  AD_PLATFORMS,
  AD_PRIORITIES,
  mapAdLeadRow,
  getFinanceBalance,
  mapTaskRow,
  mapTaskCommentRow,
  mapTaskAttachmentRow,
};
