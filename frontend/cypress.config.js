import { defineConfig } from 'cypress';

export default defineConfig({
  e2e: {
    baseUrl: process.env.CYPRESS_BASE_URL || 'https://woner.ru',
    viewportWidth: 375,
    viewportHeight: 667,
    video: false,
    screenshotOnRunFailure: true,
    defaultCommandTimeout: 15000,
    pageLoadTimeout: 45000,
    setupNodeEvents(on, config) {
      return config;
    },
  },
});
