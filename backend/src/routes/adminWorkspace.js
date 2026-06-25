const express = require('express');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const db = require('../config/database');
const { adminAuthMiddleware } = require('../utils/adminAuth');
const {
  TASK_STATUSES,
  ensureAdminWorkspaceDir,
  displayNameForEmail,
  getPreviewKind,
  sanitizeFileName,
  resolveUploadOriginalName,
  contentDispositionFilename,
  AD_STATUSES,
  AD_PLATFORMS,
  AD_PRIORITIES,
  mapAdLeadRow,
  getFinanceBalance,
  mapTaskRow,
  mapTaskCommentRow,
  mapTaskAttachmentRow,
  ensureTaskReadSchema,
  markTaskCommentsRead,
  countAllUnreadComments,
} = require('../utils/adminWorkspace');
const {
  ensureCrmSchema,
  seedCrmIfEmpty,
  seedTesterPack,
  mapLeadRow,
  mapFollowupRow,
  LEAD_FIELDS,
  CRM_STATUSES,
  computeLeadStats,
} = require('../utils/adminCrm');

const router = express.Router();
router.use(adminAuthMiddleware);

const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, ensureAdminWorkspaceDir()),
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname || '');
      cb(null, `${uuidv4()}${ext}`);
    },
  }),
  limits: { fileSize: 50 * 1024 * 1024 },
});

router.get('/tasks', async (req, res) => {
  try {
    await ensureTaskReadSchema();
    const adminEmail = req.adminEmail;
    const result = await db.query(
      `SELECT t.id, t.title, t.description, t.status, t.assignee_email, t.created_by, t.priority,
              t.sort_order, t.created_at, t.updated_at,
              (SELECT COUNT(*)::int FROM admin_task_comments c WHERE c.task_id = t.id) AS comment_count,
              (SELECT COUNT(*)::int FROM admin_task_attachments a WHERE a.task_id = t.id) AS attachment_count,
              (
                SELECT COUNT(*)::int FROM admin_task_comments c
                WHERE c.task_id = t.id
                  AND LOWER(c.created_by) <> LOWER($1)
                  AND c.created_at > COALESCE(
                    (SELECT r.last_read_at FROM admin_task_read_state r
                     WHERE r.task_id = t.id AND LOWER(r.admin_email) = LOWER($1)),
                    'epoch'::timestamptz
                  )
              ) AS unread_comment_count
       FROM admin_tasks t
       ORDER BY
         CASE t.status
           WHEN 'todo' THEN 1 WHEN 'in_progress' THEN 2 WHEN 'review' THEN 3 WHEN 'done' THEN 4 ELSE 5
         END,
         t.sort_order ASC,
         t.created_at DESC`,
      [adminEmail]
    );
    res.json({
      tasks: result.rows.map(mapTaskRow),
      statuses: TASK_STATUSES,
    });
  } catch (err) {
    console.error('Admin tasks list:', err);
    res.status(500).json({ error: 'Не удалось загрузить задачи' });
  }
});

router.get('/tasks/unread-total', async (req, res) => {
  try {
    const total = await countAllUnreadComments(req.adminEmail);
    res.json({ total });
  } catch (err) {
    console.error('Admin tasks unread total:', err);
    res.status(500).json({ error: 'Не удалось загрузить счётчик' });
  }
});

