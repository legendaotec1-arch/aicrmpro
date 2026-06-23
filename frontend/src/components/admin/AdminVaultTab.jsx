import { useCallback, useEffect, useState } from 'react';
import {
  Copy,
  Check,
  Eye,
  EyeOff,
  ExternalLink,
  KeyRound,
  Pencil,
  Plus,
  Trash2,
  Shield,
} from 'lucide-react';
import adminApi from '../../lib/adminApi';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Modal from '../ui/Modal';
import { useToast } from '../../context/ToastContext';
import { formatDate } from './adminFormat';

const EMPTY_FORM = { title: '', url: '', login: '', password: '' };

function CopyRow({ label, value, secret = false, link = false }) {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);
  const [visible, setVisible] = useState(false);

  if (!value) return null;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      toast(`${label} скопирован`);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      toast('Не удалось скопировать', 'error');
    }
  };

  const display = secret && !visible ? '••••••••••••' : value;

  return (
    <div className="rounded-xl border border-slate-100 bg-slate-50/80 px-3 py-2.5">
      <div className="flex items-center justify-between gap-2 mb-1">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{label}</span>
        <div className="flex items-center gap-0.5">
          {secret ? (
            <button
              type="button"
              onClick={() => setVisible((v) => !v)}
              className="rounded-lg p-1.5 text-slate-400 hover:bg-white hover:text-slate-700"
              title={visible ? 'Скрыть' : 'Показать'}
            >
              {visible ? <EyeOff size={14} /> : <Eye size={14} />}
            </button>
          ) : null}
          {link ? (
            <a
              href={value}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-lg p-1.5 text-slate-400 hover:bg-white hover:text-violet-600"
              title="Открыть"
            >
              <ExternalLink size={14} />
            </a>
          ) : null}
          <button
            type="button"
            onClick={copy}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-white hover:text-violet-600"
            title={`Копировать ${label.toLowerCase()}`}
          >
            {copied ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
          </button>
        </div>
      </div>
      <p className={`text-sm break-all ${secret ? 'font-mono' : 'text-slate-800'}`}>{display}</p>
    </div>
  );
}

function VaultCard({ entry, onEdit, onDelete }) {
  return (
    <article className="group relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm transition hover:border-violet-200 hover:shadow-md">
      <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-violet-500 via-fuchsia-500 to-indigo-500 opacity-80" />
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-100 to-indigo-100 text-violet-700">
            <KeyRound size={20} />
          </div>
          <div className="min-w-0">
            <h3 className="font-bold text-slate-900 truncate">{entry.title}</h3>
            <p className="text-xs text-slate-400 mt-0.5">
              {entry.updated_by_name || entry.created_by_name} · {formatDate(entry.updated_at || entry.created_at)}
            </p>
          </div>
        </div>
        <div className="flex shrink-0 gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition">
          <button
            type="button"
            onClick={() => onEdit(entry)}
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-violet-700"
          >
            <Pencil size={15} />
          </button>
          <button
            type="button"
            onClick={() => onDelete(entry)}
            className="rounded-lg p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
          >
            <Trash2 size={15} />
          </button>
        </div>
      </div>

      <div className="space-y-2">
        <CopyRow label="URL" value={entry.url} link />
        <CopyRow label="Логин" value={entry.login} />
        <CopyRow label="Пароль" value={entry.password} secret />
      </div>
    </article>
  );
}

