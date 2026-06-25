import React from 'react';
import { Sentry } from '../instrument.js';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Ошибка приложения:', error, errorInfo);
    if (import.meta.env.VITE_SENTRY_DSN && !window.__wonerSentryOff) {
      Sentry.captureException(error, {
        contexts: { react: { componentStack: errorInfo.componentStack } },
      });
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center bg-admin-bg text-admin-text">
          <h2 className="text-lg font-semibold">Что-то пошло не так</h2>
          <p className="mt-2 text-sm text-admin-textSecondary max-w-md">
            {this.state.error?.message || 'Не удалось загрузить страницу'}
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="mt-5 rounded-xl bg-admin-accent px-5 py-2.5 text-sm font-semibold text-white"
          >
            Попробовать снова
          </button>
          <p className="mt-4 text-xs text-admin-textMuted">
            Если ошибка повторяется, очистите кэш браузера или откройте сайт в новой вкладке.
          </p>
        </div>
      );
    }

    return this.props.children;
  }
}
