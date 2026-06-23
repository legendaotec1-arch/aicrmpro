import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ArrowRight,
  CheckCircle2,
  ExternalLink,
  Megaphone,
  MessageCircle,
  Pencil,
  PiggyBank,
  Plus,
  Trash2,
  Users,
  Wallet,
} from 'lucide-react';
import adminApi from '../../lib/adminApi';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Modal from '../ui/Modal';
import { formatDate, formatRub } from './adminFormat';

const STATUS_LABEL = {
  new: 'Новый',
  contacted: 'Написали',
  negotiating: 'Переговоры',
  agreed: 'Согласовано',
  paid: 'Оплачено',
  rejected: 'Отказ',
  done: 'Архив',
};

const STATUS_BADGE = {
  new: 'bg-slate-500',
  contacted: 'bg-blue-500',
  negotiating: 'bg-amber-500',
  agreed: 'bg-violet-500',
  paid: 'bg-emerald-500',
  rejected: 'bg-rose-500',
  done: 'bg-slate-400',
};

/** Вкладка «Написали» объединяет contacted + negotiating */
const CONTACT_GROUP = ['contacted', 'negotiating'];

const FILTER_TABS = [
  { id: 'all', label: 'Все', badgeColor: 'bg-violet-500' },
  { id: 'new', label: 'Новый', badgeColor: STATUS_BADGE.new },
  { id: 'contacted', label: 'Написали', badgeColor: STATUS_BADGE.contacted },
  { id: 'agreed', label: 'Согласовано', badgeColor: STATUS_BADGE.agreed },
  { id: 'paid', label: 'Оплачено', badgeColor: STATUS_BADGE.paid },
  { id: 'rejected', label: 'Отказ', badgeColor: STATUS_BADGE.rejected },
  { id: 'done', label: 'Архив', badgeColor: STATUS_BADGE.done },
];

const PLATFORM_LABEL = {
  telegram: 'Telegram',
  instagram: 'Instagram',
  youtube: 'YouTube',
  vk: 'ВКонтакте',
  tiktok: 'TikTok',
  blog: 'Блог',
  other: 'Другое',
};

/** Градиент шапки карточки по статусу */
const STATUS_GRADIENT = {
  new: 'from-slate-600 via-slate-500 to-slate-600',
  contacted: 'from-blue-600 via-blue-500 to-indigo-600',
  negotiating: 'from-amber-500 via-orange-500 to-amber-600',
  agreed: 'from-violet-600 via-purple-500 to-fuchsia-600',
  paid: 'from-emerald-500 via-teal-500 to-emerald-600',
  rejected: 'from-rose-500 via-red-500 to-rose-600',
  done: 'from-slate-400 via-slate-500 to-slate-500',
};

const PRIORITY_LABEL = { low: 'Низкий', normal: 'Обычный', high: 'Высокий' };

const FORM_STATUSES = ['new', 'contacted', 'negotiating', 'agreed', 'paid', 'rejected', 'done'];

const EMPTY_FORM = {
  title: '',
  platform: 'telegram',
  channel_url: '',
  contact: '',
  audience_size: '',
  quoted_price: '',
  status: 'new',
  conditions: '',
  notes: '',
  priority: 'normal',
};

function TabBadge({ count, color, active }) {
  if (!count) return null;
  return (
    <span
      className={`inline-flex min-w-[1.1rem] items-center justify-center rounded-full px-1 py-0.5 text-[10px] font-bold leading-none text-white ${color} ${
        active ? 'ring-2 ring-white/40' : ''
      }`}
    >
      {count}
    </span>
  );
}

function SummaryCard({ icon: Icon, label, value, hint, accent }) {
  return (
    <div className={`rounded-xl border bg-white p-3 shadow-sm ${accent || 'border-slate-200'}`}>
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="text-xs text-slate-500">{label}</p>
          <p className="text-lg font-bold text-slate-900">{value}</p>
          {hint ? <p className="text-[10px] text-slate-400">{hint}</p> : null}
        </div>
        <div className="rounded-lg bg-violet-50 p-1.5 text-violet-600">
          <Icon size={16} />
        </div>
      </div>
    </div>
  );
}

