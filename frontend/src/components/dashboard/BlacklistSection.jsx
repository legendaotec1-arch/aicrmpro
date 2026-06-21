import { useEffect, useState } from 'react';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Modal from '../ui/Modal';
import EmptyState from '../ui/EmptyState';
import { ShieldOff, Trash2, UserX } from 'lucide-react';

export default function BlacklistSection({
  api,
  toast,
  embedded = false,
  onLoaded,
  showAddModal,
  onShowAddModalChange
}) {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [internalShowAdd, setInternalShowAdd] = useState(false);
  const [addForm, setAddForm] = useState({ name: '', phone: '', reason: '' });
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  const addOpen = showAddModal ?? internalShowAdd;
  const setAddOpen = onShowAddModalChange ?? setInternalShowAdd;

  useEffect(() => {
    load();
  }, []);

  async function load() {
    try {
      const res = await api.get('/master/me/blacklist');
      setList(res.data);
      onLoaded?.(res.data);
    } catch {
      toast('Не удалось загрузить чёрный список', 'error');
      onLoaded?.([]);
    } finally {
      setLoading(false);
    }
  }

  async function handleAdd() {
    if (!addForm.reason.trim()) {
      toast('Укажите причину', 'error');
      return;
    }
    setSaving(true);
    try {
      await api.post('/master/me/blacklist', {
        name: addForm.name.trim() || null,
        phone: addForm.phone.trim() || null,
        reason: addForm.reason.trim()
      });
      toast('Клиент добавлен в чёрный список');
      setAddForm({ name: '', phone: '', reason: '' });
      setAddOpen(false);
      load();
    } catch (err) {
      toast(err.response?.data?.error || 'Ошибка', 'error');
    } finally {
      setSaving(false);
    }
  }

  async function handleRemove(id) {
    setDeletingId(id);
    try {
      await api.delete(`/master/me/blacklist/${id}`);
      toast('Клиент удалён из чёрного списка');
      load();
    } catch {
      toast('Ошибка при удалении', 'error');
    } finally {
      setDeletingId(null);
    }
  }

  const addModal = (
    <Modal
      open={addOpen}
      onClose={() => setAddOpen(false)}
      title="Добавить в чёрный список"
      footer={
        <>
          <Button variant="secondary" onClick={() => setAddOpen(false)}>Отмена</Button>
          <Button onClick={handleAdd} loading={saving} disabled={!addForm.reason.trim()}>
            Добавить
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <p className="text-sm text-admin-textMuted">
          Клиент не сможет записываться онлайн. Он не узнает, что попал в чёрный список.
        </p>
        <Input
          label="Имя клиента"
          value={addForm.name}
          onChange={(e) => setAddForm({ ...addForm, name: e.target.value })}
          placeholder="Необязательно"
        />
        <Input
          label="Телефон"
          value={addForm.phone}
          onChange={(e) => setAddForm({ ...addForm, phone: e.target.value })}
          placeholder="+7 (999) 123-45-67"
        />
        <div>
          <label className="label-field">Причина *</label>
          <textarea
            value={addForm.reason}
            onChange={(e) => setAddForm({ ...addForm, reason: e.target.value })}
            placeholder="Например: неоднократные срывы записей"
            rows={3}
            className="w-full px-3.5 py-2.5 rounded-xl border border-admin-border bg-white text-admin-text text-sm placeholder:text-admin-textMuted focus:outline-none focus:border-admin-accent focus:ring-2 focus:ring-admin-accent/20 transition shadow-sm resize-none"
          />
        </div>
      </div>
    </Modal>
  );

  if (loading) {
    return embedded ? (
      <div className="flex items-center justify-center py-16">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-admin-accent border-t-transparent" />
      </div>
    ) : (
      <div className="flex items-center justify-center py-12">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-admin-accent border-t-transparent" />
      </div>
    );
  }

  const listContent =
    list.length === 0 ? (
      <EmptyState
        icon={embedded ? '🚫' : <ShieldOff size={32} className="text-admin-textMuted" />}
        title="Чёрный список пуст"
        description="Заблокированные клиенты не смогут записаться онлайн"
      />
    ) : (
      <ul className="divide-y divide-admin-border/80">
        {list.map((item) => (
          <li key={item.id}>
            <div className="flex items-center gap-3 px-3 py-3 sm:px-4 hover:bg-red-50/30 transition">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-red-100 bg-red-50">
                <UserX size={16} className="text-red-500" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-admin-text">{item.name || 'Без имени'}</p>
                <p className="truncate text-xs tabular-nums text-admin-textSecondary">
                  {item.phone || item.client_phone || '—'}
                </p>
                <p className="mt-0.5 truncate text-xs italic text-red-600">«{item.reason}»</p>
              </div>
              <button
                type="button"
                onClick={() => handleRemove(item.id)}
                disabled={deletingId === item.id}
                className="shrink-0 rounded-lg p-2 text-admin-textMuted transition hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                title="Убрать из списка"
              >
                <Trash2 size={16} />
              </button>
            </div>
          </li>
        ))}
      </ul>
    );

  if (embedded) {
    return (
      <>
        {listContent}
        {addModal}
      </>
    );
  }

  return (
    <>
      <div className="rounded-xl border border-admin-border bg-white p-4 shadow-sm">
        <div className="mb-4 flex items-start justify-between gap-3 border-b border-admin-border pb-4">
          <div>
            <h2 className="text-base font-bold text-admin-text">Чёрный список</h2>
            <p className="text-sm text-admin-textSecondary">Клиенты, которые не могут записаться онлайн</p>
          </div>
          <Button onClick={() => setAddOpen(true)}>+ Добавить</Button>
        </div>
        {listContent}
      </div>
      {addModal}
    </>
  );
}
