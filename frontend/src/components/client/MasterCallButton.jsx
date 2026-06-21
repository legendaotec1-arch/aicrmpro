import { Phone } from 'lucide-react';
import Button from '../ui/Button';
import { toTelHref } from '../../lib/phoneRu';

export default function MasterCallButton({ phone, size = 'lg', className = '', buttonClassName = '', variant = 'default' }) {
  const href = toTelHref(phone);
  if (!href) return null;

  const premium =
    '!border !border-white/40 !bg-white/80 !text-terracotta shadow-sm backdrop-blur-sm hover:!bg-white focus-visible:!ring-terracotta/30';
  const warm =
    '!border !border-amber-200 !bg-[#FFFBF7] !text-amber-900 shadow-sm hover:!bg-amber-50 focus-visible:!ring-amber-500/30';
  const theme =
    '!border !shadow-sm !bg-[var(--ct-call-bg)] !text-[var(--ct-call-text)] !border-[var(--ct-call-border)] hover:opacity-90';
  const defaultStyle =
    '!border-0 !bg-emerald-600 !text-white shadow-md shadow-emerald-600/30 hover:!bg-emerald-700 focus-visible:!ring-emerald-500/40';

  const variantClass =
    variant === 'premium' ? premium :
    variant === 'theme' ? theme :
    variant === 'warm' ? warm : defaultStyle;

  return (
    <a href={href} className={className}>
      <Button
        size={size}
        type="button"
        className={`w-full ${variantClass} ${buttonClassName}`}
      >
        <Phone className="h-4 w-4 shrink-0" />
        Позвонить
      </Button>
    </a>
  );
}