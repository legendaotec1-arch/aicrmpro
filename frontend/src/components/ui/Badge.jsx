import MessengerLabel from '../brand/MessengerLabel';

const tones = {
  success: 'bg-green-100 text-green-800',
  danger: 'bg-red-100 text-red-800',
  warning: 'bg-amber-100 text-amber-800',
  neutral: 'bg-gray-100 text-gray-600',
  brand: 'bg-teal-100 text-teal-800',
  primary: 'bg-admin-accent text-white',
  max: 'bg-gray-100 text-gray-600',
  telegram: 'bg-sky-100 text-sky-800'
};

export default function Badge({ children, tone = 'neutral', className = '' }) {
  const isMessenger = tone === 'max' || tone === 'telegram';

  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${tones[tone]} ${className}`}
    >
      {isMessenger ? (
        <MessengerLabel channel={tone} size="xs" />
      ) : (
        children
      )}
    </span>
  );
}