router.post('/tasks', async (req, res) => {
  try {
    const title = String(req.body?.title || '').trim();
    if (!title) return res.status(400).json({ error: 'Укажите название задачи' });

    const status = TASK_STATUSES.includes(req.body?.status) ? req.body.status : 'todo';
    const priority = ['low', 'normal', 'high'].includes(req.body?.priority) ? req.body.priority : 'normal';
    const assignee = req.body?.assignee_email
      ? String(req.body.assignee_email).trim().toLowerCase()
      : null;

    const result = await db.query(
      `INSERT INTO admin_tasks (title, description, status, assignee_email, created_by, priority)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [
        title,
        String(req.body?.description || '').trim() || null,
        status,
        assignee,
        req.adminEmail,
        priority,
      ]
    );
    const row = result.rows[0];
    res.status(201).json({ task: mapTaskRow({ ...row, comment_count: 0, attachment_count: 0 }) });
  } catch (err) {
    console.error('Admin task create:', err);
    res.status(500).json({ error: 'Не удалось создать задачу' });
  }
});

router.patch('/tasks/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const fields = [];
    const values = [];
    let idx = 1;

    if (req.body?.title !== undefined) {
      const title = String(req.body.title).trim();
      if (!title) return res.status(400).json({ error: 'Название не может быть пустым' });
      fields.push(`title = $${idx++}`);
      values.push(title);
    }
    if (req.body?.description !== undefined) {
      fields.push(`description = $${idx++}`);
      values.push(String(req.body.description).trim() || null);
    }
    if (req.body?.status !== undefined) {
      if (!TASK_STATUSES.includes(req.body.status)) {
        return res.status(400).json({ error: 'Некорректный статус' });
      }
      fields.push(`status = $${idx++}`);
      values.push(req.body.status);
    }
    if (req.body?.assignee_email !== undefined) {
      fields.push(`assignee_email = $${idx++}`);
      values.push(req.body.assignee_email ? String(req.body.assignee_email).trim().toLowerCase() : null);
    }
    if (req.body?.priority !== undefined) {
      if (!['low', 'normal', 'high'].includes(req.body.priority)) {
        return res.status(400).json({ error: 'Некорректный приоритет' });
      }
      fields.push(`priority = $${idx++}`);
      values.push(req.body.priority);
    }

    if (!fields.length) return res.status(400).json({ error: 'Нет данных для обновления' });

    fields.push('updated_at = NOW()');
    values.push(id);

    const result = await db.query(
      `UPDATE admin_tasks SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`,
      values
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'Задача не найдена' });

    const row = result.rows[0];
    const counts = await db.query(
      `SELECT
         (SELECT COUNT(*)::int FROM admin_task_comments WHERE task_id = $1) AS comment_count,
         (SELECT COUNT(*)::int FROM admin_task_attachments WHERE task_id = $1) AS attachment_count`,
      [id]
    );
    res.json({
      task: mapTaskRow({ ...row, ...counts.rows[0] }),
    });
  } catch (err) {
    console.error('Admin task update:', err);
    res.status(500).json({ error: 'Не удалось обновить задачу' });
  }
});

router.delete('/tasks/:id', async (req, res) => {
  try {
    const result = await db.query('DELETE FROM admin_tasks WHERE id = $1 RETURNING id', [req.params.id]);
    if (!result.rows[0]) return res.status(404).json({ error: 'Задача не найдена' });
    res.json({ ok: true });
  } catch (err) {
    console.error('Admin task delete:', err);
    res.status(500).json({ error: 'Не удалось удалить задачу' });
  }
});

router.get('/tasks/:id', async (req, res) => {
  try {
    await markTaskCommentsRead(req.params.id, req.adminEmail);

    const taskRes = await db.query(
      `SELECT id, title, description, status, assignee_email, created_by, priority, sort_order, created_at, updated_at
       FROM admin_tasks WHERE id = $1`,
      [req.params.id]
    );
    if (!taskRes.rows[0]) return res.status(404).json({ error: 'Задача не найдена' });

    const [commentsRes, attachmentsRes] = await Promise.all([
      db.query(
        `SELECT id, task_id, body, created_by, created_at
         FROM admin_task_comments WHERE task_id = $1 ORDER BY created_at ASC`,
        [req.params.id]
      ),
      db.query(
        `SELECT a.id, a.task_id, a.file_id, a.attached_by, a.created_at,
                f.original_name, f.mime_type, f.size_bytes
         FROM admin_task_attachments a
         JOIN admin_files f ON f.id = a.file_id
         WHERE a.task_id = $1
         ORDER BY a.created_at ASC`,
        [req.params.id]
      ),
    ]);

    const row = taskRes.rows[0];
    res.json({
      task: mapTaskRow({
        ...row,
        comment_count: commentsRes.rows.length,
        attachment_count: attachmentsRes.rows.length,
        unread_comment_count: 0,
      }),
      comments: commentsRes.rows.map(mapTaskCommentRow),
      attachments: attachmentsRes.rows.map(mapTaskAttachmentRow),
    });
  } catch (err) {
    console.error('Admin task detail:', err);
    res.status(500).json({ error: 'Не удалось загрузить задачу' });
  }
});

router.post('/tasks/:id/comments', async (req, res) => {
  try {
    const body = String(req.body?.body || '').trim();
    if (!body) return res.status(400).json({ error: 'Напишите комментарий' });

    const task = await db.query('SELECT id FROM admin_tasks WHERE id = $1', [req.params.id]);
    if (!task.rows[0]) return res.status(404).json({ error: 'Задача не найдена' });

    const result = await db.query(
      `INSERT INTO admin_task_comments (task_id, body, created_by) VALUES ($1, $2, $3) RETURNING *`,
      [req.params.id, body, req.adminEmail]
    );
    await markTaskCommentsRead(req.params.id, req.adminEmail);
    res.status(201).json({ comment: mapTaskCommentRow(result.rows[0]) });
  } catch (err) {
    console.error('Admin task comment:', err);
    res.status(500).json({ error: 'Не удалось добавить комментарий' });
  }
});

router.post('/tasks/:id/attachments/link', async (req, res) => {
  try {
    const fileId = req.body?.fileId;
    if (!fileId) return res.status(400).json({ error: 'Укажите файл' });

    const task = await db.query('SELECT id FROM admin_tasks WHERE id = $1', [req.params.id]);
    if (!task.rows[0]) return res.status(404).json({ error: 'Задача не найдена' });

    const file = await db.query('SELECT id FROM admin_files WHERE id = $1', [fileId]);
    if (!file.rows[0]) return res.status(404).json({ error: 'Файл не найден' });

    const result = await db.query(
      `INSERT INTO admin_task_attachments (task_id, file_id, attached_by)
       VALUES ($1, $2, $3)
       ON CONFLICT (task_id, file_id) DO NOTHING
       RETURNING *`,
      [req.params.id, fileId, req.adminEmail]
    );
    if (!result.rows[0]) {
      return res.status(409).json({ error: 'Файл уже прикреплён' });
    }

    const full = await db.query(
      `SELECT a.id, a.task_id, a.file_id, a.attached_by, a.created_at,
              f.original_name, f.mime_type, f.size_bytes
       FROM admin_task_attachments a
       JOIN admin_files f ON f.id = a.file_id
       WHERE a.id = $1`,
      [result.rows[0].id]
    );
    res.status(201).json({ attachment: mapTaskAttachmentRow(full.rows[0]) });
  } catch (err) {
    console.error('Admin task attach link:', err);
    res.status(500).json({ error: 'Не удалось прикрепить файл' });
  }
});

router.post('/tasks/:id/attachments/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Файл не выбран' });

    const task = await db.query('SELECT id FROM admin_tasks WHERE id = $1', [req.params.id]);
    if (!task.rows[0]) return res.status(404).json({ error: 'Задача не найдена' });

    const originalName = resolveUploadOriginalName(req);

    const fileRes = await db.query(
      `INSERT INTO admin_files (folder_id, original_name, stored_name, mime_type, size_bytes, uploaded_by)
       VALUES (NULL, $1, $2, $3, $4, $5) RETURNING *`,
      [
        originalName,
        req.file.filename,
        req.file.mimetype,
        req.file.size,
        req.adminEmail,
      ]
    );

    const attachRes = await db.query(
      `INSERT INTO admin_task_attachments (task_id, file_id, attached_by) VALUES ($1, $2, $3) RETURNING *`,
      [req.params.id, fileRes.rows[0].id, req.adminEmail]
    );

    const row = {
      ...attachRes.rows[0],
      original_name: fileRes.rows[0].original_name,
      mime_type: fileRes.rows[0].mime_type,
      size_bytes: fileRes.rows[0].size_bytes,
    };
    res.status(201).json({ attachment: mapTaskAttachmentRow(row) });
  } catch (err) {
    console.error('Admin task attach upload:', err);
    res.status(500).json({ error: 'Не удалось загрузить файл' });
  }
});

router.delete('/tasks/:id/attachments/:attachmentId', async (req, res) => {
  try {
    const result = await db.query(
      'DELETE FROM admin_task_attachments WHERE id = $1 AND task_id = $2 RETURNING id',
      [req.params.attachmentId, req.params.id]
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'Вложение не найдено' });
    res.json({ ok: true });
  } catch (err) {
    console.error('Admin task detach:', err);
    res.status(500).json({ error: 'Не удалось открепить файл' });
  }
});

router.get('/folders', async (req, res) => {
  try {
    const parentId = req.query.parentId || null;
    const folders = await db.query(
      `SELECT id, name, parent_id, created_by, created_at
       FROM admin_folders
       WHERE parent_id IS NOT DISTINCT FROM $1::uuid
       ORDER BY name ASC`,
      [parentId]
    );
    res.json({ folders: folders.rows });
  } catch (err) {
    console.error('Admin folders:', err);
    res.status(500).json({ error: 'Не удалось загрузить папки' });
  }
});

router.post('/folders', async (req, res) => {
  try {
    const name = String(req.body?.name || '').trim();
    if (!name) return res.status(400).json({ error: 'Укажите название папки' });
    const parentId = req.body?.parentId || null;

    const result = await db.query(
      `INSERT INTO admin_folders (name, parent_id, created_by) VALUES ($1, $2, $3) RETURNING *`,
      [name, parentId, req.adminEmail]
    );
    res.status(201).json({ folder: result.rows[0] });
  } catch (err) {
    console.error('Admin folder create:', err);
    res.status(500).json({ error: 'Не удалось создать папку' });
  }
});

router.delete('/folders/:id', async (req, res) => {
  try {
    const files = await db.query('SELECT stored_name FROM admin_files WHERE folder_id = $1', [req.params.id]);
    const result = await db.query('DELETE FROM admin_folders WHERE id = $1 RETURNING id', [req.params.id]);
    if (!result.rows[0]) return res.status(404).json({ error: 'Папка не найдена' });

    const dir = ensureAdminWorkspaceDir();
    files.rows.forEach((f) => {
      try {
        fs.unlinkSync(path.join(dir, f.stored_name));
      } catch {
        /* ignore */
      }
    });
    res.json({ ok: true });
  } catch (err) {
    console.error('Admin folder delete:', err);
    res.status(500).json({ error: 'Не удалось удалить папку' });
  }
});

router.get('/files', async (req, res) => {
  try {
    const folderId = req.query.folderId || null;
    const result = await db.query(
      `SELECT id, folder_id, original_name, mime_type, size_bytes, uploaded_by, created_at
       FROM admin_files
       WHERE folder_id IS NOT DISTINCT FROM $1::uuid
       ORDER BY original_name ASC`,
      [folderId]
    );
    res.json({
      files: result.rows.map((row) => ({
        ...row,
        size_bytes: Number(row.size_bytes),
        uploaded_by_name: displayNameForEmail(row.uploaded_by),
        preview_kind: getPreviewKind(row.mime_type, row.original_name),
      })),
    });
  } catch (err) {
    console.error('Admin files list:', err);
    res.status(500).json({ error: 'Не удалось загрузить файлы' });
  }
});

router.post('/files', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Файл не выбран' });
    const folderId = req.body?.folderId || null;

    const originalName = resolveUploadOriginalName(req);

    const result = await db.query(
      `INSERT INTO admin_files (folder_id, original_name, stored_name, mime_type, size_bytes, uploaded_by)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [
        folderId || null,
        originalName,
        req.file.filename,
        req.file.mimetype,
        req.file.size,
        req.adminEmail,
      ]
    );
    res.status(201).json({
      file: {
        ...result.rows[0],
        uploaded_by_name: displayNameForEmail(req.adminEmail),
        preview_kind: getPreviewKind(result.rows[0].mime_type, result.rows[0].original_name),
      },
    });
  } catch (err) {
    console.error('Admin file upload:', err);
    res.status(500).json({ error: 'Не удалось загрузить файл' });
  }
});

