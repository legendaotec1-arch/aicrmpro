import { useState } from 'react';
import { Camera, Plus, UserRound, X } from 'lucide-react';
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
  commission_percent: 50
};

function Field({ label, children }) {
  return (
    <div>
      <p className="mb-2 text-sm font-medium text-admin-text">{label}</p>
      {children}
    </div>
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
    if (!form.id && !form.email.trim()) {
      toast('Укажите email для входа', 'error');
      return;
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
    <div className="overview-shell -mx-1 space-y-4 rounded-[1.75rem] px-1 pb-2">
      <section className="relative overflow-hidden rounded-[1.35rem] bg-gradient-to-br from-[#5B4FCF] via-[#6A5ACD] to-[#4338CA] px-4 py-5 text-white shadow-xl shadow-violet-500/20 sm:px-5">
        <div className="pointer-events-none absolute -right-8 -top-8 h-28 w-28 rounded-full bg-white/10 blur-2xl" />
        <div className="relative flex items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/70">Команда</p>
            <h1 className="mt-1 font-display text-2xl font-bold">{active.length}</h1>
            <p className="mt-1 text-sm text-white/75">
              {active.length
                ? 'мастеров в салоне · своё расписание и услуги'
                : 'добавьте первого мастера'}
            </p>
          </div>
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white/15 ring-1 ring-white/20">
            <UserRound className="h-5 w-5" />
          </div>
        </div>
        <Button
          size="sm"
          onClick={() => openEdit()}
          className="relative mt-4 w-full !bg-white !text-violet-700 hover:!bg-violet-50 sm:w-auto"
        >
          <Plus className="h-4 w-4" />
          Добавить мастера
        </Button>
      </section>

      <section className="overflow-hidden rounded-[1.35rem] bg-white shadow-[0_8px_30px_rgba(15,23,42,0.05)] ring-1 ring-slate-200/70">
        <div className="border-b border-slate-100 px-4 py-3.5 sm:px-5">
          <h2 className="text-base font-bold text-admin-text">Мастера салона</h2>
          <p className="mt-0.5 text-xs text-admin-textMuted">У каждого — расписание, услуги и вход в кабинет</p>
        </div>

        <div className="p-3 sm:p-4">
          {active.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-200 py-10 text-center">
              <UserRound className="mx-auto h-8 w-8 text-admin-textMuted/50" />
              <p className="mt-2 text-sm font-medium text-admin-text">Пока никого нет</p>
              <p className="mt-1 text-xs text-admin-textMuted">Нажмите «Добавить мастера» выше</p>
            </div>
          ) : (
            <ul className="space-y-3">
              {active.map((m) => (
                <li key={m.id}>
                  <article className="overflow-hidden rounded-[1.1rem] bg-white ring-1 ring-slate-200/80">
                    <div className="flex items-start gap-3 p-3.5">
                      <div className="h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-violet-50 ring-1 ring-slate-200/80">
                        {m.photo_url ? (
                          <img src={mediaUrl(m.photo_url)} alt="" className="h-full w-full object-cover" />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-lg font-bold text-admin-accent">
                            {m.name?.[0]}
                          </div>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-admin-text">
                          {[m.last_name, m.name].filter(Boolean).join(' ') || m.name}
                        </p>
                        {m.specialty ? (
                          <p className="mt-0.5 text-xs text-admin-textMuted">{m.specialty}</p>
                        ) : null}
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          <span className="rounded-lg bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-700">
                            {m.slot_step_minutes} мин
                          </span>
                          <span className="rounded-lg bg-violet-100 px-2 py-0.5 text-[11px] font-semibold text-violet-700">
                            {m.commission_percent ?? 0}%
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-1 border-t border-slate-100 bg-slate-50/60 px-2 py-1.5">
                      <button
                        type="button"
                        onClick={() => openEdit(m)}
                        className="rounded-xl py-2 text-[11px] font-semibold text-admin-accent transition hover:bg-white active:scale-[0.98]"
                      >
                        Изменить
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(m)}
                        className="rounded-xl py-2 text-[11px] font-semibold text-red-600 transition hover:bg-red-50 active:scale-[0.98]"
                      >
                        Удалить
                      </button>
                      {active.length > 1 ? (
                        <button
                          type="button"
                          onClick={() => handleDeactivate(m.id)}
                          className="rounded-xl py-2 text-[11px] font-semibold text-admin-textSecondary transition hover:bg-white active:scale-[0.98]"
                        >
                          Скрыть
                        </button>
                      ) : (
                        <span className="rounded-xl py-2 text-center text-[11px] text-transparent select-none">·</span>
                      )}
                    </div>
                  </article>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <Modal open={showModal} onClose={closeModal} size="md" unified footer={null}>
        <form id="salon-master-form" onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col bg-white">
          <div className="flex shrink-0 items-start justify-between gap-3 px-4 pb-3 pt-4 sm:px-5">
            <div>
              <h2 className="text-lg font-bold text-admin-text">{isEdit ? 'Мастер' : 'Новый мастер'}</h2>
              <p className="mt-1 text-sm text-admin-textMuted">
                {isEdit ? 'Профиль, запись и доступ' : 'Имя и email — остальное можно позже'}
              </p>
            </div>
            <button
              type="button"
              onClick={closeModal}
              className="shrink-0 rounded-lg p-2 text-admin-textMuted transition hover:bg-slate-100 hover:text-admin-text"
              aria-label="Закрыть"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="min-h-0 flex-1 space-y-5 overflow-y-auto overscroll-contain px-4 pb-4 sm:px-5">
            <Field label="Фото и имя">
              <div className="flex gap-3">
                <label className="group relative shrink-0 cursor-pointer">
                  <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-2xl bg-slate-100 ring-1 ring-slate-200 transition group-hover:ring-admin-accent/40">
                    {photoSrc ? (
                      <img src={photoSrc} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <UserRound className="h-7 w-7 text-admin-textMuted" strokeWidth={1.5} />
                    )}
                  </div>
                  <span className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full bg-admin-accent text-white shadow">
                    <Camera className="h-3.5 w-3.5" />
                  </span>
                  <input type="file" accept="image/*" className="sr-only" onChange={handlePhotoChange} />
                </label>
                <div className="min-w-0 flex-1 space-y-3">
                  <div className="grid grid-cols-2 gap-2">
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
                    placeholder="Маникюр"
                  />
                </div>
              </div>
            </Field>

            <Field label="Описание">
              <Textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                rows={2}
                placeholder="Коротко для страницы записи"
              />
            </Field>

            <Field label="Запись и доля">
              <div className="grid grid-cols-2 gap-2">
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
            </Field>

            <Field label="Вход в кабинет">
              <Input
                label="Email"
                type="email"
                required={!isEdit}
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="master@example.com"
                hint="Код для входа придёт на этот email"
              />
            </Field>
          </div>

          <div className="shrink-0 px-4 pb-4 pt-2 sm:px-5">
            <div className="grid grid-cols-2 gap-2">
              <Button type="button" variant="secondary" onClick={closeModal} disabled={saving} className="w-full">
                Отмена
              </Button>
              <Button type="submit" loading={saving} className="w-full">
                Сохранить
              </Button>
            </div>
          </div>
        </form>
      </Modal>
    </div>
  );
}
