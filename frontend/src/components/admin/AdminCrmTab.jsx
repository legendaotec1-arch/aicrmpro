import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Briefcase,
  MessageSquare,
  MessageCircleReply,
  Clock,
  BarChart3,
  BookOpen,
  RefreshCw,
  Users,
  Send,
  Sparkles,
  Flame,
} from 'lucide-react';
import adminApi from '../../lib/adminApi';
import Button from '../ui/Button';
import CrmLeadsPanel from './crm/CrmLeadsPanel';
import CrmLeadModal from './crm/CrmLeadModal';
import CrmScriptsSheet from './crm/CrmScriptsSheet';
import CrmAnswersSheet from './crm/CrmAnswersSheet';
import CrmFollowupSheet from './crm/CrmFollowupSheet';
import CrmAnalyticsPanel from './crm/CrmAnalyticsPanel';
import CrmGuidePanel from './crm/CrmGuidePanel';
import CrmTesterPanel from './crm/CrmTesterPanel';

const TOOL_TABS = [
  { id: 'leads', label: 'Лиды', icon: Users },
  { id: 'tester', label: 'Тестировщик', icon: Flame },
  { id: 'scripts', label: 'Скрипты', icon: MessageSquare },
  { id: 'answers', label: 'Ответы', icon: MessageCircleReply },
  { id: 'followup', label: 'Дожим', icon: Clock },
  { id: 'analytics', label: 'Воронка', icon: BarChart3 },
  { id: 'guide', label: 'Справка', icon: BookOpen },
];

function StatPill({ label, value, accent }) {
  return (
    <div className={`rounded-2xl border px-4 py-3 ${accent || 'border-white/20 bg-white/10'}`}>
      <p className="text-xs font-semibold uppercase tracking-wide text-white/80">{label}</p>
      <p className="mt-1 text-2xl font-bold tabular-nums text-white">{value}</p>
    </div>
  );
}

function recomputeStats(leads) {
  const SENT = ['Отправлено', 'Ответил', 'Демо', 'Регистрация', 'Клиент', 'Дожим'];
  const today = new Date().toISOString().slice(0, 10);
  const byStatus = {};
  leads.forEach((l) => {
    byStatus[l.status] = (byStatus[l.status] || 0) + 1;
  });
  return {
    total: leads.length,
    byStatus,
    dueToday: leads.filter((l) => String(l.next_action_date || '').slice(0, 10) === today).length,
    sent: leads.filter((l) => SENT.includes(l.status)).length,
    clients: leads.filter((l) => l.status === 'Клиент').length,
  };
}

