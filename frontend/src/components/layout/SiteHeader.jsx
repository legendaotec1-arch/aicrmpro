import { Link } from 'react-router-dom';
import Logo from '../brand/Logo';
import Button from '../ui/Button';

/** Фиксированная шапка лендинга и юридических страниц */
export default function SiteHeader({ showCta = true, backLink }) {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 border-b border-violet-100/80 bg-white/95 shadow-sm shadow-violet-100/30 backdrop-blur-lg supports-[backdrop-filter]:bg-white/90">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-3 py-3 sm:py-4 sm:px-4 lg:px-8 overflow-hidden">
        <Link to="/" className="shrink-0">
          <Logo />
        </Link>

        <div className="flex items-center gap-2 sm:gap-3">
          {backLink}
          {showCta && (
            <>
              <Link to="/login">
                <Button variant="primary" size="md" className="px-4">
                  Войти
                </Button>
              </Link>
              <Link to="/register">
                <Button size="sm" className="hidden xs:inline-flex whitespace-nowrap px-4">
                  Попробовать
                </Button>
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

/** Отступ под фиксированную шапку */
export const SITE_HEADER_OFFSET = 'pt-[4.25rem] sm:pt-[4.5rem]';
