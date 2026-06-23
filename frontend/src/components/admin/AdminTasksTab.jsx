import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ChevronRight,
  Cloud,
  Download,
  FileSpreadsheet,
  FileText,
  Folder,
  MessageSquare,
  Paperclip,
  Plus,
  Send,
  Trash2,
  Upload,
  X,
  KanbanSquare,
} from 'lucide-react';
import adminApi from '../../lib/adminApi';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Modal from '../ui/Modal';
import { formatDate, formatFileSize } from './adminFormat';

const COLUMNS = [
  {
    id: 'todo',
    label: 'К делу',
    gradient: 'from-slate-500 via-slate-600 to-zinc-600',
    surface: 'bg-slate-50/80 ring-slate-200/80',
  },
  {
    id: 'in_progress',
    label: 'В работе',
    gradient: 'from-blue-500 via-indigo-500 to-blue-600',
    surface: 'bg-blue-50/60 ring-blue-200/80',
  },
  {
    id: 'review',
    label: 'Проверка',
    gradient: 'from-amber-400 via-orange-500 to-amber-500',
    surface: 'bg-amber-50/60 ring-amber-200/80',
  },
  {
    id: 'done',
    label: 'Готово',
    gradient: 'from-emerald-400 via-teal-500 to-emerald-500',
    surface: 'bg-emerald-50/60 ring-emerald-200/80',
  },
];

const PRIORITY = {
  low: { label: 'Низкий', class: 'bg-sky-100 text-sky-700' },
  normal: { label: 'Обычный', class: 'bg-violet-100 text-violet-700' },
  high: { label: 'Высокий', class: 'bg-rose-100 text-rose-700' },
};

const DOC_ACCEPT = '.doc,.docx,.xls,.xlsx,.ppt,.pptx,.pdf,.txt,.csv,.rtf,.odt,.ods';

function fileIcon(name) {
  const ext = (name || '').split('.').pop()?.toLowerCase();
  if (['xls', 'xlsx', 'csv', 'ods'].includes(ext)) return FileSpreadsheet;
  return FileText;
}

function TaskCard({ task, column, onOpen }) {
  const pr = PRIORITY[task.priority] || PRIORITY.normal;
  return (
    <button
      type="button"
      onClick={() => onOpen(task)}
      className="group w-full text-left rounded-xl bg-white p-3 shadow-md ring-1 ring-black/5 transition hover:shadow-lg hover:ring-violet-300/60 hover:-translate-y-0.5"
    >
      <div className="flex items-start justify-between gap-2">
        <p className="font-bold text-sm text-slate-900 leading-snug line-clamp-2">{task.title}</p>
        <span className={`shrink-0 rounded-md px-1.5 py-0.5 text-[9px] font-bold uppercase ${pr.class}`}>
          {pr.label}
        </span>
      </div>
      {task.description ? (
        <p className="mt-1.5 text-xs text-slate-500 line-clamp-2 leading-relaxed">{task.description}</p>
      ) : null}
      <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
        {task.assignee_name ? (
          <span className="rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500 px-2 py-0.5 text-[10px] font-semibold text-white">
            {task.assignee_name}
          </span>
        ) : null}
        {task.comment_count > 0 ? (
          <span className="inline-flex items-center gap-0.5 rounded-full bg-blue-50 px-1.5 py-0.5 text-[10px] font-semibold text-blue-600">
            <MessageSquare size={10} />
            {task.comment_count}
          </span>
        ) : null}
        {task.attachment_count > 0 ? (
          <span className="inline-flex items-center gap-0.5 rounded-full bg-amber-50 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700">
            <Paperclip size={10} />
            {task.attachment_count}
          </span>
        ) : null}
      </div>
      <div className={`mt-2 h-0.5 rounded-full bg-gradient-to-r ${column.gradient} opacity-40 group-hover:opacity-100 transition`} />
    </button>
  );
}

