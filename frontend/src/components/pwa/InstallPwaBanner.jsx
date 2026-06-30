import { useEffect, useState } from 'react';
import { BookOpen, Download, X, CheckCircle2 } from 'lucide-react';
import Button from '../ui/Button';
import Modal from '../ui/Modal';

const DISMISS_KEY = 'woner_pwa_install_dismissed';
const SHOW_EVENT = 'woner:show-pwa-banner';

export function showInstallPwaBanner() {
  sessionStorage.removeItem(DISMISS_KEY);
  window.dispatchEvent(new CustomEvent(SHOW_EVENT));
}

const IOS_STEPS = [
  ['Обновите iOS', 'Настройки → Основные → Обновление ПО → последняя версия.'],
  ['Откройте Safari', 'Зайдите на woner.ru — не из Telegram и не из других приложений.'],
  ['Войдите в кабинет', 'Нажмите «Вход» и авторизуйтесь (email и пароль мастера).'],
  ['«Поделиться»', 'Кнопка внизу: квадрат со стрелкой вверх.'],
  ['«На экран Домой»', 'Пролистайте меню вниз, если не видно.'],
  ['«Добавить»', 'Название Woner.ru → «Добавить».'],
  ['Готово', 'Иконка на рабочем столе — кабинет откроется в один тап.'],
  ['Белый экран', 'Удалите старую иконку → снова «На экран Домой» из Safari после входа.']
];

const ANDROID_STEPS = [
  ['Откройте Chrome', 'Зайдите на woner.ru — не из Telegram.'],
  ['Войдите в кабинет', '«Вход» → email и пароль мастера.'],
  ['Меню ⋮', 'Три точки справа вверху.'],
  ['Установить', '«Установить приложение» или «На главный экран».'],
  ['Подтвердить', '«Установить» — название Woner.ru.'],
  ['Готово', 'Иконка на главном экране — кабинет в один тап.']
];

const TAB_STYLES = {
  ios: {
    active: 'bg-white text-sky-700 shadow-sm ring-1 ring-sky-100',
    accent: 'bg-sky-500',
    tip: 'border-sky-200 bg-sky-50 text-sky-900',
    line: 'bg-sky-200'
  },
  android: {
    active: 'bg-white text-emerald-700 shadow-sm ring-1 ring-emerald-100',
    accent: 'bg-emerald-500',
    tip: 'border-emerald-200 bg-emerald-50 text-emerald-900',
    line: 'bg-emerald-200'
  }
};

function isIos() {
  if (typeof navigator === 'undefined') return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}

function isStandalone() {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
}

