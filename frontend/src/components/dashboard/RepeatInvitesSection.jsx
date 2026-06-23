import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  CalendarClock,
  Check,
  ImagePlus,
  Megaphone,
  RefreshCw,
  Search,
  Send,
  Users,
  X,
} from 'lucide-react';
import Card, { CardHeader } from '../ui/Card';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Textarea from '../ui/Textarea';
import Badge from '../ui/Badge';
import Modal from '../ui/Modal';
import ClientAvatar from './ClientAvatar';
import { PageLoader } from '../ui/Spinner';
import { mediaUrl } from '../../lib/media';
import { formatDate } from '../../lib/format';

const TABS = [
  { id: 'auto', label: 'Автоприглашения', Icon: RefreshCw },
  { id: 'broadcast', label: 'Рассылка', Icon: Megaphone },
];

const AUDIENCE_OPTIONS = [
  { id: 'all', label: 'Все клиенты', hint: 'С Telegram или MAX' },
  { id: 'inactive', label: 'Давно не были', hint: 'Количество дней — ниже' },
  { id: 'selected', label: 'Выбрать вручную', hint: 'Отметьте в списке' },
];

const CHANNEL_OPTIONS = [
  { id: 'all', label: 'Telegram и MAX' },
  { id: 'telegram', label: 'Только Telegram' },
  { id: 'max', label: 'Только MAX' },
];

function clientLabel(client) {
  return client.display_name || client.name || 'Без имени';
}

function Toggle({ checked, onChange, label, description }) {
  return (
    <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-admin-border/80 bg-admin-bg/40 p-4 transition hover:border-violet-200/80">
      <div className="relative mt-0.5 shrink-0">
        <input type="checkbox" className="peer sr-only" checked={checked} onChange={(e) => onChange(e.target.checked)} />
        <div className="h-6 w-11 rounded-full bg-slate-200 transition peer-checked:bg-admin-accent" />
        <div className="absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition peer-checked:translate-x-5" />
      </div>
      <div className="min-w-0">
        <p className="text-sm font-semibold text-admin-text">{label}</p>
        {description ? <p className="mt-0.5 text-xs text-admin-textMuted">{description}</p> : null}
      </div>
    </label>
  );
}