function AdLeadCard({ lead, onEdit, onDelete, onAllocate, onPublish, onAdvance, advancing }) {
  const isArchive = lead.status === 'done';
  const isPaid = lead.status === 'paid';
  const canAllocate = lead.status === 'agreed';
  const gradient = STATUS_GRADIENT[lead.status] || STATUS_GRADIENT.new;
  const budgetPct =
    lead.quoted_price > 0
      ? Math.min(100, Math.round((lead.allocated_budget / lead.quoted_price) * 100))
      : 0;

  return (
    <article
      className={`group flex flex-col overflow-hidden rounded-2xl bg-white shadow-md ring-1 ring-black/5 transition hover:shadow-xl hover:ring-violet-200/60 ${
        isArchive ? 'opacity-80' : ''
      }`}
    >
      {/* Цветная шапка */}
      <div className={`relative bg-gradient-to-br ${gradient} px-3.5 pt-3 pb-3.5`}>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,rgba(255,255,255,0.15),transparent_50%)]" />
        <div className="relative flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-1.5 mb-1">
              <span className="rounded-md bg-white/20 backdrop-blur-sm px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
                {STATUS_LABEL[lead.status]}
              </span>
              <span className="text-[10px] font-medium text-white/75">
                {PLATFORM_LABEL[lead.platform]}
              </span>
              {lead.priority === 'high' ? (
                <span className="rounded-md bg-white/25 px-1.5 py-0.5 text-[9px] font-bold text-white">
                  HOT
                </span>
              ) : null}
            </div>
            <h3 className="font-bold text-white text-sm leading-snug line-clamp-2 drop-shadow-sm">
              {lead.title}
            </h3>
          </div>
          <div className="flex shrink-0 gap-0.5">
            <button
              type="button"
              onClick={() => onEdit(lead)}
              className="rounded-lg p-1.5 text-white/70 hover:bg-white/20 hover:text-white"
            >
              <Pencil size={13} />
            </button>
            <button
              type="button"
              onClick={() => onDelete(lead)}
              className="rounded-lg p-1.5 text-white/70 hover:bg-white/20 hover:text-white"
            >
              <Trash2 size={13} />
            </button>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-2.5 p-3">
        {/* Кнопка канала */}
        {lead.channel_url ? (
          <a
            href={lead.channel_url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 px-3 py-2.5 text-sm font-bold text-white shadow-lg shadow-violet-200 transition hover:from-violet-700 hover:to-fuchsia-700 hover:shadow-violet-300 active:scale-[0.98]"
          >
            <ExternalLink size={16} strokeWidth={2.5} />
            Перейти в канал
          </a>
        ) : (
          <div className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-200 px-3 py-2.5 text-xs font-medium text-slate-400">
            Ссылка на канал не указана
          </div>
        )}

        {/* Контакт — на всю ширину */}
        <div className="rounded-xl bg-gradient-to-br from-sky-50 to-blue-100 px-3 py-2.5 ring-1 ring-blue-200/60">
          <div className="flex items-center gap-2 mb-1">
            <MessageCircle size={14} className="shrink-0 text-blue-500" />
            <p className="text-[9px] font-bold uppercase tracking-wider text-blue-500/80">Контакт</p>
          </div>
          <p className="text-sm font-bold text-blue-900 break-all leading-snug">
            {lead.contact || '—'}
          </p>
        </div>

        {/* Подписчики и стоимость */}
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-xl bg-gradient-to-br from-violet-50 to-purple-100 p-2.5 text-center ring-1 ring-violet-200/60">
            <Users size={14} className="mx-auto mb-1 text-violet-500" />
            <p className="text-[9px] font-bold uppercase tracking-wider text-violet-500/80">Подписчики</p>
            <p className="mt-0.5 text-sm font-extrabold text-violet-900 tabular-nums">
              {lead.audience_size != null
                ? lead.audience_size.toLocaleString('ru-RU')
                : '—'}
            </p>
          </div>
          <div className="rounded-xl bg-gradient-to-br from-amber-50 to-orange-100 p-2.5 text-center ring-1 ring-amber-200/60">
            <Wallet size={14} className="mx-auto mb-1 text-amber-600" />
            <p className="text-[9px] font-bold uppercase tracking-wider text-amber-600/80">Стоимость</p>
            <p className="mt-0.5 text-sm font-extrabold text-amber-900 tabular-nums">
              {lead.quoted_price != null ? formatRub(lead.quoted_price) : '—'}
            </p>
          </div>
        </div>

        {lead.allocated_budget > 0 ? (
          <div className="rounded-lg bg-emerald-50 px-2.5 py-2 ring-1 ring-emerald-100">
            <div className="flex justify-between text-[10px] font-semibold text-emerald-700 mb-1">
              <span>Выделено из кассы</span>
              <span>{formatRub(lead.allocated_budget)}</span>
            </div>
            {lead.quoted_price > 0 ? (
              <div className="h-1.5 rounded-full bg-emerald-100 overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-teal-500"
                  style={{ width: `${budgetPct}%` }}
                />
              </div>
            ) : null}
          </div>
        ) : null}

        {(lead.conditions || lead.notes) ? (
          <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed px-0.5">
            {lead.conditions || lead.notes}
          </p>
        ) : null}

        {/* Действия */}
        <div className="flex flex-wrap gap-1.5 pt-0.5">
          {lead.status === 'new' ? (
            <button
              type="button"
              disabled={advancing === lead.id}
              onClick={() => onAdvance(lead, 'contacted')}
              className="inline-flex items-center gap-1 rounded-lg bg-blue-500 px-2.5 py-1.5 text-[11px] font-bold text-white shadow-sm hover:bg-blue-600 disabled:opacity-50"
            >
              Написали
              <ArrowRight size={11} />
            </button>
          ) : null}
          {lead.status === 'contacted' ? (
            <button
              type="button"
              disabled={advancing === lead.id}
              onClick={() => onAdvance(lead, 'negotiating')}
              className="inline-flex items-center gap-1 rounded-lg bg-amber-500 px-2.5 py-1.5 text-[11px] font-bold text-white shadow-sm hover:bg-amber-600 disabled:opacity-50"
            >
              В переговоры
              <ArrowRight size={11} />
            </button>
          ) : null}
          {lead.status === 'negotiating' ? (
            <button
              type="button"
              disabled={advancing === lead.id}
              onClick={() => onAdvance(lead, 'agreed')}
              className="inline-flex items-center gap-1 rounded-lg bg-violet-500 px-2.5 py-1.5 text-[11px] font-bold text-white shadow-sm hover:bg-violet-600 disabled:opacity-50"
            >
              Согласовано
              <ArrowRight size={11} />
            </button>
          ) : null}
          {canAllocate ? (
            <button
              type="button"
              onClick={() => onAllocate(lead)}
              className="inline-flex items-center gap-1 rounded-lg bg-slate-800 px-2.5 py-1.5 text-[11px] font-bold text-white shadow-sm hover:bg-slate-900"
            >
              <Wallet size={11} />
              Из кассы
            </button>
          ) : null}
          {isPaid ? (
            <button
              type="button"
              disabled={advancing === lead.id}
              onClick={() => onPublish(lead)}
              className="inline-flex items-center gap-1 rounded-lg bg-emerald-500 px-2.5 py-1.5 text-[11px] font-bold text-white shadow-sm hover:bg-emerald-600 disabled:opacity-50"
            >
              <CheckCircle2 size={11} />
              Опубликовано
            </button>
          ) : null}
          {!['paid', 'done', 'rejected'].includes(lead.status) ? (
            <button
              type="button"
              disabled={advancing === lead.id}
              onClick={() => onAdvance(lead, 'rejected')}
              className="ml-auto text-[10px] font-medium text-slate-400 hover:text-rose-500 px-1"
            >
              Отказ
            </button>
          ) : null}
        </div>

        <p className="text-[10px] text-slate-300 text-center">
          {lead.updated_by_name || lead.created_by_name} · {formatDate(lead.updated_at || lead.created_at)}
        </p>
      </div>
    </article>
  );
}

