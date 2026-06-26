/** Популярные площадки в РФ для холодных продаж */
export const CRM_PLATFORMS = [
  'Instagram',
  'Telegram',
  'ВКонтакте',
  'MAX',
  'YouTube',
  'TikTok',
  'Одноклассники',
  'Яндекс Дзен',
  'WhatsApp',
  'Avito',
  '2ГИС',
  'RuTube',
  'Другое',
];

export const PLATFORM_COLORS = {
  Instagram: 'bg-gradient-to-r from-purple-100 to-pink-100 text-pink-900',
  Telegram: 'bg-sky-100 text-sky-900',
  'ВКонтакте': 'bg-blue-100 text-blue-900',
  MAX: 'bg-violet-100 text-violet-900',
  YouTube: 'bg-red-100 text-red-900',
  TikTok: 'bg-slate-800 text-white',
  'Одноклассники': 'bg-orange-100 text-orange-900',
  'Яндекс Дзен': 'bg-amber-100 text-amber-900',
  WhatsApp: 'bg-emerald-100 text-emerald-900',
  Avito: 'bg-lime-100 text-lime-900',
  '2ГИС': 'bg-teal-100 text-teal-900',
  RuTube: 'bg-rose-100 text-rose-900',
  Другое: 'bg-slate-100 text-slate-700',
};

export const STATUS_COLORS = {
  'Новый': 'bg-blue-100 text-blue-900 border-blue-200',
  'Отправлено': 'bg-yellow-100 text-yellow-900 border-yellow-200',
  'Ответил': 'bg-emerald-100 text-emerald-900 border-emerald-200',
  'Демо': 'bg-orange-100 text-orange-900 border-orange-200',
  'Регистрация': 'bg-purple-100 text-purple-900 border-purple-200',
  'Клиент': 'bg-green-200 text-green-950 border-green-300',
  'Отказ': 'bg-red-100 text-red-900 border-red-200',
  'Дожим': 'bg-slate-200 text-slate-800 border-slate-300',
  'Неактивен': 'bg-slate-100 text-slate-600 border-slate-200',
};

export const CRM_STATUSES = Object.keys(STATUS_COLORS);

export const NICHE_SUGGESTIONS = [
  'Маникюр', 'Педикюр', 'Брови', 'Ресницы', 'Барбер', 'Парикмахер',
  'Косметолог', 'Массаж', 'Салон', 'Тату', 'Фитнес', 'Другое',
];

export const GUIDE_SECTIONS = [
  { id: 'instruction', label: 'Принципы', emoji: '📌' },
  { id: 'schedule', label: 'Расписание дня', emoji: '⏰' },
  { id: 'checklist', label: 'Чек-лист', emoji: '✅' },
  { id: 'rules', label: '10 правил', emoji: '📋' },
];
