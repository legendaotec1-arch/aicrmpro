export function scrollToSection(sectionId) {
  if (!sectionId) return;
  const el = document.getElementById(sectionId);
  if (!el) return;
  el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  window.history.replaceState(null, '', `/#${sectionId}`);
}