export default function AdminAdsTab() {
  const [leads, setLeads] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const [allocateLead, setAllocateLead] = useState(null);
  const [allocateAmount, setAllocateAmount] = useState('');
  const [allocating, setAllocating] = useState(false);

  const [confirmDelete, setConfirmDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [advancingId, setAdvancingId] = useState(null);

  const load = useCallback(async () => {
    setError('');
    try {
      const res = await adminApi.get('/ads');
      setLeads(res.data.leads || []);
      setSummary(res.data.summary || null);
    } catch (err) {
      setError(err?.response?.data?.error || 'Не удалось загрузить рекламу');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const statusCounts = useMemo(() => {
    const counts = { all: 0, contacted: 0 };
    FILTER_TABS.forEach((t) => {
      if (!['all', 'contacted'].includes(t.id)) counts[t.id] = 0;
    });
    leads.forEach((l) => {
      if (CONTACT_GROUP.includes(l.status)) {
        counts.contacted += 1;
      } else if (counts[l.status] !== undefined) {
        counts[l.status] += 1;
      }
      if (l.status !== 'done') counts.all += 1;
    });
    return counts;
  }, [leads]);

  const filteredLeads = useMemo(() => {
    if (statusFilter === 'all') return leads.filter((l) => l.status !== 'done');
    if (statusFilter === 'contacted') {
      return leads.filter((l) => CONTACT_GROUP.includes(l.status));
    }
    return leads.filter((l) => l.status === statusFilter);
  }, [leads, statusFilter]);

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setModalOpen(true);
  };

  const openEdit = (lead) => {
    setEditing(lead);
    setForm({
      title: lead.title || '',
      platform: lead.platform || 'other',
      channel_url: lead.channel_url || '',
      contact: lead.contact || '',
      audience_size: lead.audience_size != null ? String(lead.audience_size) : '',
      quoted_price: lead.quoted_price != null ? String(lead.quoted_price) : '',
      status: lead.status || 'new',
      conditions: lead.conditions || '',
      notes: lead.notes || '',
      priority: lead.priority || 'normal',
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
        platform: form.platform,
        channel_url: form.channel_url.trim(),
        contact: form.contact.trim(),
        audience_size: form.audience_size,
        quoted_price: form.quoted_price,
        status: form.status,
        conditions: form.conditions.trim(),
        notes: form.notes.trim(),
        priority: form.priority,
      };
      if (editing) {
        await adminApi.patch(`/ads/${editing.id}`, payload);
      } else {
        await adminApi.post('/ads', payload);
      }
      setModalOpen(false);
      await load();
    } catch (err) {
      alert(err?.response?.data?.error || 'Не удалось сохранить');
    } finally {
      setSaving(false);
    }
  };

  const advanceStatus = async (lead, status) => {
    setAdvancingId(lead.id);
    try {
      await adminApi.patch(`/ads/${lead.id}/status`, { status });
      if (status === 'contacted' || status === 'negotiating') setStatusFilter('contacted');
      else if (status === 'agreed') setStatusFilter('agreed');
      else if (status === 'rejected') setStatusFilter('rejected');
      await load();
    } catch (err) {
      alert(err?.response?.data?.error || 'Не удалось обновить статус');
    } finally {
      setAdvancingId(null);
    }
  };

  const openAllocate = (lead) => {
    setAllocateLead(lead);
    const remaining =
      lead.quoted_price != null
        ? Math.max(0, lead.quoted_price - lead.allocated_budget)
        : '';
    setAllocateAmount(remaining ? String(Math.ceil(remaining)) : '');
  };

  const submitAllocate = async (e) => {
    e.preventDefault();
    if (!allocateLead) return;
    setAllocating(true);
    try {
      await adminApi.post(`/ads/${allocateLead.id}/allocate`, {
        amount: Number(allocateAmount),
      });
      setAllocateLead(null);
      setAllocateAmount('');
      setStatusFilter('paid');
      await load();
    } catch (err) {
      alert(err?.response?.data?.error || 'Не удалось выделить бюджет');
    } finally {
      setAllocating(false);
    }
  };

  const publishLead = async (lead) => {
    setAdvancingId(lead.id);
    try {
      await adminApi.post(`/ads/${lead.id}/publish`);
      setStatusFilter('done');
      await load();
    } catch (err) {
      alert(err?.response?.data?.error || 'Не удалось отметить');
    } finally {
      setAdvancingId(null);
    }
  };

  const executeDelete = async () => {
    if (!confirmDelete) return;
    setDeleting(true);
    try {
      await adminApi.delete(`/ads/${confirmDelete.id}`);
      setConfirmDelete(null);
      await load();
    } catch (err) {
      alert(err?.response?.data?.error || 'Не удалось удалить');
    } finally {
      setDeleting(false);
    }
  };

  if (loading) return <p className="text-slate-500">Загрузка…</p>;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-violet-100 bg-gradient-to-r from-violet-50 to-white p-4">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white text-violet-600 shadow-sm">
            <Megaphone size={18} />
          </div>
          <div>
            <h2 className="font-bold text-slate-900">Реклама</h2>
            <p className="text-xs text-slate-500">Каналы, цены, бюджет</p>
          </div>
        </div>
        <Button type="button" size="sm" onClick={openCreate}>
          <Plus size={14} className="mr-1" />
          Добавить
        </Button>
      </div>

      {error ? (
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</div>
      ) : null}

      {summary ? (
        <section className="grid gap-3 grid-cols-2 xl:grid-cols-4">
          <SummaryCard icon={Users} label="В работе" value={statusCounts.all} hint="Без архива" accent="border-violet-100" />
          <SummaryCard icon={Megaphone} label="Сумма цен" value={formatRub(summary.quotedTotalRub)} />
          <SummaryCard icon={PiggyBank} label="Выделено" value={formatRub(summary.allocatedTotalRub)} accent="border-emerald-100" />
          <SummaryCard icon={Wallet} label="В кассе" value={formatRub(summary.cashBalanceRub)} accent="border-amber-100" />
        </section>
      ) : null}

      <div className="flex flex-wrap gap-1.5">
        {FILTER_TABS.map(({ id, label, badgeColor }) => {
          const active = statusFilter === id;
          const count = statusCounts[id] || 0;
          return (
            <button
              key={id}
              type="button"
              onClick={() => setStatusFilter(id)}
              className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition ${
                active
                  ? 'bg-violet-600 text-white shadow-sm'
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              {label}
              <TabBadge count={count} color={badgeColor} active={active} />
            </button>
          );
        })}
      </div>

      {filteredLeads.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-200 bg-white px-4 py-12 text-center">
          <Megaphone size={32} className="mx-auto text-slate-300 mb-2" />
          <p className="text-sm text-slate-500">
            {statusFilter === 'done' ? 'Архив пуст' : leads.length === 0 ? 'Пока нет записей' : 'Нет записей на этом этапе'}
          </p>
          {leads.length === 0 ? (
            <Button type="button" size="sm" className="mt-3" onClick={openCreate}>
              Добавить
            </Button>
          ) : null}
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredLeads.map((lead) => (
            <AdLeadCard
              key={lead.id}
              lead={lead}
              onEdit={openEdit}
              onDelete={setConfirmDelete}
              onAllocate={openAllocate}
              onPublish={publishLead}
              onAdvance={advanceStatus}
              advancing={advancingId}
            />
          ))}
        </div>
      )}

      <Modal
        open={modalOpen}
        onClose={() => !saving && setModalOpen(false)}
        title={editing ? 'Редактировать' : 'Новый канал / блогер'}
        description="Ссылка, контакт, цена и условия"
        size="md"
        footer={(
          <>
            <Button type="button" variant="secondary" onClick={() => setModalOpen(false)} disabled={saving}>
              Отмена
            </Button>
            <Button type="submit" form="ads-form" loading={saving}>
              {editing ? 'Сохранить' : 'Добавить'}
            </Button>
          </>
        )}
      >
        <form id="ads-form" onSubmit={save} className="space-y-4">
          <Input
            label="Название"
            required
            placeholder="@channel или Имя блогера"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Платформа</label>
              <select
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                value={form.platform}
                onChange={(e) => setForm({ ...form, platform: e.target.value })}
              >
                {Object.entries(PLATFORM_LABEL).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Статус</label>
              <select
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value })}
              >
                {FORM_STATUSES.map((value) => (
                  <option key={value} value={value}>{STATUS_LABEL[value]}</option>
                ))}
              </select>
            </div>
          </div>
          <Input
            label="Ссылка на канал"
            placeholder="https://t.me/channel"
            value={form.channel_url}
            onChange={(e) => setForm({ ...form, channel_url: e.target.value })}
          />
          <Input
            label="Контакт"
            placeholder="@username"
            value={form.contact}
            onChange={(e) => setForm({ ...form, contact: e.target.value })}
          />
          <div className="grid gap-4 sm:grid-cols-3">
            <Input
              label="Аудитория"
              type="number"
              min="0"
              value={form.audience_size}
              onChange={(e) => setForm({ ...form, audience_size: e.target.value })}
            />
            <Input
              label="Цена, ₽"
              type="number"
              min="0"
              value={form.quoted_price}
              onChange={(e) => setForm({ ...form, quoted_price: e.target.value })}
            />
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Приоритет</label>
              <select
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                value={form.priority}
                onChange={(e) => setForm({ ...form, priority: e.target.value })}
              >
                {Object.entries(PRIORITY_LABEL).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Условия</label>
            <textarea
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
              rows={2}
              value={form.conditions}
              onChange={(e) => setForm({ ...form, conditions: e.target.value })}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Заметки</label>
            <textarea
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
              rows={2}
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
            />
          </div>
        </form>
      </Modal>

      <Modal
        open={Boolean(allocateLead)}
        onClose={() => !allocating && setAllocateLead(null)}
        title="Выделить из кассы"
        description={allocateLead?.title}
        size="sm"
        footer={(
          <>
            <Button type="button" variant="secondary" onClick={() => setAllocateLead(null)} disabled={allocating}>
              Отмена
            </Button>
            <Button type="submit" form="allocate-form" loading={allocating}>
              Оплатить
            </Button>
          </>
        )}
      >
        <form id="allocate-form" onSubmit={submitAllocate} className="space-y-3">
          {summary ? (
            <p className="text-sm text-slate-500">
              В кассе: <strong>{formatRub(summary.cashBalanceRub)}</strong>
            </p>
          ) : null}
          <Input
            label="Сумма, ₽"
            type="number"
            min="1"
            required
            value={allocateAmount}
            onChange={(e) => setAllocateAmount(e.target.value)}
          />
        </form>
      </Modal>

      <Modal
        open={Boolean(confirmDelete)}
        onClose={() => !deleting && setConfirmDelete(null)}
        title="Удалить?"
        description={`«${confirmDelete?.title}»`}
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
