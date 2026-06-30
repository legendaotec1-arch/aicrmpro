import { useEffect, useState } from 'react';
import { Copy, Download, ExternalLink, Check, Share2 } from 'lucide-react';
import Button from '../ui/Button';
import { copyToClipboard } from '../../lib/clipboard';
import { downloadBookingQrPng, qrFilenameFromSalon, qrPreviewDataUrl } from '../../lib/qrCode';

const QR_SIZE = 96;

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
      onCopied?.('Ссылка скопирована');
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
    <section className="overflow-hidden rounded-[1.35rem] bg-white shadow-[0_12px_40px_rgba(106,90,205,0.12)] ring-1 ring-violet-100">
      <div className="border-b border-violet-50 bg-gradient-to-r from-violet-50/80 to-white px-4 py-3 sm:px-5">
        <div className="flex items-center gap-2">
          <Share2 className="h-4 w-4 text-violet-600" />
          <h2 className="text-sm font-bold text-admin-text">Ссылка для клиентов</h2>
        </div>
        <p className="mt-1 text-xs text-admin-textSecondary">Отправьте в соцсети, мессенджеры или на визитку</p>
      </div>

      <div className="grid gap-4 p-4 sm:grid-cols-[1fr_auto] sm:items-center sm:gap-5 sm:p-5">
        <div className="min-w-0 space-y-3">
          <div className="rounded-xl bg-slate-50 px-3 py-3 ring-1 ring-slate-200/80">
            <p className="break-all font-mono text-[13px] leading-relaxed text-admin-text">{url}</p>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Button onClick={handleCopy} className="col-span-2 sm:col-span-1">
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              {copied ? 'Скопировано' : 'Копировать'}
            </Button>
            <a href={url} target="_blank" rel="noreferrer">
              <Button variant="secondary" className="w-full">
                <ExternalLink className="h-4 w-4" />
                Открыть
              </Button>
            </a>
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 rounded-2xl bg-violet-50/60 p-3 ring-1 ring-violet-100 sm:flex-col sm:justify-center sm:p-4">
          <div className="rounded-xl bg-white p-2 shadow-sm ring-1 ring-violet-100">
            {qrLoading ? (
              <div className="h-24 w-24 animate-pulse rounded-lg bg-slate-100" />
            ) : qrSrc ? (
              <img src={qrSrc} alt="QR-код" width={QR_SIZE} height={QR_SIZE} className="rounded-lg" />
            ) : (
              <div className="flex h-24 w-24 items-center justify-center text-[10px] text-admin-textMuted">Нет QR</div>
            )}
          </div>
          <Button size="sm" variant="secondary" onClick={handleDownloadQr} loading={downloading} className="shrink-0">
            <Download className="h-4 w-4" />
            QR PNG
          </Button>
        </div>
      </div>
    </section>
  );
}
