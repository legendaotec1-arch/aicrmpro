import { useEffect, useMemo, useState } from 'react';
import { Trash2, MessageSquare } from 'lucide-react';
import Modal from '../../ui/Modal';
import Button from '../../ui/Button';
import Input from '../../ui/Input';
import {
  CRM_PLATFORMS,
  CRM_STATUSES,
  NICHE_SUGGESTIONS,
  STATUS_COLORS,
} from './adminCrmConstants';
import { CopyButton } from './CrmUiParts';

const emptyLead = () => ({
  lead_date: new Date().toISOString().slice(0, 10),
  platform: 'Instagram',
  contact: '',
  name: '',
  city: '',
  niche: '',
  status: 'Новый',
  script_variant: '',
  message_text: '',
  sent_at: '',
  reply_text: '',
  replied_at: '',
  demo: '',
  demo_at: '',
  registered: '',
  registered_at: '',
  bonus_60: '',
  tariff: '',
  amount_rub: '',
  next_action: '',
  next_action_date: '',
  note: '',
});

export default function CrmLeadModal({
  open,
  lead,
  scripts,
  onClose,
  onSave,
  onDelete,
  saving,
}) {
  const [form, setForm] = useState(emptyLead());
  const isNew = !lead?.id;

  useEffect(() => {
    if (!open) return;
    setForm(lead?.id ? { ...emptyLead(), ...lead } : emptyLead());
  }, [open, lead]);

  const scriptOptions = useMemo(() => {
    const tester = [];
    const other = [];
    (scripts || []).forEach((s) => {
      const cols = s.cols || [];
      const item = {
        id: s.id,
        label: [cols[0], cols[1], cols[2]].filter(Boolean).join(' · ') || `Скрипт ${cols[0] || ''}`,
        text: cols[3] || '',
        variant: cols[2] || cols[1] || '',
        isTester: cols[1] === 'Тестировщик',
      };
      if (item.isTester) tester.push(item);
      else other.push(item);
    });
    return [...tester, ...other];
  }, [scripts]);

  const set = (key, val) => setForm((f) => ({ ...f, [key]: val }));

  const applyScript = (scriptId) => {
    const item = scriptOptions.find((s) => s.id === scriptId);
    if (!item) return;
    setForm((f) => ({
      ...f,
      script_variant: item.variant,
      message_text: item.text,
      status: f.status === 'Новый' ? 'Отправлено' : f.status,
      sent_at: f.sent_at || new Date().toISOString().slice(0, 10),
    }));
  };

  const submit = (e) => {
    e.preventDefault();
    onSave(form, isNew);
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="2xl"
      bleed
      title={isNew ? 'Новый лид' : `Лид: ${form.contact || form.name || 'без контакта'}`}
      description="Заполните контакт, статус и сообщение. Скрипт можно вставить одним кликом."
      footer={
        <div className="flex w-full flex-wrap items-center justify-between gap-2">
          {!isNew ? (
            <Button type="button" variant="secondary" onClick={() => onDelete(lead.id)}>
              <Trash2 size={14} className="mr-1 text-red-500" />
              Удалить
            </Button>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <Button type="button" variant="secondary" onClick={onClose}>
              Отмена
            </Button>
            <Button type="submit" form="crm-lead-form" loading={saving}>
              {isNew ? 'Добавить' : 'Сохранить'}
            </Button>
          </div>
        </div>
      }
    >
      <form id="crm-lead-form" onSubmit={submit} className="overflow-y-auto px-5 pb-5 space-y-5 max-h-[calc(90vh-10rem)]">
        <section className="grid gap-3 sm:grid-cols-2">
          <Input
            label="Контакт *"
            placeholder="@username или ссылка"
            value={form.contact}
            onChange={(e) => set('contact', e.target.value)}
            required
            className="font-mono"
          />
          <Input label="Имя" value={form.name} onChange={(e) => set('name', e.target.value)} />
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Площадка</label>
            <select
              className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
              value={form.platform || ''}
              onChange={(e) => set('platform', e.target.value)}
            >
              {CRM_PLATFORMS.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Статус</label>
            <select
              className={`w-full rounded-xl border px-3 py-2.5 text-sm font-semibold ${STATUS_COLORS[form.status] || ''}`}
              value={form.status}
              onChange={(e) => set('status', e.target.value)}
            >
              {CRM_STATUSES.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
          <Input label="Город" value={form.city} onChange={(e) => set('city', e.target.value)} />
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Ниша</label>
            <input
              list="crm-niches"
              className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
              value={form.niche}
              onChange={(e) => set('niche', e.target.value)}
              placeholder="маникюр, барбер…"
            />
            <datalist id="crm-niches">
              {NICHE_SUGGESTIONS.map((n) => (
                <option key={n} value={n} />
              ))}
            </datalist>
          </div>
          <Input label="Дата контакта" type="date" value={form.lead_date || ''} onChange={(e) => set('lead_date', e.target.value)} />
        </section>

        <section className="rounded-2xl border border-violet-200 bg-violet-50/40 p-4 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="flex items-center gap-2 text-sm font-bold text-violet-900">
              <MessageSquare size={16} /> Сообщение
            </p>
            {scriptOptions.length > 0 ? (
              <select
                className="rounded-lg border border-violet-200 bg-white px-3 py-1.5 text-xs font-medium text-violet-800"
                defaultValue=""
                onChange={(e) => {
                  if (e.target.value) applyScript(e.target.value);
                  e.target.value = '';
                }}
              >
                <option value="">Вставить скрипт…</option>
                {scriptOptions.some((s) => s.isTester) ? (
                  <optgroup label="🔥 Тестировщик">
                    {scriptOptions.filter((s) => s.isTester).map((s) => (
                      <option key={s.id} value={s.id}>{s.label}</option>
                    ))}
                  </optgroup>
                ) : null}
                {scriptOptions.some((s) => !s.isTester) ? (
                  <optgroup label="Классические">
                    {scriptOptions.filter((s) => !s.isTester).map((s) => (
                      <option key={s.id} value={s.id}>{s.label}</option>
                    ))}
                  </optgroup>
                ) : null}
              </select>
            ) : null}
          </div>
          {form.script_variant ? (
            <p className="text-xs text-violet-700">Скрипт: {form.script_variant}</p>
          ) : null}
          <textarea
            rows={5}
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm leading-relaxed"
            placeholder="Текст первого сообщения…"
            value={form.message_text || ''}
            onChange={(e) => set('message_text', e.target.value)}
          />
          <div className="flex flex-wrap gap-2">
            <CopyButton text={form.message_text} label="Копировать сообщение" />
            <Button
              type="button"
              size="sm"
              variant="secondary"
              onClick={() => {
                set('status', 'Отправлено');
                set('sent_at', new Date().toISOString().slice(0, 10));
              }}
            >
              Отметить «Отправлено»
            </Button>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Input label="Дата отправки" type="date" value={form.sent_at || ''} onChange={(e) => set('sent_at', e.target.value)} />
            <Input label="Дата ответа" type="date" value={form.replied_at || ''} onChange={(e) => set('replied_at', e.target.value)} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Ответ клиента</label>
            <textarea
              rows={2}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
              value={form.reply_text || ''}
              onChange={(e) => set('reply_text', e.target.value)}
            />
          </div>
        </section>

        <section className="grid gap-3 sm:grid-cols-2">
          <Input label="Демо" placeholder="да / нет / дата" value={form.demo || ''} onChange={(e) => set('demo', e.target.value)} />
          <Input label="Дата демо" type="date" value={form.demo_at || ''} onChange={(e) => set('demo_at', e.target.value)} />
          <Input label="Регистрация" value={form.registered || ''} onChange={(e) => set('registered', e.target.value)} />
          <Input label="Дата регистрации" type="date" value={form.registered_at || ''} onChange={(e) => set('registered_at', e.target.value)} />
          <Input label="Тариф" placeholder="За запись / Безлимит" value={form.tariff || ''} onChange={(e) => set('tariff', e.target.value)} />
          <Input label="Сумма, ₽" value={form.amount_rub || ''} onChange={(e) => set('amount_rub', e.target.value)} />
        </section>

        <section className="rounded-2xl border border-amber-200 bg-amber-50/30 p-4 space-y-3">
          <p className="text-sm font-bold text-amber-900">Следующий шаг</p>
          <Input
            label="Что сделать"
            placeholder="Написать дожим, провести демо…"
            value={form.next_action || ''}
            onChange={(e) => set('next_action', e.target.value)}
          />
          <Input label="Дата" type="date" value={form.next_action_date || ''} onChange={(e) => set('next_action_date', e.target.value)} />
        </section>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Примечание</label>
          <textarea
            rows={2}
            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
            value={form.note || ''}
            onChange={(e) => set('note', e.target.value)}
          />
        </div>
      </form>
    </Modal>
  );
}