export default function AdminCrmTab() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [toolTab, setToolTab] = useState('leads');
  const [statusFilter, setStatusFilter] = useState('all');

  const [leads, setLeads] = useState([]);
  const [followups, setFollowups] = useState([]);
  const [scripts, setScripts] = useState([]);
  const [answers, setAnswers] = useState([]);
  const [search, setSearch] = useState([]);
  const [staticContent, setStaticContent] = useState({});
  const [analytics, setAnalytics] = useState([]);
  const [statuses, setStatuses] = useState([]);
  const [stats, setStats] = useState(null);

  const [modalLead, setModalLead] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [refSaving, setRefSaving] = useState(false);
  const [guideSaving, setGuideSaving] = useState(false);

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);
    setError('');
    try {
      const res = await adminApi.get('/crm/bootstrap');
      setLeads(res.data.leads || []);
      setFollowups(res.data.followups || []);
      setScripts(res.data.scripts || []);
      setAnswers(res.data.answers || []);
      setSearch(res.data.search || []);
      setStaticContent(res.data.static || {});
      setAnalytics(res.data.analytics || []);
      setStatuses(res.data.statuses || []);
      setStats(res.data.stats || recomputeStats(res.data.leads || []));
    } catch (err) {
      setError(err?.response?.data?.error || 'Не удалось загрузить рабочий стол');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const localStats = useMemo(() => stats || recomputeStats(leads), [stats, leads]);

  const openNewLead = () => {
    setModalLead(null);
    setModalOpen(true);
  };

  const openLead = (lead) => {
    setModalLead(lead);
    setModalOpen(true);
  };

  const saveLead = async (form, isNew) => {
    setSaving(true);
    try {
      if (isNew) {
        const res = await adminApi.post('/crm/leads', form);
        const next = [res.data.lead, ...leads];
        setLeads(next);
        setStats(recomputeStats(next));
      } else {
        const res = await adminApi.put(`/crm/leads/${modalLead.id}`, form);
        const next = leads.map((l) => (l.id === modalLead.id ? res.data.lead : l));
        setLeads(next);
        setStats(recomputeStats(next));
      }
      setModalOpen(false);
    } catch (err) {
      alert(err?.response?.data?.error || 'Ошибка сохранения');
    } finally {
      setSaving(false);
    }
  };

  const deleteLead = async (id) => {
    if (!window.confirm('Удалить лид?')) return;
    try {
      await adminApi.delete(`/crm/leads/${id}`);
      const next = leads.filter((l) => l.id !== id);
      setLeads(next);
      setStats(recomputeStats(next));
      setModalOpen(false);
    } catch (err) {
      alert(err?.response?.data?.error || 'Ошибка удаления');
    }
  };

  const saveRef = async (sheetKey, rows) => {
    setRefSaving(true);
    try {
      await adminApi.put(`/crm/ref/${sheetKey}`, { rows });
      if (sheetKey === 'scripts') setScripts(rows);
      if (sheetKey === 'answers') setAnswers(rows);
      if (sheetKey === 'search') setSearch(rows);
    } catch (err) {
      alert(err?.response?.data?.error || 'Ошибка сохранения');
    } finally {
      setRefSaving(false);
    }
  };

  const saveStatic = async (key, content) => {
    setGuideSaving(true);
    try {
      await adminApi.put(`/crm/static/${key}`, { content });
      setStaticContent((s) => ({ ...s, [key]: content }));
    } catch (err) {
      alert(err?.response?.data?.error || 'Ошибка сохранения');
    } finally {
      setGuideSaving(false);
    }
  };

  const patchFollowup = async (id, field, value) => {
    try {
      const res = await adminApi.patch(`/crm/followups/${id}`, { [field]: value });
      setFollowups((list) => list.map((f) => (f.id === id ? res.data.followup : f)));
    } catch (err) {
      alert(err?.response?.data?.error || 'Ошибка');
    }
  };

  const addFollowup = async () => {
    try {
      const res = await adminApi.post('/crm/followups', {
        contact: '',
        touch_date: new Date().toISOString().slice(0, 10),
        touch_number: 2,
        message_text: '',
      });
      setFollowups((list) => [...list, res.data.followup]);
    } catch (err) {
      alert(err?.response?.data?.error || 'Ошибка');
    }
  };

  const deleteFollowup = async (id) => {
    try {
      await adminApi.delete(`/crm/followups/${id}`);
      setFollowups((list) => list.filter((f) => f.id !== id));
    } catch (err) {
      alert(err?.response?.data?.error || 'Ошибка');
    }
  };

  if (loading) {
    return <p className="text-slate-500">Загрузка рабочего стола…</p>;
  }

  return (
    <div className="space-y-4">
      {error ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>
      ) : null}

      <section className="rounded-2xl border border-violet-200 bg-gradient-to-br from-violet-600 via-violet-700 to-indigo-800 p-5 text-white shadow-lg">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-violet-200">
              <Briefcase size={14} /> Рабочий стол менеджера
            </p>
            <h2 className="mt-1 text-2xl font-bold">Холодные продажи Woner.ru</h2>
            <p className="mt-2 max-w-2xl text-sm text-violet-100">
              Записывайте контакты, меняйте статусы, копируйте скрипты. Норма: 20–30 сообщений в день.
            </p>
          </div>
          <Button type="button" variant="secondary" size="sm" onClick={() => load(true)} loading={refreshing} className="!bg-white/10 !text-white !border-white/20 hover:!bg-white/20">
            <RefreshCw size={14} className="mr-1" />
            Обновить
          </Button>
        </div>
        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <StatPill label="Всего лидов" value={localStats.total} accent="border-white/20 bg-white/10" />
          <StatPill label="Отправлено" value={localStats.sent ?? localStats.byStatus?.['Отправлено'] ?? 0} accent="border-white/20 bg-white/10" />
          <StatPill label="Клиенты" value={localStats.clients ?? localStats.byStatus?.['Клиент'] ?? 0} accent="border-emerald-400/30 bg-emerald-500/20" />
          <StatPill label="Задачи на сегодня" value={localStats.dueToday || 0} accent="border-amber-400/30 bg-amber-500/20" />
        </div>
      </section>

      <div className="flex flex-wrap gap-1 rounded-2xl border border-slate-200 bg-white p-1.5 shadow-sm">
        {TOOL_TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => setToolTab(id)}
            className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition ${
              toolTab === id
                ? 'bg-violet-600 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            <Icon size={16} />
            {label}
            {id === 'followup' && followups.filter((f) => f.sent !== '✅').length > 0 ? (
              <span className="rounded-full bg-rose-500 px-1.5 py-0.5 text-[10px] font-bold text-white">
                {followups.filter((f) => f.sent !== '✅').length}
              </span>
            ) : null}
          </button>
        ))}
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm min-h-[520px] flex flex-col">
        {toolTab === 'leads' ? (
          <CrmLeadsPanel
            leads={leads}
            statuses={statuses}
            stats={localStats}
            statusFilter={statusFilter}
            onStatusFilter={setStatusFilter}
            onOpenLead={openLead}
            onQuickAdd={openNewLead}
          />
        ) : null}

        {toolTab === 'tester' ? (
          <CrmTesterPanel scripts={scripts} answers={answers} staticContent={staticContent} />
        ) : null}

        {toolTab === 'scripts' ? (
          <CrmScriptsSheet
            rows={scripts}
            onChange={setScripts}
            onSave={() => saveRef('scripts', scripts)}
            saving={refSaving}
          />
        ) : null}

        {toolTab === 'answers' ? (
          <CrmAnswersSheet
            rows={answers}
            onChange={setAnswers}
            onSave={() => saveRef('answers', answers)}
            saving={refSaving}
          />
        ) : null}

        {toolTab === 'followup' ? (
          <CrmFollowupSheet
            followups={followups}
            onPatch={patchFollowup}
            onAdd={addFollowup}
            onDelete={deleteFollowup}
          />
        ) : null}

        {toolTab === 'analytics' ? (
          <CrmAnalyticsPanel stats={stats} analytics={analytics} />
        ) : null}

        {toolTab === 'guide' ? (
          <CrmGuidePanel
            staticContent={staticContent}
            searchRows={search}
            onSaveStatic={saveStatic}
            saving={guideSaving}
          />
        ) : null}
      </div>

      <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-600 flex flex-wrap gap-x-6 gap-y-1">
        <span className="inline-flex items-center gap-1"><Sparkles size={12} className="text-violet-500" /> Бонус 60₽ — главный триггер</span>
        <span className="inline-flex items-center gap-1"><Send size={12} className="text-violet-500" /> 20₽ за запись · 900₽ безлимит</span>
        <span>Не дави · не робот · веди статистику</span>
      </div>

      <CrmLeadModal
        open={modalOpen}
        lead={modalLead}
        scripts={scripts}
        onClose={() => setModalOpen(false)}
        onSave={saveLead}
        onDelete={deleteLead}
        saving={saving}
      />
    </div>
  );
}
