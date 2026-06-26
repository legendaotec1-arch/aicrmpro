/** Проверяет корректный viewport meta-тег (обязателен для мобильной вёрстки). */
Cypress.Commands.add('assertViewportMeta', () => {
  cy.document().then((doc) => {
    const meta = doc.querySelector('meta[name="viewport"]');
    expect(meta, 'meta viewport').to.exist;
    const content = meta.getAttribute('content') || '';
    expect(content).to.include('width=device-width');
    expect(content).to.match(/initial-scale\s*=\s*1/);
  });
});

/** Нет горизонтальной прокрутки (контент не вылезает за экран). */
Cypress.Commands.add('assertNoHorizontalScroll', () => {
  cy.window().then((win) => {
    const { scrollWidth, clientWidth } = win.document.documentElement;
    expect(scrollWidth, 'scrollWidth').to.equal(clientWidth);
  });
});

/** Элемент не перекрыт другими слоями и кликабелен. */
Cypress.Commands.add('assertClickable', { prevSubject: 'element' }, (subject) => {
  cy.wrap(subject).should('be.visible').click({ force: false });
});

/** Видимые кнопки не меньше minPx по высоте (Apple HIG ≈ 44px). */
Cypress.Commands.add('assertTouchTargets', (selector, minPx = 44) => {
  cy.get(selector).filter(':visible').then(($els) => {
    if ($els.length === 0) return;
    const sample = [...$els].slice(0, 6);
    sample.forEach((el) => {
      const height = el.getBoundingClientRect().height;
      expect(height, el.textContent?.trim().slice(0, 40)).to.be.at.least(minPx);
    });
  });
});
