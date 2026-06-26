/**
 * mobile-woner.cy.js
 * Полная мобильная проверка публичных страниц Woner.ru
 *
 * Запуск:
 *   npm run cypress:run:woner
 *   CYPRESS_BASE_URL=http://localhost:5173 npm run cypress:run:woner
 *   CYPRESS_MASTER_ID=uuid npm run cypress:run:woner
 */

// Пресеты Cypress 13 (iphone-15, samsung-s24 и т.п. в Cypress нет)
const DEVICES = [
  { name: 'iPhone SE', preset: 'iphone-se2' },
  { name: 'iPhone X', preset: 'iphone-x' },
  { name: 'Galaxy S10', preset: 'samsung-s10' },
];

const MASTER_ID = Cypress.env('MASTER_ID') || 'c2d0fe2a-d3ca-4899-aa5b-4c444777e781';

const PAGES = [
  {
    name: 'Главная',
    url: '/',
    cta: () => cy.contains('a', 'Начать бесплатно').should('be.visible'),
    checkTouch: 'main a[href="/register"]',
  },
  {
    name: 'Вход мастера',
    url: '/login',
    cta: () => cy.contains('button', 'Получить код').should('be.visible'),
    checkTouch: 'form button[type="submit"]',
    skipPadding: true,
  },
  {
    name: 'Регистрация',
    url: '/register',
    cta: () => cy.get('input[type="email"]').first().should('be.visible'),
    checkTouch: 'form button[type="submit"]',
    skipPadding: true,
  },
  {
    name: 'Блог',
    url: '/blog',
    cta: () => cy.contains('h1', 'Блог', { timeout: 20000 }).should('be.visible'),
    skipImages: true,
    skipPadding: true,
  },
  {
    name: 'Страница записи мастера',
    url: `/m/${MASTER_ID}`,
    cta: () => cy.get('.client-shell', { timeout: 25000 }).should('exist'),
    skipPadding: true,
    skipImages: true,
  },
];

describe('Woner.ru — мобильная версия (публичные страницы)', () => {
  DEVICES.forEach(({ name, preset }) => {
    context(name, () => {
      beforeEach(() => {
        cy.viewport(preset);
      });

      PAGES.forEach((page) => {
        context(page.name, () => {
          beforeEach(() => {
            cy.visit(page.url, { failOnStatusCode: false });
          });

          it('meta viewport корректен', () => {
            cy.assertViewportMeta();
          });

          it('нет горизонтальной прокрутки', () => {
            cy.assertNoHorizontalScroll();
          });

          it('основной контент и CTA видны', () => {
            page.cta();
          });

          it('секции имеют горизонтальные отступы', function () {
            if (page.skipPadding) this.skip();
            cy.get('main section:visible').should('have.length.at.least', 1).first().then(($el) => {
              const pl = parseFloat($el.css('padding-left')) || 0;
              const pr = parseFloat($el.css('padding-right')) || 0;
              expect(pl + pr).to.be.at.least(8);
            });
          });

          it('кнопки достаточного размера (≥44px)', function () {
            if (!page.checkTouch) this.skip();
            cy.assertTouchTargets(page.checkTouch);
          });

          it('видимые изображения не битые', function () {
            if (page.skipImages) this.skip();
            cy.get('body').then(($body) => {
              const $imgs = $body.find('img:visible');
              if ($imgs.length === 0) return;
              [...$imgs].slice(0, 6).forEach((img) => {
                expect(img.naturalWidth, img.getAttribute('src')).to.be.gt(0);
              });
            });
          });
        });
      });
    });
  });

  describe('Производительность', () => {
    it('главная загружается за разумное время', () => {
      cy.viewport('iphone-x');
      const start = Date.now();
      cy.visit('/');
      cy.contains('h1', 'Сервис онлайн записи клиентов').should('be.visible');
      cy.then(() => {
        const ms = Date.now() - start;
        cy.log(`Время до первого контента: ${ms} мс`);
        expect(ms).to.be.lessThan(12000);
      });
    });
  });
});