router.get('/files/:id/preview', async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM admin_files WHERE id = $1', [req.params.id]);
    const row = result.rows[0];
    if (!row) return res.status(404).json({ error: 'Файл не найден' });

    const filePath = path.join(ensureAdminWorkspaceDir(), row.stored_name);
    if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'Файл на диске не найден' });

    const mime = row.mime_type || 'application/octet-stream';
    res.setHeader('Content-Type', mime);
    res.setHeader('Cache-Control', 'private, max-age=3600');
    res.setHeader('Content-Disposition', contentDispositionFilename(row.original_name, 'inline'));
    res.sendFile(filePath);
  } catch (err) {
    console.error('Admin file preview:', err);
    res.status(500).json({ error: 'Не удалось открыть превью' });
  }
});

router.patch('/files/:id', async (req, res) => {
  try {
    const originalName = sanitizeFileName(req.body?.original_name);
    if (!originalName) return res.status(400).json({ error: 'Укажите корректное имя файла' });

    const result = await db.query(
      `UPDATE admin_files SET original_name = $1 WHERE id = $2 RETURNING *`,
      [originalName, req.params.id]
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'Файл не найден' });

    const row = result.rows[0];
    res.json({
      file: {
        ...row,
        size_bytes: Number(row.size_bytes),
        uploaded_by_name: displayNameForEmail(row.uploaded_by),
        preview_kind: getPreviewKind(row.mime_type, row.original_name),
      },
    });
  } catch (err) {
    console.error('Admin file rename:', err);
    res.status(500).json({ error: 'Не удалось переименовать файл' });
  }
});

router.get('/files/:id/download', async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM admin_files WHERE id = $1', [req.params.id]);
    const row = result.rows[0];
    if (!row) return res.status(404).json({ error: 'Файл не найден' });

    const filePath = path.join(ensureAdminWorkspaceDir(), row.stored_name);
    if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'Файл на диске не найден' });

    res.setHeader('Content-Disposition', contentDispositionFilename(row.original_name, 'attachment'));
    res.sendFile(filePath);
  } catch (err) {
    console.error('Admin file download:', err);
    res.status(500).json({ error: 'Не удалось скачать файл' });
  }
});

router.delete('/files/:id', async (req, res) => {
  try {
    const result = await db.query('DELETE FROM admin_files WHERE id = $1 RETURNING stored_name', [req.params.id]);
    if (!result.rows[0]) return res.status(404).json({ error: 'Файл не найден' });

    const filePath = path.join(ensureAdminWorkspaceDir(), result.rows[0].stored_name);
    try {
      fs.unlinkSync(filePath);
    } catch {
      /* ignore */
    }
    res.json({ ok: true });
  } catch (err) {
    console.error('Admin file delete:', err);
    res.status(500).json({ error: 'Не удалось удалить файл' });
  }
});

router.get('/finance/summary', async (_req, res) => {
  try {
    const tz = 'Europe/Moscow';
    const [earnedToday, earned7d, earned30d, earnedTotal, withdrawnTotal, recent] = await Promise.all([
      db.query(
        `SELECT COALESCE(SUM(amount), 0)::numeric AS s FROM billing_payments
         WHERE status = 'succeeded'
           AND created_at >= date_trunc('day', NOW() AT TIME ZONE $1) AT TIME ZONE $1`,
        [tz]
      ),
      db.query(
        `SELECT COALESCE(SUM(amount), 0)::numeric AS s FROM billing_payments
         WHERE status = 'succeeded'
           AND created_at >= NOW() - INTERVAL '7 days'`
      ),
      db.query(
        `SELECT COALESCE(SUM(amount), 0)::numeric AS s FROM billing_payments
         WHERE status = 'succeeded'
           AND created_at >= NOW() - INTERVAL '30 days'`
      ),
      db.query(
        `SELECT COALESCE(SUM(amount), 0)::numeric AS s FROM billing_payments WHERE status = 'succeeded'`
      ),
      db.query(
        `SELECT COALESCE(SUM(amount), 0)::numeric AS s FROM admin_withdrawals`
      ),
      db.query(
        `SELECT id, amount, reason, created_by, created_at FROM admin_withdrawals
         ORDER BY created_at DESC LIMIT 50`
      ),
    ]);

    const earnedTodayRub = Number(earnedToday.rows[0].s);
    const earned7dRub = Number(earned7d.rows[0].s);
    const earned30dRub = Number(earned30d.rows[0].s);
    const earnedTotalRub = Number(earnedTotal.rows[0].s);
    const withdrawnRub = Number(withdrawnTotal.rows[0].s);

    res.json({
      earnedTodayRub,
      earned7dRub,
      earned30dRub,
      earnedTotalRub,
      withdrawnRub,
      balanceRub: earnedTotalRub - withdrawnRub,
      withdrawals: recent.rows.map((row) => ({
        ...row,
        amount: Number(row.amount),
        created_by_name: displayNameForEmail(row.created_by),
      })),
    });
  } catch (err) {
    console.error('Admin finance summary:', err);
    res.status(500).json({ error: 'Не удалось загрузить финансы' });
  }
});

