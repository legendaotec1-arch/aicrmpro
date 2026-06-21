import { useEffect, useState } from 'react';
import Card, { CardHeader } from '../ui/Card';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Textarea from '../ui/Textarea';
import { PageLoader } from '../ui/Spinner';

export default function RepeatInvitesSection({ api, toast }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    enabled: false,
    days_after: 30,
    message: '',
    booking_link: '',
    default_message: ''
  });

  useEffect(() => {
    (async () => {
      try {
        const res = await api.get('/master/me/repeat-invites');
        setForm({
          enabled: res.data.enabled,
          days_after: res.data.days_after,
          message: res.data.message || res.data.default_message || '',
          booking_link: res.data.booking_link,
          default_message: res.data.default_message
        });
      } catch {
        toast('Не удалось загрузить настройки', 'error');
      } finally {
        setLoading(false);
      }
    })();
  }, [api, toast]);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.put('/master/me/repeat-invites', {
        enabled: form.enabled,
        days_after: Number(form.days_after) || 30,
        message: form.message
      });
      toast('Настройки сохранены');
    } catch {
      toast('Ошибка сохранения', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <PageLoader />;

  return (
    <Card>
      <CardHeader
        title="Приглашения на повторный визит"
        description="Автоматически через N дней после визита + кнопка в карточке клиента"
      />
      <form onSubmit={handleSave} className="space-y-4 max-w-xl">
        <label className="flex items-center gap-2 text-sm font-medium cursor-pointer text-slate-300">
          <input
            type="checkbox"
            checked={form.enabled}
            onChange={(e) => setForm({ ...form, enabled: e.target.checked })}
            className="rounded border-admin-border text-accent focus:ring-accent/50 bg-admin-surface"
          />
          Включить автоматические приглашения
        </label>
        <Input
          label="Через сколько дней после визита"
          type="number"
          min={7}
          max={365}
          value={form.days_after}
          onChange={(e) => setForm({ ...form, days_after: e.target.value })}
        />
        <Textarea
          label="Текст сообщения"
          rows={5}
          value={form.message}
          onChange={(e) => setForm({ ...form, message: e.target.value })}
        />
        <p className="text-xs text-slate-500 -mt-2">
          Переменные: {'{client_name}'}, {'{salon_name}'}, {'{booking_link}'}
        </p>
        {form.booking_link && (
          <p className="text-xs text-slate-500">
            Ссылка для подстановки: <span className="break-all text-accent">{form.booking_link}</span>
          </p>
        )}
        <Button type="submit" loading={saving}>Сохранить</Button>
      </form>
    </Card>
  );
}
