const { chatCompletion } = require('./openRouter');
const { SITE_NAME, SITE_URL } = require('./config');
const { NICHE_CATALOG } = require('./niches');

function resolveNicheFromSlug(slug) {
  for (const n of NICHE_CATALOG) {
    if (slug.includes(n.slugBase)) return n.genitive;
  }
  if (/yclients|dikidi|altegio/i.test(slug)) return 'мастеров услуг и салонов';
  return 'мастеров услуг';
}

function categoryLabel(category) {
  const map = {
    crm: 'CRM для клиентов',
    'online-booking': 'онлайн-запись',
    'client-management': 'управление клиентами',
    'beauty-business': 'бьюти-бизнес',
    automation: 'автоматизация',
    compare: 'сравнение сервисов',
  };
  return map[category] || 'онлайн-запись и CRM';
}

function extractJson(text) {
  const raw = String(text || '').trim();
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced ? fenced[1].trim() : raw;
  const start = candidate.indexOf('{');
  const end = candidate.lastIndexOf('}');
  if (start === -1 || end === -1) {
    throw new Error('JSON не найден в ответе модели');
  }
  const jsonStr = candidate.slice(start, end + 1);
  try {
    return JSON.parse(jsonStr);
  } catch (err) {
    // Модель иногда обрывает JSON — пробуем закрыть незавершённые структуры
    const repaired = jsonStr.replace(/,\s*$/, '').replace(/,\s*([}\]])/g, '$1');
    const openBraces = (repaired.match(/{/g) || []).length - (repaired.match(/}/g) || []).length;
    const openBrackets = (repaired.match(/\[/g) || []).length - (repaired.match(/]/g) || []).length;
  const closed = repaired + ']'.repeat(Math.max(0, openBrackets)) + '}'.repeat(Math.max(0, openBraces));
    try {
      return JSON.parse(closed);
    } catch {
      throw new Error(`JSON не распарсен: ${err.message}`);
    }
  }
}

function normalizeSections(sections) {
  if (!Array.isArray(sections)) return [];
  return sections
    .map((s) => ({
      h2: String(s.h2 || s.title || '').trim(),
      body: String(s.body || s.text || '').trim(),
      bullets: Array.isArray(s.bullets)
        ? s.bullets.map((b) => String(b).trim()).filter(Boolean).slice(0, 6)
        : [],
    }))
    .filter((s) => s.h2 && s.body)
    .slice(0, 6);
}

function normalizeFaq(faq) {
  if (!Array.isArray(faq)) return [];
  return faq
    .map((item) => ({
      q: String(item.q || item.question || '').trim(),
      a: String(item.a || item.answer || '').trim(),
    }))
    .filter((item) => item.q && item.a)
    .slice(0, 6);
}

function validateArticlePayload(data) {
  const errors = [];
  if (!data.h1 || data.h1.length < 10) errors.push('h1');
  if (!data.intro || data.intro.length < 200) errors.push('intro');
  if (!data.meta_description || data.meta_description.length < 80) errors.push('meta_description');
  if (normalizeSections(data.sections).length < 3) errors.push('sections');
  if (normalizeFaq(data.faq).length < 3) errors.push('faq');
  return errors;
}

function buildSeoPrompt(article) {
  const niche = resolveNicheFromSlug(article.slug);
  const topic = article.h1 || article.title;
  const cat = categoryLabel(article.category);

  return `Ты — SEO-редактор и эксперт по бьюти-бизнесу и сервисам записи клиентов в России.
Напиши полноценную статью для блога ${SITE_NAME} (${SITE_URL}) на русском языке.

Тема статьи: ${topic}
URL slug: ${article.slug}
Категория: ${cat}
Целевая аудитория: владельцы бизнеса и мастера (${niche})

Требования SEO и качества:
1. Уникальный экспертный текст, без воды и клише. Объём intro + sections: 1200–2000 слов.
2. Естественное упоминание ${SITE_NAME} 2–4 раза (онлайн-запись, CRM, Telegram/MAX) — без агрессивной рекламы.
3. meta_description: 140–160 символов, с ключевым запросом, без кавычек.
4. title: до 58 символов, без бренда (бренд добавим отдельно).
5. Ровно 4–5 разделов sections с h2, развёрнутым body (2–4 абзаца) и 3–5 bullets где уместно.
6. FAQ: 4–5 вопросов из реальной практики целевой аудитории.
7. Пиши для людей, не для роботов. Без английских слов без перевода (CRM, Telegram, MAX — допустимы).
8. Не выдумывай факты о законах; общие формулировки про 152-ФЗ допустимы.

Верни ТОЛЬКО валидный JSON без markdown:
{
  "title": "заголовок до 58 символов",
  "meta_description": "описание 140-160 символов",
  "h1": "заголовок H1",
  "intro": "вступление 2-3 абзаца",
  "sections": [{"h2": "...", "body": "...", "bullets": ["..."]}],
  "faq": [{"q": "...", "a": "..."}]
}`;
}

/**
 * @param {object} article — строка из seo_articles или каталога
 */
async function generateSeoArticleWithAi(article) {
  let lastError;
  for (let attempt = 1; attempt <= 2; attempt += 1) {
    try {
      const { content, model } = await chatCompletion({
        messages: [
          {
            role: 'system',
            content: 'Ты возвращаешь только JSON. Никакого текста до или после JSON.',
          },
          { role: 'user', content: buildSeoPrompt(article) },
        ],
        temperature: attempt === 1 ? 0.7 : 0.5,
        maxTokens: 6000,
        responseFormat: { type: 'json_object' },
      });

      const parsed = extractJson(content);
      const errors = validateArticlePayload(parsed);
      if (errors.length) {
        throw new Error(`Невалидный ответ AI: ${errors.join(', ')}`);
      }

      const sections = normalizeSections(parsed.sections);
      const faq = normalizeFaq(parsed.faq);
      const titleBase = String(parsed.title || article.h1).trim();
      const title = titleBase.includes(SITE_NAME) ? titleBase : `${titleBase} | ${SITE_NAME}`;

      let meta = String(parsed.meta_description || '').trim();
      if (meta.length > 165) meta = `${meta.slice(0, 157).trim()}…`;

      return {
        title,
        meta_description: meta,
        h1: String(parsed.h1 || article.h1).trim(),
        intro: String(parsed.intro).trim(),
        sections,
        faq,
        toc: sections.map((s, i) => ({ id: `section-${i}`, label: s.h2 })),
        content_source: 'ai',
        ai_model: model,
      };
    } catch (err) {
      lastError = err;
      console.warn(`[seo-ai] attempt ${attempt} for ${article.slug}: ${err.message}`);
    }
  }
  throw lastError;
}

module.exports = {
  generateSeoArticleWithAi,
  resolveNicheFromSlug,
  buildSeoPrompt,
};