router.post('/finance/withdrawals', async (req, res) => {
  try {
    const amount = Number(req.body?.amount);
    const reason = String(req.body?.reason || '').trim();
    if (!Number.isFinite(amount) || amount <= 0) {
      return res.status(400).json({ error: 'Укажите корректную сумму списания' });
    }
    if (!reason) return res.status(400).json({ error: 'Укажите причину списания' });

    const earned = await db.query(
      `SELECT COALESCE(SUM(amount), 0)::numeric AS s FROM billing_payments WHERE status = 'succeeded'`
    );
    const withdrawn = await db.query(
      `SELECT COALESCE(SUM(amount), 0)::numeric AS s FROM admin_withdrawals`
    );
    const balance = Number(earned.rows[0].s) - Number(withdrawn.rows[0].s);
    if (amount > balance) {
      return res.status(400).json({ error: `Недостаточно средств. Доступно: ${Math.floor(balance)} ₽` });
    }

    const result = await db.query(
      `INSERT INTO admin_withdrawals (amount, reason, created_by) VALUES ($1, $2, $3) RETURNING *`,
      [amount, reason, req.adminEmail]
    );
    const row = result.rows[0];
    res.status(201).json({
      withdrawal: {
        ...row,
        amount: Number(row.amount),
        created_by_name: displayNameForEmail(row.created_by),
      },
    });
  } catch (err) {
    console.error('Admin withdrawal create:', err);
    res.status(500).json({ error: 'Не удалось записать списание' });
  }
});

router.get('/vault', async (_req, res) => {
  try {
    const result = await db.query(
      `SELECT id, title, url, login, password, created_by, updated_by, created_at, updated_at
       FROM admin_vault_entries
       ORDER BY title ASC`
    );
    res.json({
      entries: result.rows.map((row) => ({
        ...row,
        created_by_name: displayNameForEmail(row.created_by),
        updated_by_name: row.updated_by ? displayNameForEmail(row.updated_by) : null,
      })),
    });
  } catch (err) {
    console.error('Admin vault list:', err);
    res.status(500).json({ error: 'Не удалось загрузить доступы' });
  }
});

router.post('/vault', async (req, res) => {
  try {
    const title = String(req.body?.title || '').trim();
    if (!title) return res.status(400).json({ error: 'Укажите название' });

    const result = await db.query(
      `INSERT INTO admin_vault_entries (title, url, login, password, created_by, updated_by)
       VALUES ($1, $2, $3, $4, $5, $5) RETURNING *`,
      [
        title,
        String(req.body?.url || '').trim() || null,
        String(req.body?.login || '').trim() || null,
        String(req.body?.password || '').trim() || null,
        req.adminEmail,
      ]
    );
    const row = result.rows[0];
    res.status(201).json({
      entry: {
        ...row,
        created_by_name: displayNameForEmail(row.created_by),
        updated_by_name: displayNameForEmail(row.updated_by),
      },
    });
  } catch (err) {
    console.error('Admin vault create:', err);
    res.status(500).json({ error: 'Не удалось сохранить' });
  }
});

router.patch('/vault/:id', async (req, res) => {
  try {
    const title = String(req.body?.title || '').trim();
    if (!title) return res.status(400).json({ error: 'Укажите название' });

    const result = await db.query(
      `UPDATE admin_vault_entries
       SET title = $1, url = $2, login = $3, password = $4, updated_by = $5, updated_at = NOW()
       WHERE id = $6 RETURNING *`,
      [
        title,
        String(req.body?.url || '').trim() || null,
        String(req.body?.login || '').trim() || null,
        String(req.body?.password ?? '').trim() || null,
        req.adminEmail,
        req.params.id,
      ]
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'Запись не найдена' });

    const row = result.rows[0];
    res.json({
      entry: {
        ...row,
        created_by_name: displayNameForEmail(row.created_by),
        updated_by_name: displayNameForEmail(row.updated_by),
      },
    });
  } catch (err) {
    console.error('Admin vault update:', err);
    res.status(500).json({ error: 'Не удалось обновить' });
  }
});

router.delete('/vault/:id', async (req, res) => {
  try {
    const result = await db.query('DELETE FROM admin_vault_entries WHERE id = $1 RETURNING id', [req.params.id]);
    if (!result.rows[0]) return res.status(404).json({ error: 'Запись не найдена' });
    res.json({ ok: true });
  } catch (err) {
    console.error('Admin vault delete:', err);
    res.status(500).json({ error: 'Не удалось удалить' });
  }
});

router.get('/ads', async (_req, res) => {
  try {
    const [result, balance] = await Promise.all([
      db.query(
        `SELECT id, title, platform, channel_url, contact, audience_size, quoted_price, allocated_budget,
                status, conditions, notes, priority, created_by, updated_by, created_at, updated_at
         FROM admin_ad_leads
         ORDER BY
           CASE status
             WHEN 'negotiating' THEN 1 WHEN 'agreed' THEN 2 WHEN 'contacted' THEN 3
             WHEN 'new' THEN 4 WHEN 'paid' THEN 5 WHEN 'done' THEN 6 WHEN 'rejected' THEN 7 ELSE 8
           END,
           CASE priority WHEN 'high' THEN 1 WHEN 'normal' THEN 2 ELSE 3 END,
           updated_at DESC`
      ),
      getFinanceBalance(db),
    ]);

    const leads = result.rows.map(mapAdLeadRow);
    const summary = {
      total: leads.length,
      active: leads.filter((l) => !['rejected', 'done'].includes(l.status)).length,
      quotedTotalRub: leads.reduce((s, l) => s + (l.quoted_price || 0), 0),
      allocatedTotalRub: leads.reduce((s, l) => s + l.allocated_budget, 0),
      cashBalanceRub: balance,
    };

    res.json({ leads, summary, statuses: AD_STATUSES, platforms: AD_PLATFORMS });
  } catch (err) {
    console.error('Admin ads list:', err);
    res.status(500).json({ error: 'Не удалось загрузить рекламу' });
  }
});

