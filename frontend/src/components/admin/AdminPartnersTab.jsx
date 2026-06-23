import { useCallback, useEffect, useState } from 'react';
import { Handshake, Upload, Wallet, Users, CheckCircle, XCircle, FileText, Plus, Pencil, Trash2 } from 'lucide-react';
import adminApi from '../../lib/adminApi';
import Button from '../ui/Button';
import Input from '../ui/Input';
import { PageLoader } from '../ui/Spinner';

function fmtRub(n) {
  return new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB' }).format(Number(n || 0));
}

export default function AdminPartnersTab() {
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState(null);
  const [withdrawals, setWithdrawals] = useState([]);
  const [assets, setAssets] = useState([]);
  const [postTemplates, setPostTemplates] = useState([]);
  const [postTemplatesMax, setPostTemplatesMax] = useState(10);
  const [postForm, setPostForm] = useState({ title: '', body: '', sort_order: 0 });
  const [editingPostId, setEditingPostId] = useState(null);
  const [savingPost, setSavingPost] = useState(false);
  const [uploadForm, setUploadForm] = useState({ title: '', file_type: 'banner', description: '' });
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [processingId, setProcessingId] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [sumRes, wRes, aRes, pRes] = await Promise.all([
        adminApi.get('/partners/summary'),
        adminApi.get('/partners/withdrawals?status=pending'),
        adminApi.get('/partners/assets'),
        adminApi.get('/partners/post-templates'),
      ]);
      setSummary(sumRes.data);
      setWithdrawals(wRes.data.withdrawals || []);
      setAssets(aRes.data.assets || []);
      setPostTemplates(pRes.data.templates || []);
      setPostTemplatesMax(pRes.data.max || 10);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const completeWithdrawal = async (id) => {
    setProcessingId(id);
    try {
      await adminApi.post(`/partners/withdrawals/${id}/complete`);
      await load();
    } finally {
      setProcessingId(null);
    }
  };

  const rejectWithdrawal = async (id) => {
    const note = window.prompt('Причина отклонения (необязательно):');
    if (note === null) return;
    setProcessingId(id);
    try {
      await adminApi.post(`/partners/withdrawals/${id}/reject`, { note });
      await load();
    } finally {
      setProcessingId(null);
    }
  };

  const activePostCount = postTemplates.filter((t) => t.is_active !== false).length;

  const resetPostForm = () => {
    setPostForm({ title: '', body: '', sort_order: 0 });
    setEditingPostId(null);
  };

  const savePostTemplate = async (e) => {
    e.preventDefault();
    if (!postForm.title.trim() || !postForm.body.trim()) return;
    setSavingPost(true);
    try {
      if (editingPostId) {
        await adminApi.put(`/partners/post-templates/${editingPostId}`, {
          title: postForm.title,
          body: postForm.body,
          sort_order: Number(postForm.sort_order) || 0,
          is_active: true,
        });
      } else {
        await adminApi.post('/partners/post-templates', {
          title: postForm.title,
          body: postForm.body,
          sort_order: Number(postForm.sort_order) || 0,
        });
      }
      resetPostForm();
      await load();
    } catch (err) {
      window.alert(err?.response?.data?.error || 'Ошибка сохранения');
    } finally {
      setSavingPost(false);
    }
  };

  const editPostTemplate = (t) => {
    setEditingPostId(t.id);
    setPostForm({ title: t.title, body: t.body, sort_order: t.sort_order || 0 });
  };

  const deletePostTemplate = async (id) => {
    if (!window.confirm('Удалить этот пост? Партнёры больше не увидят его.')) return;
    try {
      await adminApi.delete(`/partners/post-templates/${id}`);
      if (editingPostId === id) resetPostForm();
      await load();
    } catch (err) {
      window.alert(err?.response?.data?.error || 'Ошибка удаления');
    }
  };

  const uploadAsset = async (e) => {
    e.preventDefault();
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('title', uploadForm.title);
      fd.append('file_type', uploadForm.file_type);
      fd.append('description', uploadForm.description);
      await adminApi.post('/partners/assets', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      setFile(null);
      setUploadForm({ title: '', file_type: 'banner', description: '' });
      await load();
    } finally {
      setUploading(false);
    }
  };

  if (loading) return <PageLoader />;

  return (
    <div className="space-y-8">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-violet-600">Партнёры</p>
        <h2 className="text-2xl font-bold text-slate-900">Партнёрская программа</h2>
      </div>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: 'Партнёров', value: summary?.partners_count, icon: Handshake },
          { label: 'На балансах', value: fmtRub(summary?.total_balance), icon: Wallet },
          { label: 'Заявок на вывод', value: summary?.pending_withdrawals, icon: Wallet },
          { label: 'Мастеров по реф.', value: summary?.referred_masters, icon: Users },
        ].map(({ label, value, icon: Icon }) => (
          <div key={label} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <Icon size={18} className="text-violet-500" />
            <p className="mt-2 text-sm text-slate-500">{label}</p>
            <p className="text-2xl font-bold text-slate-900">{value ?? '—'}</p>
          </div>
        ))}
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-5 py-4">
          <h3 className="font-semibold text-slate-900">Заявки на вывод</h3>
          <p className="text-xs text-slate-500">После перевода на карту нажмите «Выполнено» — сумма уйдёт в расходы кассы</p>
        </div>
        {withdrawals.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-slate-400">Нет ожидающих заявок</p>
        ) : (
          <ul className="divide-y divide-slate-50">
            {withdrawals.map((w) => (
              <li key={w.id} className="flex flex-wrap items-start justify-between gap-4 px-5 py-4">
                <div>
                  <p className="font-semibold text-slate-900">{fmtRub(w.amount)}</p>
                  <p className="text-sm text-slate-600">{w.full_name} · {w.bank_name}</p>
                  <p className="text-sm text-slate-500">Карта: {w.card_number} ({w.card_masked})</p>
                  <p className="text-xs text-slate-400 mt-1">{w.partner_account_name} · {w.partner_email}</p>
                  <p className="text-xs text-slate-400">{new Date(w.created_at).toLocaleString('ru-RU')}</p>
                </div>
                <div className="flex gap-2">
                  <Button type="button" size="sm" loading={processingId === w.id} onClick={() => completeWithdrawal(w.id)}>
                    <CheckCircle size={14} className="mr-1" /> Выполнено
                  </Button>
                  <Button type="button" size="sm" variant="secondary" onClick={() => rejectWithdrawal(w.id)}>
                    <XCircle size={14} className="mr-1" /> Отклонить
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="font-semibold text-slate-900 flex items-center gap-2">
              <FileText size={18} /> Готовые посты для публикации
            </h3>
            <p className="mt-1 text-xs text-slate-500">
              До {postTemplatesMax} шаблонов. Партнёры копируют текст в мессенджеры и каналы.
              Используйте <code className="rounded bg-slate-100 px-1">{'{{referral_link}}'}</code> — подставится реферальная ссылка.
            </p>
          </div>
          <span className="rounded-full bg-violet-50 px-3 py-1 text-xs font-semibold text-violet-700">
            {activePostCount} / {postTemplatesMax}
          </span>
        </div>

        <form onSubmit={savePostTemplate} className="mt-4 space-y-4">
          <div className="grid gap-4 sm:grid-cols-[1fr_120px]">
            <Input
              label="Название (для себя)"
              required
              value={postForm.title}
              onChange={(e) => setPostForm({ ...postForm, title: e.target.value })}
              placeholder="Например: Пост для Telegram"
            />
            <Input
              label="Порядок"
              type="number"
              min={0}
              value={postForm.sort_order}
              onChange={(e) => setPostForm({ ...postForm, sort_order: e.target.value })}
            />
          </div>
          <label className="block text-sm">
            <span className="mb-1 block font-medium text-slate-700">Текст поста</span>
            <textarea
              required
              rows={6}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
              value={postForm.body}
              onChange={(e) => setPostForm({ ...postForm, body: e.target.value })}
              placeholder={'Woner — онлайн-запись для мастеров.\n\nРегистрация: {{referral_link}}'}
            />
          </label>
          <div className="flex flex-wrap gap-2">
            <Button
              type="submit"
              loading={savingPost}
              disabled={!editingPostId && activePostCount >= postTemplatesMax}
            >
              {editingPostId ? (
                <><Pencil size={14} className="mr-1" /> Сохранить</>
              ) : (
                <><Plus size={14} className="mr-1" /> Добавить пост</>
              )}
            </Button>
            {editingPostId ? (
              <Button type="button" variant="secondary" onClick={resetPostForm}>Отмена</Button>
            ) : null}
          </div>
        </form>

        {postTemplates.filter((t) => t.is_active !== false).length > 0 ? (
          <ul className="mt-6 space-y-3">
            {postTemplates.filter((t) => t.is_active !== false).map((t) => (
              <li key={t.id} className="rounded-xl border border-slate-100 bg-slate-50 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-slate-900">{t.title}</p>
                    <p className="mt-2 whitespace-pre-wrap text-sm text-slate-600">{t.body}</p>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <Button type="button" size="sm" variant="secondary" onClick={() => editPostTemplate(t)}>
                      <Pencil size={14} />
                    </Button>
                    <Button type="button" size="sm" variant="secondary" onClick={() => deletePostTemplate(t.id)}>
                      <Trash2 size={14} />
                    </Button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-6 text-sm text-slate-400">Пока нет готовых постов — добавьте первый шаблон выше</p>
        )}
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="font-semibold text-slate-900 flex items-center gap-2"><Upload size={18} /> Материалы для партнёров</h3>
        <form onSubmit={uploadAsset} className="mt-4 grid gap-4 sm:grid-cols-2">
          <Input label="Название" required value={uploadForm.title} onChange={(e) => setUploadForm({ ...uploadForm, title: e.target.value })} />
          <label className="block text-sm">
            <span className="mb-1 block font-medium text-slate-700">Тип</span>
            <select
              className="w-full rounded-xl border border-slate-200 px-3 py-2"
              value={uploadForm.file_type}
              onChange={(e) => setUploadForm({ ...uploadForm, file_type: e.target.value })}
            >
              <option value="banner">Баннер</option>
              <option value="logo">Логотип</option>
              <option value="document">Документ</option>
              <option value="other">Другое</option>
            </select>
          </label>
          <Input label="Описание" className="sm:col-span-2" value={uploadForm.description} onChange={(e) => setUploadForm({ ...uploadForm, description: e.target.value })} />
          <input type="file" className="sm:col-span-2 text-sm" onChange={(e) => setFile(e.target.files?.[0] || null)} />
          <Button type="submit" loading={uploading} disabled={!file}>Загрузить</Button>
        </form>
        {assets.length > 0 ? (
          <ul className="mt-6 space-y-2 text-sm">
            {assets.filter((a) => a.is_active !== false).map((a) => (
              <li key={a.id} className="flex justify-between rounded-lg bg-slate-50 px-3 py-2">
                <span>{a.title} <span className="text-slate-400">({a.file_type})</span></span>
                <span className="text-slate-400">{a.file_name}</span>
              </li>
            ))}
          </ul>
        ) : null}
      </section>
    </div>
  );
}
