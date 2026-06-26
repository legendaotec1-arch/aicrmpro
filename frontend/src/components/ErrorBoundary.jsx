import React from 'react';
import { Sentry } from '../instrument.js';
import { isDomGlitchError } from '../lib/domGlitch.js';
import { bootLog } from '../lib/bootLog.js';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, domRecovering: false };
    this.domRecoverAttempted = false;
  }

  static getDerivedStateFromError(error) {
    if (isDomGlitchError(error)) {
      return { hasError: false, domRecovering: true };
    }
    return { hasError: true, domRecovering: false };
  }

  componentDidCatch(error, errorInfo) {
    if (isDomGlitchError(error)) {
      bootLog('DOM_GLITCH_CAUGHT', { message: error?.message });
      if (!this.domRecoverAttempted && typeof window.__wonerRecoverFromDomGlitch === 'function') {
        this.domRecoverAttempted = true;
        window.setTimeout(() => {
          window.__wonerRecoverFromDomGlitch();
          this.setState({ domRecovering: false });
        }, 0);
      }
      return;
    }

    console.error('Ошибка приложения:', error, errorInfo);

    if (import.meta.env.VITE_SENTRY_DSN && !window.__wonerSentryOff) {
      Sentry.captureException(error, {
        contexts: { react: { componentStack: errorInfo.componentStack } },
      });
    }
  }

  render() {
    if (this.state.domRecovering) {
      return null;
    }

    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center bg-white text-slate-800">
          <p className="text-base font-semibold">Не удалось загрузить страницу</p>
          <p className="mt-2 text-sm text-slate-500 max-w-md">
            Попробуйте обновить страницу. Если не поможет — откройте ссылку в другом браузере.
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="mt-5 rounded-xl bg-[#6A5ACD] px-5 py-2.5 text-sm font-semibold text-white"
          >
            Обновить
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