router.post('/ads', async (req, res) => {
  try {
    const title = String(req.body?.title || '').trim();
    if (!title) return res.status(400).json({ error: 'Укажите название канала или блогера' });

    const platform = AD_PLATFORMS.includes(req.body?.platform) ? req.body.platform : 'other';
    const status = AD_STATUSES.includes(req.body?.status) ? req.body.status : 'new';
    const priority = AD_PRIORITIES.includes(req.body?.priority) ? req.body.priority : 'normal';
    const quoted = req.body?.quoted_price != null && req.body.quoted_price !== ''
      ? Number(req.body.quoted_price)
      : null;
    const audience = req.body?.audience_size != null && req.body.audience_size !== ''
      ? parseInt(req.body.audience_size, 10)
      : null;

    const result = await db.query(
      `INSERT INTO admin_ad_leads (
         title, platform, channel_url, contact, audience_size, quoted_price,
         status, conditions, notes, priority, created_by, updated_by
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$11) RETURNING *`,
      [
        title,
        platform,
        String(req.body?.channel_url || '').trim() || null,
        String(req.body?.contact || '').trim() || null,
        Number.isFinite(audience) ? audience : null,
        Number.isFinite(quoted) ? quoted : null,
        status,
        String(req.body?.conditions || '').trim() || null,
        String(req.body?.notes || '').trim() || null,
        priority,
        req.adminEmail,
      ]
    );
    res.status(201).json({ lead: mapAdLeadRow(result.rows[0]) });
  } catch (err) {
    console.error('Admin ads create:', err);
    res.status(500).json({ error: 'Не удалось создать запись' });
  }
});

router.patch('/ads/:id', async (req, res) => {
  try {
    const title = String(req.body?.title || '').trim();
    if (!title) return res.status(400).json({ error: 'Укажите название' });

    const platform = AD_PLATFORMS.includes(req.body?.platform) ? req.body.platform : 'other';
    const status = AD_STATUSES.includes(req.body?.status) ? req.body.status : 'new';
    const priority = AD_PRIORITIES.includes(req.body?.priority) ? req.body.priority : 'normal';
    const quoted = req.body?.quoted_price != null && req.body.quoted_price !== ''
      ? Number(req.body.quoted_price)
      : null;
    const audience = req.body?.audience_size != null && req.body.audience_size !== ''
      ? parseInt(req.body.audience_size, 10)
      : null;

    const result = await db.query(
      `UPDATE admin_ad_leads SET
         title = $1, platform = $2, channel_url = $3, contact = $4, audience_size = $5,
         quoted_price = $6, status = $7, conditions = $8, notes = $9, priority = $10,
         updated_by = $11, updated_at = NOW()
       WHERE id = $12 RETURNING *`,
      [
        title,
        platform,
        String(req.body?.channel_url || '').trim() || null,
        String(req.body?.contact || '').trim() || null,
        Number.isFinite(audience) ? audience : null,
        Number.isFinite(quoted) ? quoted : null,
        status,
        String(req.body?.conditions || '').trim() || null,
        String(req.body?.notes || '').trim() || null,
        priority,
        req.adminEmail,
        req.params.id,
      ]
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'Запись не найдена' });
    res.json({ lead: mapAdLeadRow(result.rows[0]) });
  } catch (err) {
    console.error('Admin ads update:', err);
    res.status(500).json({ error: 'Не удалось обновить' });
  }
});

router.post('/ads/:id/allocate', async (req, res) => {
  const client = await db.pool.connect();
  try {
    const amount = Number(req.body?.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      return res.status(400).json({ error: 'Укажите корректную сумму' });
    }

    await client.query('BEGIN');

    const leadRes = await client.query('SELECT * FROM admin_ad_leads WHERE id = $1 FOR UPDATE', [req.params.id]);
    const lead = leadRes.rows[0];
    if (!lead) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Запись не найдена' });
    }

    const earned = await client.query(
      `SELECT COALESCE(SUM(amount), 0)::numeric AS s FROM billing_payments WHERE status = 'succeeded'`
    );
    const withdrawn = await client.query(
      `SELECT COALESCE(SUM(amount), 0)::numeric AS s FROM admin_withdrawals`
    );
    const balance = Number(earned.rows[0].s) - Number(withdrawn.rows[0].s);
    if (amount > balance) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: `Недостаточно в кассе. Доступно: ${Math.floor(balance)} ₽` });
    }

    const reason = `Реклама: ${lead.title}`;
    await client.query(
      `INSERT INTO admin_withdrawals (amount, reason, created_by, ad_lead_id) VALUES ($1, $2, $3, $4)`,
      [amount, reason, req.adminEmail, lead.id]
    );

    const updated = await client.query(
      `UPDATE admin_ad_leads
       SET allocated_budget = allocated_budget + $1,
           status = 'paid',
           updated_by = $2,
           updated_at = NOW()
       WHERE id = $3 RETURNING *`,
      [amount, req.adminEmail, lead.id]
    );

    await client.query('COMMIT');
    res.json({ lead: mapAdLeadRow(updated.rows[0]) });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Admin ads allocate:', err);
    res.status(500).json({ error: 'Не удалось выделить бюджет' });
  } finally {
    client.release();
  }
});

router.patch('/ads/:id/status', async (req, res) => {
  try {
    const status = String(req.body?.status || '');
    if (!AD_STATUSES.includes(status)) {
      return res.status(400).json({ error: 'Некорректный статус' });
    }

    const existing = await db.query('SELECT * FROM admin_ad_leads WHERE id = $1', [req.params.id]);
    if (!existing.rows[0]) return res.status(404).json({ error: 'Запись не найдена' });

    const result = await db.query(
      `UPDATE admin_ad_leads
       SET status = $1, updated_by = $2, updated_at = NOW()
       WHERE id = $3 RETURNING *`,
      [status, req.adminEmail, req.params.id]
    );
    res.json({ lead: mapAdLeadRow(result.rows[0]) });
  } catch (err) {
    console.error('Admin ads status:', err);
    res.status(500).json({ error: 'Не удалось обновить статус' });
  }
});

router.post('/ads/:id/publish', async (req, res) => {
  try {
    const existing = await db.query('SELECT * FROM admin_ad_leads WHERE id = $1', [req.params.id]);
    if (!existing.rows[0]) return res.status(404).json({ error: 'Запись не найдена' });
    if (existing.rows[0].status !== 'paid') {
      return res.status(400).json({ error: 'Опубликовать можно только оплаченную рекламу' });
    }

    const result = await db.query(
      `UPDATE admin_ad_leads
       SET status = 'done', updated_by = $1, updated_at = NOW()
       WHERE id = $2 RETURNING *`,
      [req.adminEmail, req.params.id]
    );
    res.json({ lead: mapAdLeadRow(result.rows[0]) });
  } catch (err) {
    console.error('Admin ads publish:', err);
    res.status(500).json({ error: 'Не удалось отметить как опубликованное' });
  }
});

