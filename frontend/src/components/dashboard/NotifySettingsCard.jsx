import { useEffect, useState } from 'react';
import Input from '../ui/Input';
import PhoneRuInput from '../ui/PhoneRuInput';
import Button from '../ui/Button';
import { PageLoader } from '../ui/Spinner';
import { IconTelegram } from '../brand/SocialBrandIcons';
import { Mail, Phone } from 'lucide-react';
import { isRuPhoneComplete } from '../../lib/phoneRu';

export default function NotifySettingsCard({ api, toast }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    contact_telegram: '',
    contact_phone: '+7',
    notify_email: '',
  });

  useEffect(() => {
    (async () => {
      try {
        const res = await api.get('/master/me/notify-settings');
        setForm({
          contact_telegram: res.data.contact_telegram || '',
          contact_phone: res.data.contact_phone || '+7',
          notify_email: res.data.notify_email || '',
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
    if (form.contact_phone && form.contact_phone !== '+7' && !isRuPhoneComplete(form.contact_phone)) {
      toast('Укажите телефон полностью: +7 и 10 цифр', 'error');
      return;
    }
    setSaving(true);
    try {
      await api.put('/master/me/notify-settings', {
        contact_telegram: form.contact_telegram.trim() || null,
        contact_phone: form.contact_phone === '+7' ? null : form.contact_phone,
        notify_email: form.notify_email.trim() || null,
      });
      toast('Контакты сохранены');
    } catch (err) {
      toast(err?.response?.data?.error || 'Ошибка сохранения', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <PageLoader />;

  return (
    <form onSubmit={handleSave} className="space-y-4">
      <div className="space-y-3">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-green-50 border border-green-100">
            <Phone className="h-5 w-5 text-green-600" />
          </div>
          <div className="flex-1">
            <PhoneRuInput
              label="Телефон"
              value={form.contact_phone}
              onChange={(phone) => setForm({ ...form, contact_phone: phone })}
              hint="Клиенты смогут позвонить, если онлайн-запись недоступна"
            />
          </div>
        </div>

        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-50 border border-violet-100">
            <Mail className="h-5 w-5 text-violet-600" />
          </div>
          <div className="flex-1">
            <Input
              label="Email для уведомлений"
              type="email"
              value={form.notify_email}
              onChange={(e) => setForm({ ...form, notify_email: e.target.value })}
              placeholder="balance@example.com"
              hint="Сюда приходят письма о балансе и оплате"
            />
          </div>
        </div>

        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 border border-blue-100">
            <IconTelegram className="h-5 w-5" alt="" />
          </div>
          <div className="flex-1">
            <Input
              label="Telegram"
              value={form.contact_telegram}
              onChange={(e) => setForm({ ...form, contact_telegram: e.target.value })}
              placeholder="@username или ссылка t.me/..."
              hint="Для связи с вами, если телефон не указан"
            />
          </div>
        </div>
      </div>

      <p className="text-xs text-admin-textMuted leading-relaxed">
        При балансе ниже 100 ₽ придёт напоминание пополнить счёт.
        Если баланса не хватает на запись (менее 20 ₽) — срочное письмо: клиенты не смогут забронировать время.
      </p>

      <Button type="submit" loading={saving} className="w-full sm:w-auto">
        Сохранить
      </Button>
    </form>
  );
}
