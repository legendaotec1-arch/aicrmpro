export const CRM_SHEETS = [
  { id: 'instruction', label: 'Инструкция' },
  { id: 'main', label: 'Основной' },
  { id: 'scripts', label: 'Скрипты' },
  { id: 'answers', label: 'Ответы' },
  { id: 'followup', label: 'Дожим' },
  { id: 'analytics', label: 'Аналитика' },
  { id: 'search', label: 'Поиск' },
  { id: 'schedule', label: 'Расписание' },
  { id: 'checklist', label: 'Чек-лист' },
  { id: 'rules', label: 'Правила' },
];

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

export const LEAD_COLUMNS = [
  { key: 'lead_date', label: 'Дата', type: 'date', minWidth: 130 },
  { key: 'platform', label: 'Платформа', type: 'platform', minWidth: 140 },
  { key: 'contact', label: 'Контакт', type: 'text', minWidth: 160, placeholder: '@username' },
  { key: 'name', label: 'Имя', type: 'text', minWidth: 140 },
  { key: 'city', label: 'Город', type: 'text', minWidth: 120 },
  { key: 'niche', label: 'Ниша', type: 'text', minWidth: 140, placeholder: 'маникюр, барбер…' },
  { key: 'status', label: 'Статус', type: 'status', minWidth: 130 },
  { key: 'note', label: 'Примечание', type: 'textarea', minWidth: 200 },
];

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

export const SCRIPT_HEADERS = ['№', 'Для кого', 'Название', 'Текст сообщения'];
export const ANSWER_HEADERS = ['Что сказал клиент', 'Ваш ответ'];
export const SEARCH_HEADERS = ['Способ поиска', 'Где искать', 'Пример запроса'];

export const NICHE_SUGGESTIONS = [
  'Маникюр', 'Педикюр', 'Брови', 'Ресницы', 'Барбер', 'Парикмахер',
  'Косметолог', 'Массаж', 'Салон', 'Тату', 'Фитнес', 'Другое',
];
