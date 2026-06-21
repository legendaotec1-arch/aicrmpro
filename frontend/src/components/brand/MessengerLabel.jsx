import MaxLogo from './MaxLogo';
import { IconTelegram } from './SocialBrandIcons';

const SIZES = {
  xs: { logo: 'h-3.5 w-3.5', icon: 'h-3.5 w-3.5', text: 'text-xs' },
  sm: { logo: 'h-4 w-4', icon: 'h-4 w-4', text: 'text-xs' },
  md: { logo: 'h-5 w-5', icon: 'h-5 w-5', text: 'text-sm' },
  lg: { logo: 'h-6 w-6', icon: 'h-6 w-6', text: 'text-sm' }
};

export default function MessengerLabel({
  channel,
  showName = true,
  size = 'sm',
  className = ''
}) {
  const s = SIZES[size] || SIZES.sm;
  const isMax = channel === 'max';
  const isTelegram = channel === 'telegram';

  return (
    <span className={`inline-flex items-center gap-1.5 font-semibold ${s.text} ${className}`}>
      {isMax && <MaxLogo className={s.logo} />}
      {isTelegram && <IconTelegram className={s.icon} />}
      {showName && <span>{isMax ? 'MAX' : isTelegram ? 'Telegram' : channel}</span>}
    </span>
  );
}
