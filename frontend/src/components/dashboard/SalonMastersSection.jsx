import { useState } from 'react';
import { Camera, Percent, Timer, UserRound } from 'lucide-react';
import Card, { CardHeader } from '../ui/Card';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Textarea from '../ui/Textarea';
import Modal from '../ui/Modal';
import { mediaUrl } from '../../lib/media';

const emptyForm = {
  id: null,
  name: '',
  last_name: '',
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

function FormSection({ title, children }) {
  return (
    <section className="rounded-xl border border-admin-border/70 bg-admin-bg/40 p-3.5 sm:p-4">
      <p className="mb-3 text-[11px] font-bold uppercase tracking-wide text-admin-textMuted">{title}</p>
      {children}
    </section>
  );
}

export default function SalonMastersSection({ masters, api, onChanged, toast }) {
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [saving, setSaving] = useState(false);

  const openEdit = (m = null) => {
    if (m) {
      setForm({
        id: m.id,
        name: m.name,
        last_name: m.last_name || '',
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
    setPhotoPreview(null);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setPhotoFile(null);
    setPhotoPreview(null);
  };

  const handlePhotoChange = (e) => {
    const file = e.target.files?.[0] || null;
    setPhotoFile(file);
    if (photoPreview) URL.revokeObjectURL(photoPreview);
    setPhotoPreview(file ? URL.createObjectURL(file) : null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) {
      toast('Укажите имя мастера', 'error');
      return;
    }
    if (!form.id) {
      if (!form.email.trim()) {
        toast('Укажите email для входа', 'error');
        return;
      }
      if (!form.password || form.password.length < 6) {
        toast('Пароль — минимум 6 символов', 'error');
        return;
      }
    }
    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        last_name: form.last_name.trim() || null,
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

      toast(form.id ? 'Сохранено' : 'Мастер добавлен');
      closeModal();
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
      const errMsg = err.response?.data?.error || '';
      if (errMsg.includes('есть будущие записи')) {
        alert(errMsg);
      } else {
        toast(errMsg || 'Ошибка', 'error');
      }
    }
  };

  const active = masters.filter((m) => m.is_active !== false);
  const photoSrc = photoPreview || (form.photo_url ? mediaUrl(form.photo_url) : null);
  const isEdit = Boolean(form.id);

  return (
    <Card>
      <CardHeader
        title="Мастера салона"
        action={
          <Button size="sm" onClick={() => openEdit()}>
            + Добавить
          </Button>
        }
      />
      <p className="mb-4 text-sm text-admin-textSecondary">
        У каждого — своё расписание, услуги и вход в кабинет.
      </p>
      {active.length === 0 ? (
        <p className="py-6 text-center text-sm text-admin-textMuted">Добавьте хотя бы одного мастера</p>
      ) : (
        <ul className="space-y-3">
          {active.map((m) => (
            <li
              key={m.id}
              className="flex items-center gap-4 rounded-xl border border-admin-border/70 bg-white p-3 transition hover:border-violet-200/80"
            >
              <div className="h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-admin-accentSoft ring-1 ring-admin-border/60">
                {m.photo_url ? (
                  <img src={mediaUrl(m.photo_url)} alt="" className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-lg font-bold text-admin-accent">
                    {m.name?.[0]}
                  </div>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold text-admin-text">{[m.last_name, m.name].filter(Boolean).join(' ') || m.name}</p>
                {m.specialty && <p className="truncate text-xs text-admin-textMuted">{m.specialty}</p>}
                <p className="mt-1 text-[11px] text-admin-textMuted">
                  {m.slot_step_minutes} мин · {m.commission_percent ?? 0}%
                  {m.email ? ` · ${m.email}` : ''}
                </p>
              </div>
              <div className="flex shrink-0 gap-1.5">
                <Button size="sm" variant="soft" onClick={() => openEdit(m)}>
                  Изменить
                </Button>
                <Button size="sm" variant="ghost" className="!text-red-600" onClick={() => handleDelete(m)}>
                  Удалить
                </Button>
                {active.length > 1 && (
                  <Button size="sm" variant="ghost" onClick={() => handleDeactivate(m.id)}>
                    Скрыть
                  </Button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      <Modal
        open={showModal}
        onClose={closeModal}
        title={isEdit ? 'Мастер' : 'Новый мастер'}
        description={isEdit ? 'Профиль, запись и доступ в кабинет' : 'Заполните основное — остальное можно позже'}
        footer={
          <>
            <Button variant="secondary" onClick={closeModal} disabled={saving}>
              Отмена
            </Button>
            <Button type="submit" form="salon-master-form" loading={saving}>
              Сохранить
            </Button>
          </>
        }
      >
        <form id="salon-master-form" onSubmit={handleSubmit} className="space-y-3">
          <FormSection title="Профиль">
            <div className="flex gap-4">
              <label className="group relative shrink-0 cursor-pointer">
                <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-2xl bg-white ring-2 ring-admin-border/80 transition group-hover:ring-admin-accent/40">
                  {photoSrc ? (
                    <img src={photoSrc} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <UserRound className="h-7 w-7 text-admin-textMuted" strokeWidth={1.5} />
                  )}
                </div>
                <span className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full bg-admin-accent text-white shadow-md">
                  <Camera className="h-3.5 w-3.5" />
                </span>
                <input type="file" accept="image/*" className="sr-only" onChange={handlePhotoChange} />
              </label>
              <div className="min-w-0 flex-1 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <Input
                    label="Имя"
                    required
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="Анна"
                  />
                  <Input
                    label="Фамилия"
                    value={form.last_name}
                    onChange={(e) => setForm({ ...form, last_name: e.target.value })}
                    placeholder="Иванова"
                  />
                </div>
                <Input
                  label="Специализация"
                  value={form.specialty}
                  onChange={(e) => setForm({ ...form, specialty: e.target.value })}
                  placeholder="Маникюр · педикюр"
                />
              </div>
            </div>
            <div className="mt-3">
              <Textarea
                label="Описание"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                rows={2}
                placeholder="Коротко о мастере для страницы записи"
              />
            </div>
          </FormSection>

          <FormSection title="Запись">
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Шаг слотов"
                type="number"
                min={15}
                max={480}
                step={5}
                value={form.slot_step_minutes}
                onChange={(e) => setForm({ ...form, slot_step_minutes: e.target.value })}
                hint="минут"
              />
              <Input
                label="Доля мастера"
                type="number"
                min={0}
                max={100}
                value={form.commission_percent}
                onChange={(e) => setForm({ ...form, commission_percent: e.target.value })}
                hint="% от услуги"
              />
            </div>
            <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-admin-textMuted">
              <span className="inline-flex items-center gap-1 rounded-md bg-white px-2 py-1 ring-1 ring-admin-border/60">
                <Timer className="h-3 w-3" />
                Интервал записи
              </span>
              <span className="inline-flex items-center gap-1 rounded-md bg-white px-2 py-1 ring-1 ring-admin-border/60">
                <Percent className="h-3 w-3" />
                Для отчётов
              </span>
            </div>
          </FormSection>

          <FormSection title="Вход в кабинет">
            <div className="space-y-3">
              <Input
                label="Email"
                type="email"
                required={!isEdit}
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="master@example.com"
              />
              <Input
                label={isEdit ? 'Новый пароль' : 'Пароль'}
                type="password"
                required={!isEdit}
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                placeholder={isEdit ? 'Оставьте пустым, если не меняете' : 'Минимум 6 символов'}
              />
            </div>
          </FormSection>
        </form>
      </Modal>
    </Card>
  );
}
