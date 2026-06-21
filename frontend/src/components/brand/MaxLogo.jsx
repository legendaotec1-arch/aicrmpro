export const MAX_LOGO_SRC = '/images/max-logo.png';

export default function MaxLogo({ className = 'h-6 w-6', alt = 'MAX' }) {
  return (
    <img
      src={MAX_LOGO_SRC}
      alt={alt}
      className={`object-contain select-none ${className}`}
      draggable={false}
    />
  );
}