router.delete('/ads/:id', async (req, res) => {
  try {
    const result = await db.query('DELETE FROM admin_ad_leads WHERE id = $1 RETURNING id', [req.params.id]);
    if (!result.rows[0]) return res.status(404).json({ error: 'Запись не найдена' });
    res.json({ ok: true });
  } catch (err) {
    console.error('Admin ads delete:', err);
    res.status(500).json({ error: 'Не удалось удалить' });
  }
});

// ——— Партнёрская программа ———
const { uploadsDir } = require('../config/paths');
const { ensurePartnerSchema, maskCardNumber, MAX_PARTNER_POST_TEMPLATES } = require('../utils/partnerProgram');

const partnerAssetsDir = path.join(uploadsDir, 'partner-assets');
if (!fs.existsSync(partnerAssetsDir)) {
  fs.mkdirSync(partnerAssetsDir, { recursive: true });
}

const partnerAssetUpload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, partnerAssetsDir),
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname || '');
      cb(null, `${uuidv4()}${ext}`);
    },
  }),
  limits: { fileSize: 25 * 1024 * 1024 },
});

router.get('/partners/summary', async (_req, res) => {
  try {
    await ensurePartnerSchema();
    const result = await db.query(`
      SELECT
        (SELECT COUNT(*)::int FROM partners WHERE is_active = TRUE) AS partners_count,
        (SELECT COALESCE(SUM(balance), 0)::numeric FROM partners WHERE is_active = TRUE) AS total_balance,
        (SELECT COALESCE(SUM(total_earned), 0)::numeric FROM partners) AS total_earned,
        (SELECT COUNT(*)::int FROM partner_withdrawals WHERE status = 'pending') AS pending_withdrawals,
        (SELECT COALESCE(SUM(amount), 0)::numeric FROM partner_withdrawals WHERE status = 'pending') AS pending_amount,
        (SELECT COUNT(*)::int FROM masters WHERE referred_by_partner_id IS NOT NULL) AS referred_masters
    `);
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Admin partners summary:', err);
    res.status(500).json({ error: 'Ошибка загрузки сводки' });
  }
});

router.get('/partners', async (_req, res) => {
  try {
    const result = await db.query(`
      SELECT p.*,
        (SELECT COUNT(*)::int FROM masters m WHERE m.referred_by_partner_id = p.id) AS referrals_count
      FROM partners p
      ORDER BY p.created_at DESC
      LIMIT 200
    `);
    res.json({
      partners: result.rows.map((r) => ({
        id: r.id,
        email: r.email,
        full_name: r.full_name,
        referral_code: r.referral_code,
        balance: Number(r.balance),
        total_earned: Number(r.total_earned),
        referrals_count: r.referrals_count,
        email_verified: r.email_verified,
        is_active: r.is_active,
        created_at: r.created_at,
      })),
    });
  } catch (err) {
    res.status(500).json({ error: 'Ошибка загрузки партнёров' });
  }
});

router.get('/partners/withdrawals', async (req, res) => {
  try {
    const status = req.query.status || 'pending';
    const result = await db.query(
      `SELECT w.*, p.email AS partner_email, p.full_name AS partner_account_name
       FROM partner_withdrawals w
       JOIN partners p ON p.id = w.partner_id
       WHERE ($1 = 'all' OR w.status = $1)
       ORDER BY w.created_at DESC LIMIT 100`,
      [status]
    );
    res.json({
      withdrawals: result.rows.map((r) => ({
        ...r,
        amount: Number(r.amount),
        card_masked: maskCardNumber(r.card_number),
      })),
    });
  } catch (err) {
    res.status(500).json({ error: 'Ошибка загрузки заявок' });
  }
});

router.post('/partners/withdrawals/:id/complete', async (req, res) => {
  const client = await db.connect();
  try {
    await client.query('BEGIN');
    const wRes = await client.query(
      `SELECT w.*, p.full_name AS partner_name, p.email AS partner_email
       FROM partner_withdrawals w JOIN partners p ON p.id = w.partner_id
       WHERE w.id = $1 FOR UPDATE`,
      [req.params.id]
    );
    const w = wRes.rows[0];
    if (!w) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Заявка не найдена' });
    }
    if (w.status !== 'pending') {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Заявка уже обработана' });
    }

    const reason = `Выплата партнёру ${w.partner_name} (${w.partner_email}) — вывод #${w.id.slice(0, 8)} · ${w.full_name} · ${maskCardNumber(w.card_number)} · ${w.bank_name}`;
    const adminW = await client.query(
      `INSERT INTO admin_withdrawals (amount, reason, created_by) VALUES ($1, $2, $3) RETURNING id`,
      [Number(w.amount), reason, req.adminEmail]
    );

    await client.query(
      `UPDATE partner_withdrawals SET status = 'completed', processed_at = NOW(),
       processed_by = $2, admin_withdrawal_id = $3, admin_note = $4
       WHERE id = $1`,
      [w.id, req.adminEmail, adminW.rows[0].id, req.body?.note || null]
    );

    await client.query('COMMIT');
    res.json({ ok: true, admin_withdrawal_id: adminW.rows[0].id });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Partner withdrawal complete:', err);
    res.status(500).json({ error: 'Ошибка обработки' });
  } finally {
    client.release();
  }
});

router.post('/partners/withdrawals/:id/reject', async (req, res) => {
  const client = await db.connect();
  try {
    await client.query('BEGIN');
    const wRes = await client.query(
      `SELECT * FROM partner_withdrawals WHERE id = $1 FOR UPDATE`,
      [req.params.id]
    );
    const w = wRes.rows[0];
    if (!w || w.status !== 'pending') {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Заявка не найдена или уже обработана' });
    }

    await client.query(
      `UPDATE partners SET balance = balance + $1, updated_at = NOW() WHERE id = $2`,
      [Number(w.amount), w.partner_id]
    );
    await client.query(
      `UPDATE partner_withdrawals SET status = 'rejected', processed_at = NOW(),
       processed_by = $2, admin_note = $3 WHERE id = $1`,
      [w.id, req.adminEmail, req.body?.note || 'Отклонено']
    );
    await client.query('COMMIT');
    res.json({ ok: true });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: 'Ошибка отклонения' });
  } finally {
    client.release();
  }
});

router.get('/partners/assets', async (_req, res) => {
  try {
    const result = await db.query(
      `SELECT * FROM partner_assets ORDER BY sort_order, created_at DESC`
    );
    res.json({ assets: result.rows });
  } catch (err) {
    res.status(500).json({ error: 'Ошибка загрузки материалов' });
  }
});