function OptionCard({ active, onClick, title, hint, icon: Icon }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full rounded-2xl border p-3.5 text-left transition sm:p-4 ${
        active
          ? 'border-admin-accent bg-white shadow-sm ring-2 ring-admin-accent/20'
          : 'border-admin-border bg-white hover:border-slate-300 hover:bg-slate-50'
      }`}
    >
      <div className="flex items-center gap-3">
        {Icon ? (
          <div
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
              active ? 'bg-admin-accent text-white' : 'bg-slate-100 text-slate-600'
            }`}
          >
            <Icon size={18} />
          </div>
        ) : null}
        <div className="min-w-0 flex-1">
          <p className={`text-sm font-semibold leading-snug ${active ? 'text-admin-accent' : 'text-slate-900'}`}>
            {title}
          </p>
          {hint ? (
            <p className={`mt-0.5 text-xs leading-relaxed ${active ? 'text-slate-600' : 'text-slate-500'}`}>
              {hint}
            </p>
          ) : null}
        </div>
        <span
          className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 ${
            active ? 'border-admin-accent bg-admin-accent text-white' : 'border-slate-300 bg-white'
          }`}
          aria-hidden
        >
          {active ? <Check size={11} strokeWidth={3} /> : null}
        </span>
      </div>
    </button>
  );
}

export default function RepeatInvitesSection({ api, toast, clients = [], initialTab = 'auto' }) {
  const [tab, setTab] = useState(initialTab === 'broadcast' ? 'broadcast' : 'auto');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [inviteForm, setInviteForm] = useState({
    enabled: false,
    days_after: 30,
    message: '',
    booking_link: '',
    default_message: '',
  });

  const [broadcastMessage, setBroadcastMessage] = useState('');
  const [broadcastImage, setBroadcastImage] = useState(null);
  const [broadcastImagePreview, setBroadcastImagePreview] = useState('');
  const [uploadingImage, setUploadingImage] = useState(false);
  const [audience, setAudience] = useState('all');
  const [inactiveDays, setInactiveDays] = useState(30);
  const [channel, setChannel] = useState('all');
  const [selectedIds, setSelectedIds] = useState([]);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerSearch, setPickerSearch] = useState('');
  const [previewCount, setPreviewCount] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    setTab(initialTab === 'broadcast' ? 'broadcast' : 'auto');
  }, [initialTab]);

  useEffect(() => {
    (async () => {
      try {
        const res = await api.get('/master/me/repeat-invites');
        setInviteForm({
          enabled: res.data.enabled,
          days_after: res.data.days_after,
          message: res.data.message || res.data.default_message || '',
          booking_link: res.data.booking_link,
          default_message: res.data.default_message,
        });
      } catch {
        toast('Не удалось загрузить настройки', 'error');
      } finally {
        setLoading(false);
      }
    })();
  }, [api, toast]);

  const messengersClients = useMemo(
    () => clients.filter((c) => c.has_telegram || c.has_max || c.telegram_user_id || c.max_user_id),
    [clients]
  );

  const pickerFiltered = useMemo(() => {
    const q = pickerSearch.trim().toLowerCase();
    if (!q) return messengersClients;
    return messengersClients.filter((c) => clientLabel(c).toLowerCase().includes(q));
  }, [messengersClients, pickerSearch]);

  const loadPreview = useCallback(async () => {
    if (audience === 'selected' && selectedIds.length === 0) {
      setPreviewCount(0);
      return;
    }
    setPreviewLoading(true);
    try {
      const params = new URLSearchParams({
        audience,
        channel,
        inactive_days: String(inactiveDays),
      });
      if (audience === 'selected') {
        params.set('client_ids', selectedIds.join(','));
      }
      const res = await api.get(`/master/me/broadcast/preview?${params}`);
      setPreviewCount(res.data.count);
    } catch {
      setPreviewCount(null);
    } finally {
      setPreviewLoading(false);
    }
  }, [api, audience, channel, inactiveDays, selectedIds]);

  useEffect(() => {
    if (tab !== 'broadcast') return undefined;
    const timer = setTimeout(loadPreview, 300);
    return () => clearTimeout(timer);
  }, [tab, loadPreview]);

  const handleSaveInvites = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.put('/master/me/repeat-invites', {
        enabled: inviteForm.enabled,
        days_after: Number(inviteForm.days_after) || 30,
        message: inviteForm.message,
      });
      toast('Настройки сохранены');
    } catch {
      toast('Ошибка сохранения', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleImagePick = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast('Выберите изображение', 'error');
      return;
    }
    setUploadingImage(true);
    try {
      const fd = new FormData();
      fd.append('image', file);
      const res = await api.post('/master/me/broadcast/upload', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setBroadcastImage(res.data.image_url);
      setBroadcastImagePreview(mediaUrl(res.data.image_url));
      toast('Изображение загружено');
    } catch (err) {
      toast(err?.response?.data?.error || 'Ошибка загрузки', 'error');
    } finally {
      setUploadingImage(false);
      e.target.value = '';
    }
  };

  const clearImage = () => {
    setBroadcastImage(null);
    setBroadcastImagePreview('');
  };

  const toggleClient = (id) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const selectAllFiltered = () => {
    const ids = pickerFiltered.map((c) => c.id);
    setSelectedIds((prev) => Array.from(new Set([...prev, ...ids])));
  };

  const handleBroadcast = async () => {
    if (!broadcastMessage.trim() && !broadcastImage) {
      toast('Введите текст или добавьте изображение', 'error');
      return;
    }
    if (audience === 'selected' && selectedIds.length === 0) {
      toast('Выберите хотя бы одного клиента', 'error');
      return;
    }
    if (!window.confirm(`Отправить рассылку ${previewCount ?? 'выбранным'} получателям?`)) return;

    setSending(true);
    try {
      const res = await api.post('/master/me/broadcast', {
        message: broadcastMessage,
        image_url: broadcastImage,
        audience,
        inactive_days: Number(inactiveDays) || 30,
        channel,
        client_ids: audience === 'selected' ? selectedIds : undefined,
      });
      toast(`Отправлено: ${res.data.recipients} из ${res.data.total}`);
      setBroadcastMessage('');
      clearImage();
      if (audience === 'selected') setSelectedIds([]);
      await loadPreview();
    } catch (err) {
      toast(err?.response?.data?.error || 'Ошибка рассылки', 'error');
    } finally {
      setSending(false);
    }
  };

  if (loading) return <PageLoader />;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-admin-accent">Продвижение</p>
          <h1 className="text-xl font-bold text-admin-text sm:text-2xl">Сообщения клиентам</h1>
          <p className="mt-1 text-sm text-admin-textMuted">
            Автоприглашения на повторный визит и рассылки в Telegram и MAX
          </p>
        </div>
      </div>

      <div className="flex gap-1 rounded-2xl border border-admin-border bg-admin-bg/50 p-1">
        {TABS.map(({ id, label, Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={`flex flex-1 items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold transition ${
              tab === id ? 'bg-white text-admin-accent shadow-sm' : 'text-admin-textMuted hover:text-admin-text'
            }`}
          >
            <Icon size={16} />
            <span className="hidden sm:inline">{label}</span>
          </button>
        ))}
      </div>

      {tab === 'auto' ? (
        <Card className="overflow-hidden">
          <CardHeader
            title="Приглашения на повторный визит"
            description="Автоматически через N дней после визита и кнопка «Повторная запись» в карточке клиента"
          />
          <form onSubmit={handleSaveInvites} className="space-y-5 max-w-2xl">
            <Toggle
              checked={inviteForm.enabled}
              onChange={(enabled) => setInviteForm({ ...inviteForm, enabled })}
              label="Включить автоматические приглашения"
              description="Сообщение уйдёт клиенту в день, когда с момента последнего визита пройдёт указанное число дней"
            />

            <div className="grid gap-4 sm:grid-cols-2">
              <Input
                label="Через сколько дней после визита"
                type="number"
                min={7}
                max={365}
                value={inviteForm.days_after}
                onChange={(e) => setInviteForm({ ...inviteForm, days_after: e.target.value })}
              />
              <div className="rounded-2xl border border-dashed border-admin-border bg-admin-bg/30 p-4">
                <p className="text-xs font-medium text-admin-textMuted">Переменные в тексте</p>
                <p className="mt-2 text-xs text-admin-textSecondary font-mono">
                  {'{client_name}'} · {'{salon_name}'} · {'{booking_link}'}
                </p>
              </div>
            </div>

            <Textarea
              label="Текст сообщения"
              rows={6}
              value={inviteForm.message}
              onChange={(e) => setInviteForm({ ...inviteForm, message: e.target.value })}
              placeholder={inviteForm.default_message}
            />

            {inviteForm.booking_link ? (
              <div className="rounded-xl border border-admin-border bg-admin-bg/40 px-4 py-3 text-xs text-admin-textMuted">
                Ссылка для подстановки:{' '}
                <span className="break-all font-medium text-admin-accent">{inviteForm.booking_link}</span>
              </div>
            ) : null}

            <Button type="submit" loading={saving}>Сохранить настройки</Button>
          </form>
        </Card>
      ) : (
        <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
          <Card className="space-y-5">
            <CardHeader
              title="Рассылка с картинкой"
              description="Сообщение уйдёт выбранным клиентам в Telegram и/или MAX"
            />

            <div>
              <p className="mb-2 text-sm font-medium text-slate-900">Кому отправить</p>
              <div className="grid gap-2">
                {AUDIENCE_OPTIONS.map((opt) => (
                  <OptionCard
                    key={opt.id}
                    active={audience === opt.id}
                    onClick={() => setAudience(opt.id)}
                    title={opt.label}
                    hint={opt.hint}
                    icon={opt.id === 'selected' ? Users : opt.id === 'inactive' ? CalendarClock : Users}
                  />
                ))}
              </div>
            </div>

            {audience === 'inactive' ? (
              <Input
                label="Не были больше (дней)"
                type="number"
                min={1}
                max={365}
                value={inactiveDays}
                onChange={(e) => setInactiveDays(e.target.value)}
              />
            ) : null}

            {audience === 'selected' ? (
              <div className="rounded-2xl border border-admin-border bg-admin-bg/30 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-admin-text">
                    Выбрано: {selectedIds.length}
                  </p>
                  <Button type="button" size="sm" variant="secondary" onClick={() => setPickerOpen(true)}>
                    Выбрать клиентов
                  </Button>
                </div>
                {selectedIds.length > 0 ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {selectedIds.slice(0, 8).map((id) => {
                      const c = clients.find((x) => x.id === id);
                      return (
                        <span key={id} className="inline-flex items-center gap-1 rounded-full bg-white px-2.5 py-1 text-xs font-medium text-admin-text border border-admin-border">
                          {c ? clientLabel(c) : id.slice(0, 8)}
                          <button type="button" onClick={() => toggleClient(id)} className="text-admin-textMuted hover:text-red-500">
                            <X size={12} />
                          </button>
                        </span>
                      );
                    })}
                    {selectedIds.length > 8 ? (
                      <span className="text-xs text-admin-textMuted">+{selectedIds.length - 8}</span>
                    ) : null}
                  </div>
                ) : (
                  <p className="mt-2 text-xs text-admin-textMuted">Отметьте клиентов с Telegram или MAX</p>
                )}
              </div>
            ) : null}

            <div>
              <p className="mb-2 text-sm font-medium text-slate-900">Канал</p>
              <div className="flex flex-wrap gap-2">
                {CHANNEL_OPTIONS.map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setChannel(opt.id)}
                    className={`rounded-full px-3.5 py-2 text-xs font-semibold transition ${
                      channel === opt.id
                        ? 'bg-admin-accent text-white shadow-sm'
                        : 'border border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-900'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="mb-2 text-sm font-medium text-admin-text">Изображение (необязательно)</p>
              {broadcastImagePreview ? (
                <div className="relative inline-block">
                  <img src={broadcastImagePreview} alt="" className="max-h-48 rounded-2xl border border-admin-border object-cover" />
                  <button
                    type="button"
                    onClick={clearImage}
                    className="absolute -right-2 -top-2 flex h-7 w-7 items-center justify-center rounded-full bg-white border border-admin-border shadow-sm text-admin-textMuted hover:text-red-500"
                  >
                    <X size={14} />
                  </button>
                </div>
              ) : (
                <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-admin-border bg-admin-bg/30 px-4 py-8 transition hover:border-admin-accent/40 hover:bg-admin-accentSoft/20">
                  <ImagePlus size={24} className="text-admin-textMuted" />
                  <span className="text-sm font-medium text-admin-text">Добавить картинку</span>
                  <span className="text-xs text-admin-textMuted">JPG, PNG, WebP</span>
                  <input type="file" accept="image/*" className="sr-only" onChange={handleImagePick} disabled={uploadingImage} />
                </label>
              )}
              {uploadingImage ? <p className="mt-2 text-xs text-admin-textMuted">Загрузка…</p> : null}
            </div>

            <Textarea
              label="Текст сообщения"
              rows={6}
              value={broadcastMessage}
              onChange={(e) => setBroadcastMessage(e.target.value)}
              placeholder="Акция, новость, напоминание о записи…"
            />
          </Card>

          <div className="space-y-4">
            <Card className="!p-5">
              <p className="text-xs font-semibold uppercase tracking-wide text-admin-textMuted">Получатели</p>
              <p className="mt-2 text-3xl font-bold tabular-nums text-admin-text">
                {previewLoading ? '…' : previewCount ?? '—'}
              </p>
              <p className="mt-1 text-xs text-admin-textMuted">
                {channel === 'all' ? 'Telegram и MAX' : channel === 'telegram' ? 'Только Telegram' : 'Только MAX'}
              </p>
              <Button
                type="button"
                className="mt-5 w-full"
                loading={sending}
                disabled={!previewCount || (!broadcastMessage.trim() && !broadcastImage)}
                onClick={handleBroadcast}
              >
                <Send size={16} />
                Отправить рассылку
              </Button>
            </Card>

            <Card className="!p-4 text-xs text-admin-textMuted space-y-2">
              <p>• Клиенты без мессенджера не попадут в рассылку</p>
              <p>• При выборе «Telegram и MAX» сообщение уйдёт во все доступные каналы</p>
              <p>• Картинка отображается как фото с подписью</p>
            </Card>
          </div>
        </div>
      )}

      <Modal
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        size="lg"
        title="Выбор клиентов"
        description={`${messengersClients.length} клиентов с мессенджером`}
        footer={
          <>
            <Button type="button" variant="secondary" onClick={selectAllFiltered}>Выбрать всех</Button>
            <Button type="button" onClick={() => setPickerOpen(false)}>Готово ({selectedIds.length})</Button>
          </>
        }
      >
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-admin-textMuted" />
          <input
            type="search"
            value={pickerSearch}
            onChange={(e) => setPickerSearch(e.target.value)}
            placeholder="Поиск по имени"
            className="w-full rounded-xl border border-admin-border py-2.5 pl-9 pr-3 text-sm"
          />
        </div>
        <ul className="max-h-80 space-y-1 overflow-y-auto">
          {pickerFiltered.length === 0 ? (
            <li className="py-8 text-center text-sm text-admin-textMuted">Клиенты не найдены</li>
          ) : (
            pickerFiltered.map((client) => {
              const checked = selectedIds.includes(client.id);
              const hasTelegram = client.has_telegram ?? !!client.telegram_user_id;
              const hasMax = client.has_max ?? !!client.max_user_id;
              return (
                <li key={client.id}>
                  <button
                    type="button"
                    onClick={() => toggleClient(client.id)}
                    className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition ${
                      checked ? 'bg-admin-accentSoft' : 'hover:bg-admin-bg'
                    }`}
                  >
                    <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border ${checked ? 'border-admin-accent bg-admin-accent text-white' : 'border-admin-border bg-white'}`}>
                      {checked ? <Check size={12} /> : null}
                    </span>
                    <ClientAvatar client={client} size="xs" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-admin-text">{clientLabel(client)}</p>
                      <p className="text-xs text-admin-textMuted">
                        {client.last_visit ? `Последний визит: ${formatDate(client.last_visit, { year: undefined, month: 'short' })}` : 'Без визитов'}
                      </p>
                    </div>
                    <div className="flex shrink-0 gap-1">
                      {hasTelegram ? <Badge tone="telegram" className="!px-1.5 !py-0 !text-[10px]" /> : null}
                      {hasMax ? <Badge tone="max" className="!px-1.5 !py-0 !text-[10px]" /> : null}
                    </div>
                  </button>
                </li>
              );
            })
          )}
        </ul>
      </Modal>
    </div>
  );
}
