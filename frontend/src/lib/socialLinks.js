/** Подсказки для полей в настройках мастера */
export const MASTER_SOCIAL_FIELDS = [
  {
    key: 'social_telegram',
    label: 'Telegram',
    placeholder: '@username или t.me/ваш_канал',
    hint: 'Канал, чат или профиль в Telegram'
  },
  {
    key: 'social_instagram',
    label: 'Instagram',
    placeholder: '@username или ссылка на профиль',
    hint: 'Профиль или страница в Instagram*'
  },
  {
    key: 'social_vk',
    label: 'ВКонтакте',
    placeholder: 'vk.com/ваша_группа',
    hint: 'Группа или страница ВКонтакте'
  },
  {
    key: 'social_website',
    label: 'Сайт',
    placeholder: 'https://ваш-сайт.ru',
    hint: 'Личный сайт или лендинг'
  },
  {
    key: 'social_max',
    label: 'MAX',
    placeholder: 'max.ru/ваш_канал',
    hint: 'Канал или бот в MAX'
  }
];

export function hasSocialLinks(links) {
  return Array.isArray(links) && links.length > 0;
}
