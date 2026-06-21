import { useEffect, useState } from 'react';
import Input from '../ui/Input';
import Button from '../ui/Button';
import { PageLoader } from '../ui/Spinner';
import { MessageCircle, Phone, Send } from 'lucide-react';

export default function NotifySettingsCard({ api, toast }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    contact_telegram: '',
    contact_max: '',
    contact_phone: ''
  });

  useEffect(() => {
    (async () => {
      try {
        const res = await api.get('/master/me/notify-settings');
        setForm({
          contact_telegram: res.data.contact_telegram || '',
          contact_max: res.data.contact_max || '',
          contact_phone: res.data.contact_phone || ''
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
      await api.put('/master/me/notify-settings', {
        contact_telegram: form.contact_telegram.trim() || null,
        contact_max: form.contact_max.trim() || null,
        contact_phone: form.contact_phone.trim() || null
      });
      toast('Контакты сохранены');
    } catch {
      toast('Ошибка сохранения', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <PageLoader />;

  return (
    <form onSubmit={handleSave} className="space-y-4">
      <div className="space-y-3">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 border border-blue-100">
            <Send className="h-5 w-5 text-blue-500" />
          </div>
          <div className="flex-1">
            <Input
              label="Telegram"
              value={form.contact_telegram}
              onChange={(e) => setForm({ ...form, contact_telegram: e.target.value })}
              placeholder="@username или ссылка t.me/..."
            />
          </div>
        </div>

        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-purple-50 border border-purple-100">
            <MessageCircle className="h-5 w-5 text-purple-500" />
          </div>
          <div className="flex-1">
            <Input
              label="MAX"
              value={form.contact_max}
              onChange={(e) => setForm({ ...form, contact_max: e.target.value })}
              placeholder="@username или ссылка"
            />
          </div>
        </div>

        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-green-50 border border-green-100">
            <Phone className="h-5 w-5 text-green-500" />
          </div>
          <div className="flex-1">
            <Input
              label="Телефон"
              type="tel"
              value={form.contact_phone}
              onChange={(e) => setForm({ ...form, contact_phone: e.target.value })}
              placeholder="+7 (999) 123-45-67"
            />
          </div>
        </div>
      </div>

      <Button type="submit" loading={saving} className="w-full sm:w-auto">
        Сохранить
      </Button>
    </form>
  );
}