function CloudPickerModal({ open, onClose, onSelect }) {
  const [folderId, setFolderId] = useState(null);
  const [breadcrumbs, setBreadcrumbs] = useState([{ id: null, name: 'Облако' }]);
  const [folders, setFolders] = useState([]);
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async (fid) => {
    setLoading(true);
    try {
      const params = fid ? `?parentId=${fid}` : '';
      const fileParams = fid ? `?folderId=${fid}` : '';
      const [foldersRes, filesRes] = await Promise.all([
        adminApi.get(`/folders${params}`),
        adminApi.get(`/files${fileParams}`),
      ]);
      setFolders(foldersRes.data.folders || []);
      setFiles(filesRes.data.files || []);
    } catch (err) {
      alert(err?.response?.data?.error || 'Не удалось загрузить облако');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) {
      setFolderId(null);
      setBreadcrumbs([{ id: null, name: 'Облако' }]);
      load(null);
    }
  }, [open, load]);

  const enterFolder = (folder) => {
    setFolderId(folder.id);
    setBreadcrumbs((prev) => [...prev, { id: folder.id, name: folder.name }]);
    load(folder.id);
  };

  const goCrumb = (idx) => {
    const crumb = breadcrumbs[idx];
    setBreadcrumbs(breadcrumbs.slice(0, idx + 1));
    setFolderId(crumb.id);
    load(crumb.id);
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Выбрать из Облака"
      description="Папки и файлы из раздела «Облако»"
      size="lg"
      footer={(
        <Button type="button" variant="secondary" onClick={onClose}>
          Отмена
        </Button>
      )}
    >
      <div className="space-y-3 px-5 pb-5">
        <div className="flex flex-wrap items-center gap-1 text-xs">
          {breadcrumbs.map((crumb, idx) => (
            <span key={crumb.id ?? 'root'} className="flex items-center gap-1">
              {idx > 0 ? <ChevronRight size={12} className="text-slate-300" /> : null}
              <button
                type="button"
                onClick={() => goCrumb(idx)}
                className="font-medium text-violet-600 hover:underline"
              >
                {crumb.name}
              </button>
            </span>
          ))}
        </div>

        {loading ? (
          <p className="text-sm text-slate-400 py-6 text-center">Загрузка…</p>
        ) : (
          <div className="max-h-72 overflow-y-auto space-y-1 rounded-xl border border-slate-200 p-2">
            {folders.map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => enterFolder(f)}
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-700 hover:bg-violet-50"
              >
                <Folder size={16} className="text-amber-500 shrink-0" />
                <span className="truncate font-medium">{f.name}</span>
                <ChevronRight size={14} className="ml-auto text-slate-300" />
              </button>
            ))}
            {files.map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => onSelect(f)}
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-emerald-50"
              >
                <FileText size={16} className="text-violet-500 shrink-0" />
                <span className="truncate font-medium text-slate-800">{f.original_name}</span>
                <span className="ml-auto text-[10px] text-slate-400 shrink-0">{formatFileSize(f.size_bytes)}</span>
              </button>
            ))}
            {!folders.length && !files.length ? (
              <p className="py-8 text-center text-sm text-slate-400">Папка пуста</p>
            ) : null}
          </div>
        )}
      </div>
    </Modal>
  );
}

