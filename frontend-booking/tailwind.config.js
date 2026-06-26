import parent from '../frontend/tailwind.config.js';

/** @type {import('tailwindcss').Config} */
export default {
  ...parent,
  content: [
    './index.html',
    './src/**/*.{js,jsx}',
    '../frontend/src/**/*.{js,jsx}',
  ],
};
