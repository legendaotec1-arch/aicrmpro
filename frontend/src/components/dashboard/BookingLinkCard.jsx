import { useEffect, useState } from 'react';
import { Copy, Download, ExternalLink, Check, Link2 } from 'lucide-react';
import Button from '../ui/Button';
import { copyToClipboard } from '../../lib/clipboard';
import { downloadBookingQrPng, qrFilenameFromSalon, qrPreviewDataUrl } from '../../lib/qrCode';

const QR_SIZE = 112;
const glassControl =
  'rounded-xl border border-slate-200/90 bg-white/80 shadow-sm backdrop-blur-md';
const glassButton =
  '!border-slate-200/90 !bg-white/85 backdrop-blur-sm shadow-sm hover:!border-primary/35 hover:!bg-white';

export default function BookingLinkCard({
  url,
  salonName,
  onCopied,
  onQrError
}) {
  const [qrSrc, setQrSrc] = useState('');
  const [qrLoading, setQrLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!url) {
      setQrSrc('');
      setQrLoading(false);
      return undefined;
    }
    let cancelled = false;
    setQrLoading(true);
    qrPreviewDataUrl(url, QR_SIZE)
      .then((dataUrl) => {
        if (!cancelled) setQrSrc(dataUrl);
      })
      .catch(() => {
        if (!cancelled) setQrSrc('');
      })
      .finally(() => {
        if (!cancelled) setQrLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [url]);

  const handleCopy = async () => {
    if (!url) return;
    try {
      await copyToClipboard(url);
      setCopied(true);
      onCopied?.('Скопировано');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      onCopied?.('Не удалось скопировать', 'error');
    }
  };

  const handleDownloadQr = async () => {
    if (!url) return;
    setDownloading(true);
    try {
      await downloadBookingQrPng(url, qrFilenameFromSalon(salonName));
      onCopied?.('QR-код сохранён');
    } catch {
      onQrError?.('Не удалось создать QR-код');
    } finally {
      setDownloading(false);
    }
  };

  if (!url) return null;

  return (
    <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl">
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-[#F0F0F0] via-white to-violet-50/90" />
      <div className="pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full bg-violet-300/45 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-16 -left-16 h-48 w-48 rounded-full bg-blue-200/35 blur-3xl" />
      <div className="pointer-events-none absolute right-1/3 top-1/2 h-28 w-28 rounded-full bg-primary/15 blur-2xl" />

      <div className="relative card-glass !rounded-2xl !p-0 sm:!rounded-3xl">
        <div className="flex flex-col gap-4 p-4 md:flex-row md:items-center md:gap-5 md:p-5">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary shadow-sm ring-1 ring-white/60">
                <Link2 className="h-4 w-4" strokeWidth={2} />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-admin-text">Ваша ссылка</h3>
                <p className="text-xs text-admin-textSecondary">Для соцсетей, визитки и мессенджеров</p>
              </div>
            </div>

            <div className="mt-3 flex min-w-0 items-stretch gap-2">
              <div className={`${glassControl} flex min-w-0 flex-1 items-center gap-1 pl-3 pr-1 py-1.5`}>
                <p
                  className="min-w-0 flex-1 truncate font-mono text-xs text-admin-text sm:text-sm"
                  title={url}
                >
                  {url}
                </p>
                <button
                  type="button"
                  onClick={handleCopy}
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-transparent text-admin-textMuted transition hover:border-slate-200/90 hover:bg-white hover:text-primary sm:h-8 sm:w-8"
                  aria-label={copied ? 'Скопировано' : 'Копировать ссылку'}
                >
                  {copied ? <Check className="h-4 w-4 text-primary" /> : <Copy className="h-4 w-4" />}
                </button>
              </div>
              <a href={url} target="_blank" rel="noreferrer" className="shrink-0">
                <Button size="sm" variant="secondary" className={`h-full px-3 ${glassButton}`}>
                  <ExternalLink className="h-4 w-4" />
                  <span className="hidden sm:inline">Открыть</span>
                </Button>
              </a>
            </div>
          </div>

          <div className="flex items-center justify-between gap-3 border-t border-slate-200/70 pt-3 md:w-auto md:shrink-0 md:flex-col md:items-center md:gap-2 md:border-l md:border-t-0 md:pl-5 md:pt-0">
            <div className={`${glassControl} p-1.5`}>
              {qrLoading ? (
                <div
                  className="animate-pulse rounded-lg bg-white/50"
                  style={{ width: QR_SIZE, height: QR_SIZE }}
                />
              ) : qrSrc ? (
                <img
                  src={qrSrc}
                  alt="QR-код для записи"
                  width={QR_SIZE}
                  height={QR_SIZE}
                  className="rounded-lg"
                  style={{ width: QR_SIZE, height: QR_SIZE }}
                />
              ) : (
                <div
                  className="flex items-center justify-center rounded-lg bg-white/50 text-[10px] text-admin-textMuted"
                  style={{ width: QR_SIZE, height: QR_SIZE }}
                >
                  QR недоступен
                </div>
              )}
            </div>
            <Button
              size="sm"
              onClick={handleDownloadQr}
              loading={downloading}
              className="shadow-sm"
            >
              <Download className="h-4 w-4" />
              Скачать
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
