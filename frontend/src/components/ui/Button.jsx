const sizes = {
  sm: 'px-3 py-1.5 text-xs rounded-lg',
  md: 'px-4 py-2.5 text-sm rounded-xl',
  lg: 'px-6 py-3.5 text-sm rounded-xl'
};

export default function Button({
  children,
  variant = 'primary',
  size = 'md',
  className = '',
  loading = false,
  disabled,
  ...props
}) {
  const variants = {
    primary:
      'bg-admin-accent text-white hover:bg-admin-accentHover shadow-sm',
    secondary:
      'bg-white text-admin-text border border-admin-border hover:bg-admin-hover shadow-sm',
    ghost: 'text-admin-textMuted hover:bg-admin-hover hover:text-admin-text',
    danger: 'bg-red-500 text-white hover:bg-red-600',
    soft: 'bg-admin-accentSoft text-admin-accent hover:bg-teal-100',
    dark: 'bg-gray-800 text-white hover:bg-gray-700'
  };

  return (
    <button
      type="button"
      disabled={disabled || loading}
      className={`inline-flex items-center justify-center gap-2 font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-admin-accent focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${variants[variant] || variants.primary} ${sizes[size]} ${className}`}
      {...props}
    >
      {loading && (
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
      )}
      {children}
    </button>
  );
}