router.post('/partners/assets', partnerAssetUpload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Файл не передан' });
    const { title, description, file_type, sort_order } = req.body || {};
    if (!title?.trim()) return res.status(400).json({ error: 'Укажите название' });

    const id = uuidv4();
    const result = await db.query(
      `INSERT INTO partner_assets (id, title, description, file_type, file_path, file_name, mime_type, size_bytes, sort_order, uploaded_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
      [
        id,
        title.trim(),
        description || null,
        file_type || 'other',
        req.file.path,
        req.file.originalname,
        req.file.mimetype,
        req.file.size,
        Number(sort_order) || 0,
        req.adminEmail,
      ]
    );
    res.status(201).json({ asset: result.rows[0] });
  } catch (err) {
    console.error('Partner asset upload:', err);
    res.status(500).json({ error: 'Ошибка загрузки' });
  }
});

router.delete('/partners/assets/:id', async (req, res) => {
  try {
    const result = await db.query(
      `UPDATE partner_assets SET is_active = FALSE WHERE id = $1 RETURNING id`,
      [req.params.id]
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'Не найдено' });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'Ошибка удаления' });
  }
});

router.get('/partners/post-templates', async (_req, res) => {
  try {
    await ensurePartnerSchema();
    const result = await db.query(
      `SELECT id, title, body, sort_order, is_active, created_at, updated_at
       FROM partner_post_templates
       ORDER BY sort_order ASC, created_at ASC`
    );
    res.json({
      templates: result.rows,
      max: MAX_PARTNER_POST_TEMPLATES,
      activeCount: result.rows.filter((r) => r.is_active).length,
    });
  } catch (err) {
    console.error('Partner post templates list:', err);
    res.status(500).json({ error: 'Ошибка загрузки постов' });
  }
});

router.post('/partners/post-templates', async (req, res) => {
  try {
    await ensurePartnerSchema();
    const { title, body, sort_order } = req.body || {};
    if (!title?.trim()) return res.status(400).json({ error: 'Укажите название поста' });
    if (!body?.trim()) return res.status(400).json({ error: 'Укажите текст поста' });

    const countRes = await db.query(
      `SELECT COUNT(*)::int AS c FROM partner_post_templates WHERE is_active = TRUE`
    );
    if (countRes.rows[0].c >= MAX_PARTNER_POST_TEMPLATES) {
      return res.status(400).json({ error: `Максимум ${MAX_PARTNER_POST_TEMPLATES} активных постов` });
    }

    const id = uuidv4();
    const result = await db.query(
      `INSERT INTO partner_post_templates (id, title, body, sort_order, created_by)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [id, title.trim(), body.trim(), Number(sort_order) || 0, req.adminEmail]
    );
    res.status(201).json({ template: result.rows[0] });
  } catch (err) {
    console.error('Partner post template create:', err);
    res.status(500).json({ error: 'Ошибка сохранения поста' });
  }
});

router.put('/partners/post-templates/:id', async (req, res) => {
  try {
    await ensurePartnerSchema();
    const { title, body, sort_order, is_active } = req.body || {};
    const current = await db.query(
      `SELECT * FROM partner_post_templates WHERE id = $1`,
      [req.params.id]
    );
    const row = current.rows[0];
    if (!row) return res.status(404).json({ error: 'Пост не найден' });

    const nextActive = is_active !== undefined ? Boolean(is_active) : row.is_active;
    if (nextActive && !row.is_active) {
      const countRes = await db.query(
        `SELECT COUNT(*)::int AS c FROM partner_post_templates WHERE is_active = TRUE`
      );
      if (countRes.rows[0].c >= MAX_PARTNER_POST_TEMPLATES) {
        return res.status(400).json({ error: `Максимум ${MAX_PARTNER_POST_TEMPLATES} активных постов` });
      }
    }

    const result = await db.query(
      `UPDATE partner_post_templates SET
         title = COALESCE($2, title),
         body = COALESCE($3, body),
         sort_order = COALESCE($4, sort_order),
         is_active = COALESCE($5, is_active),
         updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [
        req.params.id,
        title?.trim() || null,
        body?.trim() || null,
        sort_order !== undefined ? Number(sort_order) : null,
        is_active !== undefined ? nextActive : null,
      ]
    );
    res.json({ template: result.rows[0] });
  } catch (err) {
    console.error('Partner post template update:', err);
    res.status(500).json({ error: 'Ошибка обновления поста' });
  }
});

router.delete('/partners/post-templates/:id', async (req, res) => {
  try {
    await ensurePartnerSchema();
    const result = await db.query(
      `UPDATE partner_post_templates SET is_active = FALSE, updated_at = NOW() WHERE id = $1 RETURNING id`,
      [req.params.id]
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'Пост не найден' });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'Ошибка удаления поста' });
  }
});

// --- CRM: Рабочий стол менеджера ---

router.get('/crm/bootstrap', async (_req, res) => {
  try {
    await ensureCrmSchema();
    await seedCrmIfEmpty();
    await seedTesterPack();

    const [leadsRes, followupsRes, analyticsRes, staticRes, refRes] = await Promise.all([
      db.query(
        `SELECT * FROM admin_crm_leads ORDER BY sort_order ASC, created_at DESC LIMIT 2000`
      ),
      db.query(`SELECT * FROM admin_crm_followups ORDER BY sort_order ASC, touch_date ASC NULLS LAST`),
      db.query(`SELECT * FROM admin_crm_analytics ORDER BY sort_order ASC`),
      db.query(`SELECT sheet_key, content FROM admin_crm_static`),
      db.query(`SELECT id, sheet_key, cols, sort_order FROM admin_crm_ref_rows ORDER BY sheet_key, sort_order`),
    ]);

    const leads = leadsRes.rows.map(mapLeadRow);
    const staticMap = Object.fromEntries(staticRes.rows.map((r) => [r.sheet_key, r.content]));
    const refBySheet = { scripts: [], answers: [], search: [] };
    for (const row of refRes.rows) {
      if (!refBySheet[row.sheet_key]) refBySheet[row.sheet_key] = [];
      refBySheet[row.sheet_key].push({
        id: row.id,
        cols: Array.isArray(row.cols) ? row.cols : JSON.parse(row.cols || '[]'),
        sort_order: row.sort_order,
      });
    }

    res.json({
      leads,
      followups: followupsRes.rows.map(mapFollowupRow),
      analytics: analyticsRes.rows,
      static: staticMap,
      scripts: refBySheet.scripts || [],
      answers: refBySheet.answers || [],
      search: refBySheet.search || [],
      statuses: CRM_STATUSES,
      stats: computeLeadStats(leads),
    });
  } catch (err) {
    console.error('CRM bootstrap:', err);
    res.status(500).json({ error: 'Не удалось загрузить рабочий стол' });
  }
});

router.post('/crm/leads', async (req, res) => {
  try {
    await ensureCrmSchema();
    const body = req.body || {};
    const today = new Date().toISOString().slice(0, 10);
    const result = await db.query(
      `INSERT INTO admin_crm_leads (
         lead_date, platform, contact, name, city, niche, status, note, created_by
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [
        body.lead_date || today,
        body.platform?.trim() || null,
        body.contact?.trim() || null,
        body.name?.trim() || null,
        body.city?.trim() || null,
        body.niche?.trim() || null,
        CRM_STATUSES.includes(body.status) ? body.status : 'Новый',
        body.note?.trim() || null,
        req.adminEmail,
      ]
    );
    res.status(201).json({ lead: mapLeadRow(result.rows[0]) });
  } catch (err) {
    console.error('CRM lead create:', err);
    res.status(500).json({ error: 'Не удалось добавить лид' });
  }
});

router.put('/crm/leads/:id', async (req, res) => {
  try {
    await ensureCrmSchema();
    const body = req.body || {};
    const sets = [];
    const vals = [req.params.id];
    let i = 2;

    for (const field of LEAD_FIELDS) {
      if (body[field] === undefined) continue;
      sets.push(`${field} = $${i}`);
      vals.push(body[field] === '' ? null : body[field]);
      i += 1;
    }
    if (!sets.length) return res.status(400).json({ error: 'Нет полей для обновления' });

    sets.push('updated_at = NOW()');
    const result = await db.query(
      `UPDATE admin_crm_leads SET ${sets.join(', ')} WHERE id = $1 RETURNING *`,
      vals
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'Лид не найден' });
    res.json({ lead: mapLeadRow(result.rows[0]) });
  } catch (err) {
    console.error('CRM lead update:', err);
    res.status(500).json({ error: 'Не удалось обновить лид' });
  }
});

