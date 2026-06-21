import { useState } from 'react';
import Card, { CardHeader } from '../ui/Card';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Textarea from '../ui/Textarea';
import Modal from '../ui/Modal';
import { mediaUrl } from '../../lib/media';

const emptyForm = {
  id: null,
  name: '',
  specialty: '',
  description: '',
  slot_step_minutes: 60,
  sort_order: 0,
  is_active: true,
  photo_url: null,
  email: '',
  password: '',
  commission_percent: 50
};

export default function SalonMastersSection({ masters, api, onChanged, toast }) {
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [photoFile, setPhotoFile] = useState(null);
  const [saving, setSaving] = useState(false);

  const openEdit = (m = null) => {
    if (m) {
      setForm({
        id: m.id,
        name: m.name,
        specialty: m.specialty || '',
        description: m.description || '',
        slot_step_minutes: m.slot_step_minutes || 60,
        sort_order: m.sort_order || 0,
        is_active: m.is_active !== false,
        photo_url: m.photo_url,
        email: m.email || '',
        password: '',
        commission_percent: m.commission_percent ?? 50
      });
    } else {
      setForm(emptyForm);
    }
    setPhotoFile(null);
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) {
      toast('Укажите имя мастера', 'error');
      return;
    }
    if (!form.id) {
      if (!form.email.trim()) {
        toast('Укажите email для входа мастера', 'error');
        return;
      }
      if (!form.password || form.password.length < 6) {
        toast('Пароль для входа — минимум 6 символов', 'error');
        return;
      }
    }
    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        specialty: form.specialty || null,
        description: form.description || null,
        slot_step_minutes: Number(form.slot_step_minutes) || 60,
        sort_order: Number(form.sort_order) || 0,
        is_active: form.is_active,
        email: form.email.trim(),
        commission_percent: Number(form.commission_percent) || 0
      };
      if (form.password) payload.password = form.password;

      let id = form.id;
      if (id) {
        await api.put(`/master/me/salon-masters/${id}`, { ...payload, photo_url: form.photo_url });
      } else {
        const created = await api.post('/master/me/salon-masters', payload);
        id = created.data.id;
      }

      if (photoFile) {
        const fd = new FormData();
        fd.append('photo', photoFile);
        await api.post(`/master/me/salon-masters/${id}/photo`, fd, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
      }

      toast(form.id ? 'Мастер обновлён' : 'Мастер добавлен');
      setShowModal(false);
      await onChanged();
    } catch (err) {
      toast(err.response?.data?.error || 'Ошибка сохранения', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDeactivate = async (id) => {
    if (!confirm('Скрыть мастера из записи?')) return;
    try {
      await api.delete(`/master/me/salon-masters/${id}`);
      toast('Мастер скрыт');
      await onChanged();
    } catch (err) {
      toast(err.response?.data?.error || 'Ошибка', 'error');
    }
  };

  const handleDelete = async (master) => {
    const msg = `Удалить мастера «${master.name}» навсегда? Это действие нельзя отменить, все связанные записи будут удалены.`;
    if (!confirm(msg)) return;
    try {
      await api.delete(`/master/me/salon-masters/${master.id}/permanent`);
      toast('Мастер удалён');
      await onChanged();
    } catch (err) {
      const msg = err.response?.data?.error || '';
      if (msg.includes('есть будущие записи')) {
        alert(msg);
      } else {
        toast(msg || 'Ошибка', 'error');
      }
    }
  };

  const active = masters.filter((m) => m.is_active !== false);

  return (
    <Card>
      <CardHeader
        title="Мастера салона"
        action={<Button size="sm" onClick={() => openEdit()}>+ Добавить</Button>}
      />
      <p className="text-sm text-admin-textSecondary mb-4">
        У каждого мастера своё расписание, услуги, доля с услуги и отдельный вход в кабинет.
      </p>
      {active.length === 0 ? (
        <p className="text-sm text-admin-textMuted py-6 text-center">Добавьте хотя бы одного мастера</p>
      ) : (
        <ul className="space-y-3">
          {active.map((m) => (
            <li key={m.id} className="flex gap-4 items-center rounded-xl border border-admin-border p-3 bg-white">
              <div className="h-14 w-14 shrink-0 rounded-xl overflow-hidden bg-admin-accentSoft">
                {m.photo_url ? (
                  <img src={mediaUrl(m.photo_url)} alt="" className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center font-bold text-admin-accent">
                    {m.name?.[0]}
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-admin-text">{m.name}</p>
                {m.specialty && <p className="text-xs text-admin-textMuted">{m.specialty}</p>}
                <p className="text-xs text-admin-textMuted mt-1">
                  Слот: {m.slot_step_minutes} мин · Доля: {m.commission_percent ?? 0}%
                  {m.email ? ` · ${m.email}` : ''}
                </p>
              </div>
              <div className="flex gap-2 shrink-0">
                <Button size="sm" variant="secondary" onClick={() => openEdit(m)}>Изменить</Button>
                <Button size="sm" variant="ghost" onClick={() => handleDelete(m)}>Удалить</Button>
                {active.length > 1 && (
                  <Button size="sm" variant="ghost" onClick={() => handleDeactivate(m.id)}>Скрыть</Button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      <Modal open={showModal} onClose={() => setShowModal(false)} title={form.id ? 'Редактировать мастера' : 'Новый мастер'}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input label="Имя" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <Input label="Специализация" value={form.specialty} onChange={(e) => setForm({ ...form, specialty: e.target.value })} />
          <Textarea label="Описание" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} />
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Шаг слотов (мин)"
              type="number"
              min={15}
              max={480}
              step={5}
              value={form.slot_step_minutes}
              onChange={(e) => setForm({ ...form, slot_step_minutes: e.target.value })}
            />
            <Input
              label="Доля мастера, %"
              type="number"
              min={0}
              max={100}
              value={form.commission_percent}
              onChange={(e) => setForm({ ...form, commission_percent: e.target.value })}
            />
          </div>
          <Input
            label="Email для входа"
            type="email"
            required={!form.id}
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
          />
          <Input
            label={form.id ? 'Новый пароль (необязательно)' : 'Пароль для входа'}
            type="password"
            required={!form.id}
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            hint="Минимум 6 символов"
          />
          <div>
            <label className="block text-sm font-medium text-admin-text mb-1">Фото</label>
            <input type="file" accept="image/*" onChange={(e) => setPhotoFile(e.target.files?.[0] || null)} />
          </div>
          <Button type="submit" loading={saving} className="w-full">Сохранить</Button>
        </form>
      </Modal>
    </Card>
  );
}
