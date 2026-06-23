import { useEffect, useState } from 'react';
import { BookOpen, Download, X } from 'lucide-react';
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
  ['Белый экран', 'Удалите старую иконку с экрана → снова «На экран Домой» из Safari после входа.']
];

const ANDROID_STEPS = [
  ['Откройте Chrome', 'Зайдите на woner.ru — не из Telegram.'],
  ['Войдите в кабинет', '«Вход» → email и пароль мастера.'],
  ['Меню ⋮', 'Три точки справа вверху.'],
  ['Установить', '«Установить приложение» или «На главный экран».'],
  ['Подтвердить', '«Установить» — название Woner.ru.'],
  ['Готово', 'Иконка на главном экране — кабинет в один тап.']
];

function isIos() {
  if (typeof navigator === 'undefined') return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}

function isStandalone() {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
}

function StepList({ steps, accent }) {
  return (
    <ol className="grid gap-2 sm:grid-cols-2">
      {steps.map(([title, text], index) => (
        <li key={title} className="flex gap-2.5 rounded-xl bg-slate-50 px-3 py-2.5">
          <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold text-white ${accent}`}>
            {index + 1}
          </span>
          <div className="min-w-0">
            <p className="text-sm font-semibold leading-tight text-admin-text">{title}</p>
            <p className="mt-0.5 text-xs leading-snug text-admin-textSecondary">{text}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}

function InstallInstructionsModal({ open, onClose, defaultTab }) {
  const [tab, setTab] = useState(defaultTab);

  useEffect(() => {
    if (open) setTab(defaultTab);
  }, [open, defaultTab]);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Как установить Woner.ru"
      size="lg"
      footer={null}
    >
      <div className="flex gap-1.5 rounded-xl bg-slate-100 p-1">
        <button
          type="button"
          onClick={() => setTab('ios')}
          className={`flex-1 rounded-lg px-3 py-2 text-sm font-semibold transition ${
            tab === 'ios' ? 'bg-white text-admin-text shadow-sm' : 'text-admin-textMuted hover:text-admin-text'
          }`}
        >
          iPhone / iPad
        </button>
        <button
          type="button"
          onClick={() => setTab('android')}
          className={`flex-1 rounded-lg px-3 py-2 text-sm font-semibold transition ${
            tab === 'android' ? 'bg-white text-admin-text shadow-sm' : 'text-admin-textMuted hover:text-admin-text'
          }`}
        >
          Android
        </button>
      </div>

      {tab === 'ios' ? (
        <div className="mt-3 space-y-3">
          <p className="rounded-xl border border-sky-200 bg-sky-50 px-3 py-2 text-xs font-medium leading-snug text-sky-900">
            Сначала обновите iOS до последней версии — иначе «На экран Домой» может не появиться.
          </p>
          <StepList steps={IOS_STEPS} accent="bg-sky-500" />
        </div>
      ) : (
        <div className="mt-3">
          <StepList steps={ANDROID_STEPS} accent="bg-emerald-500" />
        </div>
      )}
    </Modal>
  );
}

export default function InstallPwaBanner() {
  const [visible, setVisible] = useState(false);
  const [instructionsOpen, setInstructionsOpen] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [ios, setIos] = useState(false);

  useEffect(() => {
    if (isStandalone()) return;
    // Временно скрываем на iPhone — «На экран Домой» ломает загрузку в Safari.
    if (isIos()) return;

    setIos(isIos());

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
      <div className="mb-4 overflow-hidden rounded-2xl border border-violet-200 bg-gradient-to-r from-violet-50 via-white to-indigo-50 p-4 shadow-sm">
        <div className="flex items-start gap-3">
          <div className="flex shrink-0 items-center gap-1.5">
            <img
              src="/images/store-app-store.png"
              alt="App Store"
              className="h-10 w-10 rounded-[10px] object-cover shadow-sm ring-1 ring-black/5"
            />
            <img
              src="/images/store-google-play.png"
              alt="Google Play"
              className="h-10 w-10 rounded-[10px] object-cover shadow-sm ring-1 ring-black/5"
            />
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-admin-text">Установите Woner.ru на телефон</p>
            <p className="mt-1 text-sm text-admin-textSecondary">
              Кабинет на главном экране — открытие в один тап.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {deferredPrompt && (
                <Button size="sm" onClick={install}>
                  <Download className="h-4 w-4" />
                  Установить
                </Button>
              )}
              <Button size="sm" variant="secondary" onClick={() => setInstructionsOpen(true)}>
                <BookOpen className="h-4 w-4" />
                Инструкция
              </Button>
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

      <InstallInstructionsModal
        open={instructionsOpen}
        onClose={() => setInstructionsOpen(false)}
        defaultTab={ios ? 'ios' : 'android'}
      />
    </>
  );
}