router.delete('/crm/leads/:id', async (req, res) => {
  try {
    const result = await db.query('DELETE FROM admin_crm_leads WHERE id = $1 RETURNING id', [req.params.id]);
    if (!result.rows[0]) return res.status(404).json({ error: 'Лид не найден' });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'Не удалось удалить лид' });
  }
});

router.put('/crm/ref/:sheetKey', async (req, res) => {
  try {
    const sheetKey = req.params.sheetKey;
    if (!['scripts', 'answers', 'search'].includes(sheetKey)) {
      return res.status(400).json({ error: 'Неизвестный справочник' });
    }
    const rows = Array.isArray(req.body?.rows) ? req.body.rows : [];
    await db.query('DELETE FROM admin_crm_ref_rows WHERE sheet_key = $1', [sheetKey]);
    for (let idx = 0; idx < rows.length; idx += 1) {
      const cols = rows[idx].cols || rows[idx];
      await db.query(
        `INSERT INTO admin_crm_ref_rows (sheet_key, cols, sort_order) VALUES ($1, $2::jsonb, $3)`,
        [sheetKey, JSON.stringify(cols), idx]
      );
    }
    res.json({ ok: true });
  } catch (err) {
    console.error('CRM ref save:', err);
    res.status(500).json({ error: 'Не удалось сохранить справочник' });
  }
});

router.put('/crm/static/:sheetKey', async (req, res) => {
  try {
    const sheetKey = req.params.sheetKey;
    if (!['instruction', 'schedule', 'checklist', 'rules', 'tester_changes', 'tester_principles', 'tester_dialogue', 'tester_tech', 'tester_summary'].includes(sheetKey)) {
      return res.status(400).json({ error: 'Неизвестный раздел' });
    }
    const content = String(req.body?.content ?? '');
    await db.query(
      `INSERT INTO admin_crm_static (sheet_key, content, updated_at) VALUES ($1, $2, NOW())
       ON CONFLICT (sheet_key) DO UPDATE SET content = EXCLUDED.content, updated_at = NOW()`,
      [sheetKey, content]
    );
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'Не удалось сохранить текст' });
  }
});

router.put('/crm/analytics', async (req, res) => {
  try {
    const rows = Array.isArray(req.body?.rows) ? req.body.rows : [];
    for (const row of rows) {
      if (!row.metric_key) continue;
      await db.query(
        `UPDATE admin_crm_analytics
         SET week_value = COALESCE($2, week_value),
             month_value = COALESCE($3, month_value),
             goal_value = COALESCE($4, goal_value)
         WHERE metric_key = $1`,
        [row.metric_key, row.week_value ?? null, row.month_value ?? null, row.goal_value ?? null]
      );
    }
    const result = await db.query(`SELECT * FROM admin_crm_analytics ORDER BY sort_order ASC`);
    res.json({ analytics: result.rows });
  } catch (err) {
    res.status(500).json({ error: 'Не удалось сохранить аналитику' });
  }
});

router.post('/crm/followups', async (req, res) => {
  try {
    const body = req.body || {};
    const result = await db.query(
      `INSERT INTO admin_crm_followups (contact, touch_date, touch_number, message_text, sent, sort_order)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [
        body.contact?.trim() || '',
        body.touch_date || null,
        body.touch_number ?? null,
        body.message_text?.trim() || null,
        body.sent === '✅' ? '✅' : '⬜',
        Number(body.sort_order) || 0,
      ]
    );
    res.status(201).json({ followup: mapFollowupRow(result.rows[0]) });
  } catch (err) {
    res.status(500).json({ error: 'Не удалось добавить касание' });
  }
});

router.patch('/crm/followups/:id', async (req, res) => {
  try {
    const allowed = ['contact', 'touch_date', 'touch_number', 'message_text', 'sent', 'sort_order'];
    const body = req.body || {};
    const sets = [];
    const vals = [req.params.id];
    let i = 2;
    for (const key of allowed) {
      if (body[key] === undefined) continue;
      sets.push(`${key} = $${i}`);
      vals.push(body[key]);
      i += 1;
    }
    if (!sets.length) return res.status(400).json({ error: 'Нет полей' });
    sets.push('updated_at = NOW()');
    const result = await db.query(
      `UPDATE admin_crm_followups SET ${sets.join(', ')} WHERE id = $1 RETURNING *`,
      vals
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'Не найдено' });
    res.json({ followup: mapFollowupRow(result.rows[0]) });
  } catch (err) {
    res.status(500).json({ error: 'Не удалось обновить касание' });
  }
});

router.delete('/crm/followups/:id', async (req, res) => {
  try {
    const result = await db.query('DELETE FROM admin_crm_followups WHERE id = $1 RETURNING id', [req.params.id]);
    if (!result.rows[0]) return res.status(404).json({ error: 'Не найдено' });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'Не удалось удалить' });
  }
});

module.exports = router;
