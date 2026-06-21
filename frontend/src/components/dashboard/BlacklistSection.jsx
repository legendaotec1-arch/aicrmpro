import { useEffect, useState } from 'react';
import Card, { CardHeader } from '../ui/Card';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Modal from '../ui/Modal';
import EmptyState from '../ui/EmptyState';
import { ShieldOff, Trash2, Plus, UserX } from 'lucide-react';

export default function BlacklistSection({ api, toast }) {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [addForm, setAddForm] = useState({ name: '', phone: '', reason: '' });
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    try {
      const res = await api.get('/master/me/blacklist');
      setList(res.data);
    } catch {
      toast('Не удалось загрузить чёрный список', 'error');
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
      setShowAddModal(false);
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

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin w-6 h-6 border-2 border-admin-accent border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <>
      <Card>
        <CardHeader
          title="Чёрный список"
          description="Клиенты, которые не могут записаться онлайн"
          action={<Button onClick={() => setShowAddModal(true)}>+ Добавить</Button>}
        />
        {list.length === 0 ? (
          <EmptyState
            icon={<ShieldOff size={32} className="text-admin-textMuted" />}
            title="Чёрный список пуст"
            description="Добавьте клиентов, которые не могут записываться онлайн"
          />
        ) : (
          <div className="divide-y divide-gray-100">
            {list.map((item) => (
              <div key={item.id} className="flex items-center gap-3 px-4 py-3 hover:bg-admin-bg transition">
                <div className="w-9 h-9 rounded-full bg-red-50 border border-red-100 flex items-center justify-center shrink-0">
                  <UserX size={16} className="text-red-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-admin-text truncate">{item.name || 'Без имени'}</p>
                  <p className="text-xs text-admin-textMuted truncate">{item.phone || item.client_phone || '—'}</p>
                  <p className="text-xs text-red-500 mt-0.5 italic">«{item.reason}»</p>
                </div>
                <button
                  onClick={() => handleRemove(item.id)}
                  disabled={deletingId === item.id}
                  className="shrink-0 p-2 rounded-lg text-admin-textMuted hover:text-red-500 hover:bg-red-50 transition disabled:opacity-50"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Modal
        open={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="Добавить в чёрный список"
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowAddModal(false)}>Отмена</Button>
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
    </>
  );
}
