import { useEffect, useState } from 'react';
import { Download, Share, Smartphone, X } from 'lucide-react';
import Button from '../ui/Button';

const DISMISS_KEY = 'woner_pwa_install_dismissed';

function isIos() {
  if (typeof navigator === 'undefined') return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}

function isStandalone() {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
}

export default function InstallPwaBanner() {
  const [visible, setVisible] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [ios, setIos] = useState(false);

  useEffect(() => {
    if (isStandalone() || sessionStorage.getItem(DISMISS_KEY) === '1') return;

    setIos(isIos());
    setVisible(true);

    const onBeforeInstall = (event) => {
      event.preventDefault();
      setDeferredPrompt(event);
      setVisible(true);
    };

    window.addEventListener('beforeinstallprompt', onBeforeInstall);
    return () => window.removeEventListener('beforeinstallprompt', onBeforeInstall);
  }, []);

  const dismiss = () => {
    sessionStorage.setItem(DISMISS_KEY, '1');
    setVisible(false);
  };

  const install = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    setDeferredPrompt(null);
    dismiss();
  };

  if (!visible || isStandalone()) return null;

  return (
    <div className="mb-4 overflow-hidden rounded-2xl border border-violet-200 bg-gradient-to-r from-violet-50 via-white to-indigo-50 p-4 shadow-sm">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-600 text-white">
          <Smartphone className="h-5 w-5" strokeWidth={1.75} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-admin-text">Установите Woner.ru на телефон</p>
          <p className="mt-1 text-sm text-admin-textSecondary">
            {ios
              ? 'Safari → «Поделиться» → «На экран Домой». Откроется как приложение без адресной строки.'
              : 'Добавьте на главный экран — кабинет мастера будет открываться в один тап.'}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {deferredPrompt && (
              <Button size="sm" onClick={install}>
                <Download className="h-4 w-4" />
                Установить
              </Button>
            )}
            {ios && (
              <span className="inline-flex items-center gap-1.5 rounded-xl bg-white px-3 py-2 text-xs font-medium text-violet-700 ring-1 ring-violet-200">
                <Share className="h-3.5 w-3.5" />
                Поделиться → На экран Домой
              </span>
            )}
          </div>
        </div>
        <button
          type="button"
          onClick={dismiss}
          className="shrink-0 rounded-lg p-1 text-admin-textMuted transition hover:bg-violet-100 hover:text-admin-text"
          aria-label="Скрыть"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