function StepTimeline({ steps, tab }) {
  const style = TAB_STYLES[tab];
  return (
    <ol className="space-y-0">
      {steps.map(([title, text], index) => {
        const isLast = index === steps.length - 1;
        return (
          <li key={title} className="relative flex gap-2.5 pb-3 last:pb-0">
            {!isLast ? (
              <span
                className={`absolute left-[0.85rem] top-6 h-[calc(100%-0.25rem)] w-px ${style.line}`}
                aria-hidden
              />
            ) : null}
            <span
              className={`relative z-[1] flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-[11px] font-bold text-white ${style.accent}`}
            >
              {index + 1}
            </span>
            <div className="min-w-0 flex-1 rounded-xl bg-slate-50 px-3 py-2 ring-1 ring-slate-200/70">
              <p className="text-xs font-semibold leading-snug text-admin-text">{title}</p>
              <p className="mt-0.5 text-[11px] leading-relaxed text-admin-textSecondary">{text}</p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

function InstallInstructionsModal({ open, onClose, defaultTab }) {
  const [tab, setTab] = useState(defaultTab);

  useEffect(() => {
    if (open) setTab(defaultTab);
  }, [open, defaultTab]);

  const style = TAB_STYLES[tab];
  const steps = tab === 'ios' ? IOS_STEPS : ANDROID_STEPS;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Установка Woner.ru"
      description="Кабинет мастера с главного экрана"
      size="md"
      footer={
        <Button onClick={onClose} className="w-full sm:w-auto">
          <CheckCircle2 className="h-4 w-4" />
          Понятно
        </Button>
      }
    >
      <div className="grid grid-cols-2 gap-1 rounded-xl bg-slate-100 p-1">
        <button
          type="button"
          onClick={() => setTab('ios')}
          className={`rounded-lg px-2 py-2 text-xs font-semibold transition sm:text-sm ${
            tab === 'ios' ? TAB_STYLES.ios.active : 'text-admin-textSecondary'
          }`}
        >
          iPhone / iPad
        </button>
        <button
          type="button"
          onClick={() => setTab('android')}
          className={`rounded-lg px-2 py-2 text-xs font-semibold transition sm:text-sm ${
            tab === 'android' ? TAB_STYLES.android.active : 'text-admin-textSecondary'
          }`}
        >
          Android
        </button>
      </div>

      {tab === 'ios' ? (
        <p className={`mt-3 rounded-xl border px-3 py-2 text-[11px] font-medium leading-relaxed ${style.tip}`}>
          Обновите iOS до последней версии — иначе «На экран Домой» может не появиться.
        </p>
      ) : null}

      <div className="mt-3">
        <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-admin-textMuted">
          {steps.length} шагов · {tab === 'ios' ? 'Safari' : 'Chrome'}
        </p>
        <StepTimeline steps={steps} tab={tab} />
      </div>
    </Modal>
  );
}

export default function InstallPwaBanner() {
  const [visible, setVisible] = useState(false);
  const [instructionsOpen, setInstructionsOpen] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState(null);

  useEffect(() => {
    if (isStandalone()) return;
    // Временно скрываем на iPhone — «На экран Домой» ломает загрузку в Safari.
    if (isIos()) return;

    const show = () => {
      sessionStorage.removeItem(DISMISS_KEY);
      setVisible(true);
    };

    if (sessionStorage.getItem(DISMISS_KEY) !== '1') {
      setVisible(true);
    }

    const onBeforeInstall = (event) => {
      event.preventDefault();
      setDeferredPrompt(event);
      show();
    };

    window.addEventListener('beforeinstallprompt', onBeforeInstall);
    window.addEventListener(SHOW_EVENT, show);
    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstall);
      window.removeEventListener(SHOW_EVENT, show);
    };
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
    <>
      <div className="relative mb-3 overflow-hidden rounded-2xl border border-violet-100 bg-white/85 p-3 shadow-sm backdrop-blur-sm sm:mb-4 sm:p-4">
        <div className="flex items-center gap-3">
          <div className="flex shrink-0 -space-x-2">
            <img src="/images/store-app-store.png" alt="" className="h-9 w-9 rounded-lg object-cover ring-2 ring-white" />
            <img src="/images/store-google-play.png" alt="" className="h-9 w-9 rounded-lg object-cover ring-2 ring-white" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-admin-text">Приложение на телефоне</p>
            <p className="text-xs text-admin-textSecondary">Кабинет в один тап с главного экрана</p>
          </div>
          <button
            type="button"
            onClick={dismiss}
            className="shrink-0 rounded-lg p-1.5 text-admin-textMuted hover:bg-slate-100"
            aria-label="Скрыть"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {deferredPrompt && (
            <Button size="sm" onClick={install}>
              <Download className="h-4 w-4" />
              Установить
            </Button>
          )}
          <Button size="sm" variant="secondary" onClick={() => setInstructionsOpen(true)}>
            <BookOpen className="h-4 w-4" />
            Как установить
          </Button>
        </div>
      </div>

      <InstallInstructionsModal
        open={instructionsOpen}
        onClose={() => setInstructionsOpen(false)}
        defaultTab={isIos() ? 'ios' : 'android'}
      />
    </>
  );
}
