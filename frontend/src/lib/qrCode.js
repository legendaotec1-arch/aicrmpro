import QRCode from 'qrcode';

const QR_OPTS = {
  margin: 2,
  errorCorrectionLevel: 'H',
  color: { dark: '#0f172a', light: '#ffffff' }
};

/** Data URL для превью в интерфейсе */
export function qrPreviewDataUrl(url, size = 200) {
  return QRCode.toDataURL(url, { ...QR_OPTS, width: size });
}

/** Скачать PNG для визитки / печати (высокое разрешение) */
export async function downloadBookingQrPng(url, filename = 'qr-zapis.png') {
  const dataUrl = await QRCode.toDataURL(url, { ...QR_OPTS, width: 1200 });
  const link = document.createElement('a');
  link.href = dataUrl;
  link.download = filename;
  link.rel = 'noopener';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export function qrFilenameFromSalon(salonName) {
  const base = String(salonName || 'zapis')
    .trim()
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40) || 'zapis';
  return `qr-${base}.png`;
}