function TaskDetailModal({ taskId, team, columns, onClose, onUpdated, onDeleted }) {
  const [task, setTask] = useState(null);
  const [comments, setComments] = useState([]);
  const [attachments, setAttachments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [commentText, setCommentText] = useState('');
  const [savingComment, setSavingComment] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [cloudOpen, setCloudOpen] = useState(false);
  const [savingTask, setSavingTask] = useState(false);
  const fileInputRef = useRef(null);

  const loadDetail = useCallback(async () => {
    if (!taskId) return;
    setLoading(true);
    try {
      const res = await adminApi.get(`/tasks/${taskId}`);
      setTask(res.data.task);
      setComments(res.data.comments || []);
      setAttachments(res.data.attachments || []);
    } catch (err) {
      alert(err?.response?.data?.error || 'Не удалось загрузить задачу');
      onClose();
    } finally {
      setLoading(false);
    }
  }, [taskId, onClose]);

  useEffect(() => {
    loadDetail();
  }, [loadDetail]);

  const patchTask = async (patch) => {
    setSavingTask(true);
    try {
      const res = await adminApi.patch(`/tasks/${taskId}`, patch);
      setTask(res.data.task);
      onUpdated(res.data.task);
    } catch (err) {
      alert(err?.response?.data?.error || 'Не удалось сохранить');
    } finally {
      setSavingTask(false);
    }
  };

  const sendComment = async (e) => {
    e.preventDefault();
    if (!commentText.trim()) return;
    setSavingComment(true);
    try {
      const res = await adminApi.post(`/tasks/${taskId}/comments`, { body: commentText.trim() });
      setComments((prev) => [...prev, res.data.comment]);
      setCommentText('');
      setTask((t) => (t ? { ...t, comment_count: (t.comment_count || 0) + 1 } : t));
      onUpdated({ ...task, comment_count: (task?.comment_count || 0) + 1 });
    } catch (err) {
      alert(err?.response?.data?.error || 'Не удалось отправить');
    } finally {
      setSavingComment(false);
    }
  };

  const uploadFile = async (file) => {
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file, file.name);
      fd.append('originalName', file.name);
      const res = await adminApi.post(`/tasks/${taskId}/attachments/upload`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setAttachments((prev) => [...prev, res.data.attachment]);
      setTask((t) => (t ? { ...t, attachment_count: (t.attachment_count || 0) + 1 } : t));
      onUpdated({ ...task, attachment_count: (task?.attachment_count || 0) + 1 });
    } catch (err) {
      alert(err?.response?.data?.error || 'Не удалось загрузить');
    } finally {
      setUploading(false);
    }
  };

  const linkCloudFile = async (file) => {
    try {
      const res = await adminApi.post(`/tasks/${taskId}/attachments/link`, { fileId: file.id });
      setAttachments((prev) => [...prev, res.data.attachment]);
      setCloudOpen(false);
      setTask((t) => (t ? { ...t, attachment_count: (t.attachment_count || 0) + 1 } : t));
      onUpdated({ ...task, attachment_count: (task?.attachment_count || 0) + 1 });
    } catch (err) {
      alert(err?.response?.data?.error || 'Не удалось прикрепить');
    }
  };

  const detach = async (attachmentId) => {
    try {
      await adminApi.delete(`/tasks/${taskId}/attachments/${attachmentId}`);
      setAttachments((prev) => prev.filter((a) => a.id !== attachmentId));
      setTask((t) => (t ? { ...t, attachment_count: Math.max(0, (t.attachment_count || 1) - 1) } : t));
      onUpdated({ ...task, attachment_count: Math.max(0, (task?.attachment_count || 1) - 1) });
    } catch (err) {
      alert(err?.response?.data?.error || 'Не удалось открепить');
    }
  };

  const downloadFile = async (fileId, name) => {
    try {
      const res = await adminApi.get(`/files/${fileId}/download`, { responseType: 'blob' });
      const url = URL.createObjectURL(res.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = name;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      alert('Не удалось скачать файл');
    }
  };

  const col = columns.find((c) => c.id === task?.status);

  return (
    <>
      <Modal
        open={Boolean(taskId)}
        onClose={onClose}
        title={loading ? 'Загрузка…' : task?.title}
        size="xl"
        bleed
        footer={null}
      >
        {loading || !task ? (
          <p className="p-5 text-slate-500">Загрузка…</p>
        ) : (
          <div className="flex flex-col min-h-0">
            {col ? (
              <div className={`bg-gradient-to-r ${col.gradient} px-5 py-3`}>
                <span className="inline-flex rounded-full bg-white/20 px-3 py-1 text-xs font-bold text-white backdrop-blur-sm">
                  {col.label}
                </span>
              </div>
            ) : null}

            <div className="p-5 space-y-5 overflow-y-auto max-h-[calc(90vh-8rem)]">
              <div className="grid gap-3 sm:grid-cols-3">
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Статус</label>
                  <select
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium"
                    value={task.status}
                    disabled={savingTask}
                    onChange={(e) => patchTask({ status: e.target.value })}
                  >
                    {columns.map((c) => (
                      <option key={c.id} value={c.id}>{c.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Исполнитель</label>
                  <select
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium"
                    value={task.assignee_email || ''}
                    disabled={savingTask}
                    onChange={(e) => patchTask({ assignee_email: e.target.value || null })}
                  >
                    <option value="">Не назначен</option>
                    {team.map((m) => (
                      <option key={m.email} value={m.email}>{m.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Приоритет</label>
                  <select
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium"
                    value={task.priority}
                    disabled={savingTask}
                    onChange={(e) => patchTask({ priority: e.target.value })}
                  >
                    <option value="low">Низкий</option>
                    <option value="normal">Обычный</option>
                    <option value="high">Высокий</option>
                  </select>
                </div>
              </div>

              <div className="rounded-2xl border border-violet-100 bg-white p-5 shadow-sm">
                <div className="flex flex-wrap items-baseline justify-between gap-2 mb-3">
                  <h4 className="text-sm font-semibold text-slate-800">Описание</h4>
                  <p className="text-xs text-slate-400">
                    {task.created_by_name} · {formatDate(task.created_at)}
                  </p>
                </div>
                <textarea
                  key={task.id}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/60 px-4 py-3.5 text-base leading-7 text-slate-800 placeholder:text-slate-400 focus:border-violet-300 focus:bg-white focus:outline-none focus:ring-2 focus:ring-violet-100 min-h-[10rem] resize-y"
                  defaultValue={task.description || ''}
                  placeholder="Что нужно сделать — опишите задачу подробно…"
                  onBlur={(e) => {
                    const val = e.target.value;
                    if (val !== (task.description || '')) {
                      patchTask({ description: val, title: task.title });
                    }
                  }}
                />
                <p className="mt-2.5 text-xs text-slate-400">
                  Текст сохраняется автоматически при выходе из поля
                </p>
              </div>

              <div>
                <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                  <h4 className="font-bold text-slate-900 flex items-center gap-2">
                    <Paperclip size={16} className="text-amber-500" />
                    Вложения
                  </h4>
                  <div className="flex gap-2">
                    <input
                      ref={fileInputRef}
                      type="file"
                      className="hidden"
                      accept={DOC_ACCEPT}
                      onChange={(e) => {
                        uploadFile(e.target.files?.[0]);
                        e.target.value = '';
                      }}
                    />
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      loading={uploading}
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <Upload size={14} className="mr-1" />
                      Word / Excel
                    </Button>
                    <Button type="button" size="sm" variant="secondary" onClick={() => setCloudOpen(true)}>
                      <Cloud size={14} className="mr-1" />
                      Из Облака
                    </Button>
                  </div>
                </div>
                {attachments.length === 0 ? (
                  <p className="text-sm text-slate-400 rounded-xl border border-dashed border-slate-200 py-6 text-center">
                    Нет вложений
                  </p>
                ) : (
                  <div className="space-y-2">
                    {attachments.map((att) => {
                      const Icon = fileIcon(att.original_name);
                      return (
                        <div
                          key={att.id}
                          className="flex items-center gap-3 rounded-xl bg-white px-3 py-2.5 ring-1 ring-slate-200 shadow-sm"
                        >
                          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-violet-100 to-fuchsia-100">
                            <Icon size={18} className="text-violet-600" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-semibold text-slate-900 truncate">{att.original_name}</p>
                            <p className="text-[10px] text-slate-400">
                              {formatFileSize(att.size_bytes)} · {att.attached_by_name}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => downloadFile(att.file_id, att.original_name)}
                            className="rounded-lg p-2 text-slate-400 hover:bg-violet-50 hover:text-violet-600"
                          >
                            <Download size={15} />
                          </button>
                          <button
                            type="button"
                            onClick={() => detach(att.id)}
                            className="rounded-lg p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-500"
                          >
                            <X size={15} />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div>
                <h4 className="font-bold text-slate-900 flex items-center gap-2 mb-3">
                  <MessageSquare size={16} className="text-blue-500" />
                  Комментарии
                </h4>
                <div className="space-y-2 max-h-48 overflow-y-auto mb-3">
                  {comments.length === 0 ? (
                    <p className="text-sm text-slate-400">Пока нет комментариев</p>
                  ) : (
                    comments.map((c) => (
                      <div key={c.id} className="rounded-xl bg-blue-50/80 px-3 py-2.5 ring-1 ring-blue-100">
                        <p className="text-sm text-slate-800 whitespace-pre-wrap">{c.body}</p>
                        <p className="mt-1 text-[10px] font-medium text-blue-500/80">
                          {c.author_name} · {formatDate(c.created_at)}
                        </p>
                      </div>
                    ))
                  )}
                </div>
                <form onSubmit={sendComment} className="flex gap-2">
                  <textarea
                    className="flex-1 rounded-xl border border-slate-200 px-3 py-2 text-sm resize-none"
                    rows={2}
                    placeholder="Написать комментарий…"
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                  />
                  <Button type="submit" loading={savingComment} className="self-end">
                    <Send size={16} />
                  </Button>
                </form>
              </div>
            </div>

            <div className="shrink-0 border-t border-slate-100 px-5 py-4 flex justify-between gap-2">
              <Button
                type="button"
                variant="secondary"
                className="!text-rose-600 hover:!bg-rose-50"
                onClick={async () => {
                  if (!window.confirm('Удалить задачу?')) return;
                  try {
                    await adminApi.delete(`/tasks/${taskId}`);
                    onDeleted(taskId);
                    onClose();
                  } catch (err) {
                    alert(err?.response?.data?.error || 'Не удалось удалить');
                  }
                }}
              >
                <Trash2 size={14} className="mr-1" />
                Удалить
              </Button>
              <Button type="button" variant="secondary" onClick={onClose}>
                Закрыть
              </Button>
            </div>
          </div>
        )}
      </Modal>

      <CloudPickerModal open={cloudOpen} onClose={() => setCloudOpen(false)} onSelect={linkCloudFile} />
    </>
  );
}

export default function AdminTasksTab() {
  const [tasks, setTasks] = useState([]);
  const [team, setTeam] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: '', description: '', assignee_email: '', priority: 'normal' });
  const [saving, setSaving] = useState(false);
  const [openTaskId, setOpenTaskId] = useState(null);

  const load = useCallback(async () => {
    setError('');
    try {
      const [tasksRes, teamRes] = await Promise.all([
        adminApi.get('/tasks'),
        adminApi.get('/team'),
      ]);
      setTasks(tasksRes.data.tasks || []);
      setTeam(teamRes.data.members || []);
    } catch (err) {
      setError(err?.response?.data?.error || 'Не удалось загрузить задачи');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleTaskUpdated = (updated) => {
    setTasks((prev) => prev.map((t) => (t.id === updated.id ? { ...t, ...updated } : t)));
  };

  const handleTaskDeleted = (taskId) => {
    setTasks((prev) => prev.filter((t) => t.id !== taskId));
  };

  const createTask = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) return;
    setSaving(true);
    try {
      const res = await adminApi.post('/tasks', {
        title: form.title.trim(),
        description: form.description.trim() || undefined,
        assignee_email: form.assignee_email || undefined,
        priority: form.priority,
      });
      setTasks((prev) => [res.data.task, ...prev]);
      setForm({ title: '', description: '', assignee_email: '', priority: 'normal' });
      setShowForm(false);
    } catch (err) {
      alert(err?.response?.data?.error || 'Не удалось создать задачу');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <p className="text-slate-500">Загрузка задач…</p>;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-violet-100 bg-gradient-to-r from-violet-50 via-fuchsia-50/50 to-blue-50 p-4">
        <div className="flex items-center gap-2.5">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-violet-600 shadow-sm">
            <KanbanSquare size={20} />
          </div>
          <div>
            <h2 className="font-bold text-slate-900">Задачи</h2>
            <p className="text-xs text-slate-500">Нажмите на карточку — описание, комментарии, файлы</p>
          </div>
        </div>
        <Button type="button" size="sm" onClick={() => setShowForm(true)}>
          <Plus size={14} className="mr-1" />
          Новая задача
        </Button>
      </div>

      {error ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>
      ) : null}

      {showForm ? (
        <form
          onSubmit={createTask}
          className="rounded-2xl border border-violet-200 bg-white p-5 shadow-lg shadow-violet-100/50 space-y-3"
        >
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-slate-900">Новая задача</h3>
            <button type="button" onClick={() => setShowForm(false)} className="text-slate-400 hover:text-slate-600">
              <X size={20} />
            </button>
          </div>
          <Input label="Название" required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Описание</label>
            <textarea
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
              rows={3}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Исполнитель</label>
              <select
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                value={form.assignee_email}
                onChange={(e) => setForm({ ...form, assignee_email: e.target.value })}
              >
                <option value="">Не назначен</option>
                {team.map((m) => (
                  <option key={m.email} value={m.email}>{m.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Приоритет</label>
              <select
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                value={form.priority}
                onChange={(e) => setForm({ ...form, priority: e.target.value })}
              >
                <option value="low">Низкий</option>
                <option value="normal">Обычный</option>
                <option value="high">Высокий</option>
              </select>
            </div>
          </div>
          <Button type="submit" loading={saving}>Создать</Button>
        </form>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-4">
        {COLUMNS.map((col) => {
          const colTasks = tasks.filter((t) => t.status === col.id);
          return (
            <div
              key={col.id}
              className={`rounded-2xl p-3 min-h-[280px] ring-1 ${col.surface}`}
            >
              <div className={`rounded-xl bg-gradient-to-r ${col.gradient} px-3 py-2.5 mb-3 shadow-sm`}>
                <h3 className="text-sm font-bold text-white flex items-center justify-between">
                  {col.label}
                  <span className="flex h-6 min-w-[1.5rem] items-center justify-center rounded-full bg-white/25 px-2 text-xs font-bold">
                    {colTasks.length}
                  </span>
                </h3>
              </div>
              <div className="space-y-2.5">
                {colTasks.map((task) => (
                  <TaskCard key={task.id} task={task} column={col} onOpen={(t) => setOpenTaskId(t.id)} />
                ))}
                {colTasks.length === 0 ? (
                  <p className="py-8 text-center text-xs text-slate-400">Пусто</p>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>

      <TaskDetailModal
        taskId={openTaskId}
        team={team}
        columns={COLUMNS}
        onClose={() => setOpenTaskId(null)}
        onUpdated={handleTaskUpdated}
        onDeleted={handleTaskDeleted}
      />
    </div>
  );
}