export default function AdminVaultTab() {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    setError('');
    try {
      const res = await adminApi.get('/vault');
      setEntries(res.data.entries || []);
    } catch (err) {
      setError(err?.response?.data?.error || 'Не удалось загрузить доступы');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setModalOpen(true);
  };

  const openEdit = (entry) => {
    setEditing(entry);
    setForm({
      title: entry.title || '',
      url: entry.url || '',
      login: entry.login || '',
      password: entry.password || '',
    });
    setModalOpen(true);
  };

  const save = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) return;
    setSaving(true);
    try {
      const payload = {
        title: form.title.trim(),
        url: form.url.trim(),
        login: form.login.trim(),
        password: form.password,
      };
      if (editing) {
        const res = await adminApi.patch(`/vault/${editing.id}`, payload);
        setEntries((prev) =>
          prev.map((item) => (item.id === editing.id ? res.data.entry : item)).sort((a, b) => a.title.localeCompare(b.title))
        );
      } else {
        const res = await adminApi.post('/vault', payload);
        setEntries((prev) => [...prev, res.data.entry].sort((a, b) => a.title.localeCompare(b.title)));
      }
      setModalOpen(false);
    } catch (err) {
      alert(err?.response?.data?.error || 'Не удалось сохранить');
    } finally {
      setSaving(false);
    }
  };

  const executeDelete = async () => {
    if (!confirmDelete) return;
    setDeleting(true);
    try {
      await adminApi.delete(`/vault/${confirmDelete.id}`);
      setEntries((prev) => prev.filter((e) => e.id !== confirmDelete.id));
      setConfirmDelete(null);
    } catch (err) {
      alert(err?.response?.data?.error || 'Не удалось удалить');
    } finally {
      setDeleting(false);
    }
  };

  if (loading) return <p className="text-slate-500">Загрузка…</p>;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4 rounded-2xl border border-violet-100 bg-gradient-to-br from-violet-50 to-indigo-50 p-5">
        <div className="flex gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-violet-600 shadow-sm">
            <Shield size={22} />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900">Общие доступы</h2>
            <p className="text-sm text-slate-600 mt-0.5">Хранилище логинов и паролей</p>
          </div>
        </div>
        <Button type="button" onClick={openCreate}>
          <Plus size={16} className="mr-1.5" />
          Добавить
        </Button>
      </div>

      {error ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>
      ) : null}

      {entries.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-6 py-16 text-center">
          <KeyRound size={40} className="mx-auto text-slate-300 mb-3" />
          <p className="text-slate-500">Пока нет сохранённых доступов</p>
          <Button type="button" className="mt-4" onClick={openCreate}>
            Добавить первый
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {entries.map((entry) => (
            <VaultCard
              key={entry.id}
              entry={entry}
              onEdit={openEdit}
              onDelete={setConfirmDelete}
            />
          ))}
        </div>
      )}

      <Modal
        open={modalOpen}
        onClose={() => !saving && setModalOpen(false)}
        title={editing ? 'Редактировать доступ' : 'Новый доступ'}
        description="Например: Beget сервер — укажите ссылку, логин и пароль"
        size="md"
        footer={(
          <>
            <Button type="button" variant="secondary" onClick={() => setModalOpen(false)} disabled={saving}>
              Отмена
            </Button>
            <Button type="submit" form="vault-form" loading={saving}>
              {editing ? 'Сохранить' : 'Добавить'}
            </Button>
          </>
        )}
      >
        <form id="vault-form" onSubmit={save} className="space-y-4">
          <Input
            label="Название"
            required
            placeholder="Beget сервер"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
          />
          <Input
            label="URL"
            placeholder="https://cp.beget.com"
            value={form.url}
            onChange={(e) => setForm({ ...form, url: e.target.value })}
          />
          <Input
            label="Логин"
            placeholder="admin@example.com"
            value={form.login}
            onChange={(e) => setForm({ ...form, login: e.target.value })}
          />
          <Input
            label="Пароль"
            type="text"
            placeholder="••••••••"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
          />
        </form>
      </Modal>

      <Modal
        open={Boolean(confirmDelete)}
        onClose={() => !deleting && setConfirmDelete(null)}
        title="Удалить доступ?"
        description={`Запись «${confirmDelete?.title}» будет удалена безвозвратно.`}
        size="sm"
        footer={(
          <>
            <Button type="button" variant="secondary" onClick={() => setConfirmDelete(null)} disabled={deleting}>
              Отмена
            </Button>
            <Button type="button" onClick={executeDelete} loading={deleting} className="!bg-rose-600 hover:!bg-rose-700">
              Удалить
            </Button>
          </>
        )}
      />
    </div>
  );
}
