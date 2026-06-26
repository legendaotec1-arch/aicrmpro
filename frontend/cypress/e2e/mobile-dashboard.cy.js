/**
 * Кабинет мастера — мобильная вёрстка (требует авторизации).
 *
 *   CYPRESS_MASTER_TOKEN=eyJ... npm run cypress:run:mobile
 */

const MOBILE_DEVICES = [
  { name: 'iPhone X', preset: 'iphone-x' },
  { name: 'Galaxy S10', preset: 'samsung-s10' },
];

const dashboardSuite = Cypress.env('MASTER_TOKEN') ? describe : describe.skip;

function seedAuth(win) {
  win.localStorage.setItem('token', Cypress.env('MASTER_TOKEN'));
}

dashboardSuite('Мобильная версия Woner.ru — кабинет мастера', () => {
  MOBILE_DEVICES.forEach(({ name, preset }) => {
    context(name, () => {
      beforeEach(() => {
        cy.viewport(preset);
        cy.visit('/dashboard', { onBeforeLoad: seedAuth });
      });

      it('не зависает на бесконечной «Загрузка»', () => {
        cy.get('.dashboard-mobile-tabbar', { timeout: 30000 }).should('be.visible');
        cy.contains('p', 'Загрузка...').should('not.exist');
      });

      it('нижняя навигация видна и кликабельна', () => {
        cy.get('.dashboard-mobile-tabbar').should('be.visible');
        cy.contains('.dashboard-mobile-tabbar button', 'Записи').click();
        cy.contains('h2', 'Записи').should('be.visible');
      });

      it('контент имеет нижний отступ под tab bar', () => {
        cy.get('.dashboard-mobile-main').then(($main) => {
          const paddingBottom = parseFloat($main.css('padding-bottom')) || 0;
          expect(paddingBottom, 'padding-bottom').to.be.at.least(64);
        });
      });

      it('шапка не перекрывает контент', () => {
        cy.get('.dashboard-mobile-header-offset').then(($wrap) => {
          const paddingTop = parseFloat($wrap.css('padding-top')) || 0;
          expect(paddingTop, 'padding-top').to.be.at.least(56);
        });
      });
    });
  });
});
