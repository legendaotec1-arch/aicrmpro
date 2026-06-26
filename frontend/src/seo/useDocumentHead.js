import { useEffect } from 'react';

const MARKER = 'data-woner-doc-head';
const DEFAULT_OG = 'https://woner.ru/images/og-image.jpg';

function safeRemove(node) {
  try {
    if (node?.parentNode) {
      node.parentNode.removeChild(node);
    }
  } catch {
    // Узел уже удалён — игнорируем.
  }
}

function appendHeadNode(tag, attrs) {
  const el = document.createElement(tag);
  el.setAttribute(MARKER, '');
  Object.entries(attrs).forEach(([key, value]) => {
    if (value != null) el.setAttribute(key, value);
  });
  document.head.appendChild(el);
  return el;
}

/**
 * Управление <head> без react-helmet-async — избегает NotFoundError removeChild
 * на /m/:slug при быстром mount/unmount и replace-навигации.
 */
export function useDocumentHead(config) {
  const title = config?.title ?? '';
  const description = config?.description ?? '';
  const canonical = config?.canonical ?? '';
  const robots = config?.robots ?? 'index, follow';
  const ogImage = config?.ogImage ?? DEFAULT_OG;
  const hreflang = config?.hreflang ?? 'ru';
  const jsonLdBlocks = config?.jsonLdBlocks ?? [];
  const jsonLdKey = jsonLdBlocks.length ? JSON.stringify(jsonLdBlocks) : '';

  useEffect(() => {
    if (!title) return undefined;

    let cancelled = false;
    let nodes = [];
    const prevTitle = document.title;
    const prevLang = document.documentElement.getAttribute('lang');

    const apply = () => {
      if (cancelled) return;

      const url = canonical || 'https://woner.ru';
      document.title = title;
      document.documentElement.setAttribute('lang', hreflang);

      if (description) {
        nodes.push(appendHeadNode('meta', { name: 'description', content: description }));
      }
      nodes.push(appendHeadNode('meta', { name: 'robots', content: robots }));
      nodes.push(appendHeadNode('link', { rel: 'canonical', href: url }));
      nodes.push(appendHeadNode('link', { rel: 'alternate', href: url, hreflang }));
      nodes.push(appendHeadNode('link', { rel: 'alternate', href: url, hreflang: 'x-default' }));
      nodes.push(appendHeadNode('meta', { property: 'og:type', content: 'website' }));
      nodes.push(appendHeadNode('meta', { property: 'og:title', content: title }));
      if (description) {
        nodes.push(appendHeadNode('meta', { property: 'og:description', content: description }));
      }
      nodes.push(appendHeadNode('meta', { property: 'og:url', content: url }));
      nodes.push(appendHeadNode('meta', { property: 'og:image', content: ogImage }));
      nodes.push(appendHeadNode('meta', { property: 'og:locale', content: 'ru_RU' }));
      nodes.push(appendHeadNode('meta', { name: 'twitter:card', content: 'summary_large_image' }));
      nodes.push(appendHeadNode('meta', { name: 'twitter:title', content: title }));
      if (description) {
        nodes.push(appendHeadNode('meta', { name: 'twitter:description', content: description }));
      }
      nodes.push(appendHeadNode('meta', { name: 'twitter:image', content: ogImage }));

      if (jsonLdBlocks.length) {
        jsonLdBlocks.forEach((block) => {
          if (!block) return;
          const script = document.createElement('script');
          script.type = 'application/ld+json';
          script.setAttribute(MARKER, '');
          script.textContent = JSON.stringify(block);
          document.head.appendChild(script);
          nodes.push(script);
        });
      }
    };

    const rafId = requestAnimationFrame(apply);

    return () => {
      cancelled = true;
      cancelAnimationFrame(rafId);
      document.title = prevTitle;
      if (prevLang) document.documentElement.setAttribute('lang', prevLang);
      else document.documentElement.removeAttribute('lang');
      nodes.forEach(safeRemove);
      nodes = [];
    };
  }, [title, description, canonical, robots, ogImage, hreflang, jsonLdKey]);
}
