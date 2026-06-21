/** Обёртка для единого стиля иконок (лендинг, кабинет) */
export default function IconBox({
  children,
  size = 'md',
  variant = 'soft',
  className = ''
}) {
  const sizes = {
    sm: 'h-9 w-9 rounded-lg [&_svg]:h-4 [&_svg]:w-4',
    md: 'h-11 w-11 rounded-xl [&_svg]:h-5 [&_svg]:w-5',
    lg: 'h-14 w-14 rounded-2xl [&_svg]:h-7 [&_svg]:w-7',
    xl: 'h-[68px] w-[68px] rounded-full [&_svg]:h-7 [&_svg]:w-7'
  };

  const variants = {
    soft: 'bg-violet-50 text-primary',
    gradient: 'bg-gradient-to-br from-violet-600 to-blue-500 text-white shadow-lg shadow-violet-200/60',
    dark: 'bg-slate-800 text-violet-300 ring-4 ring-white/10',
    white: 'bg-white/15 text-white backdrop-blur-sm',
    trust: 'bg-slate-100 text-slate-600'
  };

  return (
    <div
      className={`flex shrink-0 items-center justify-center ${sizes[size]} ${variants[variant]} ${className}`}
    >
      {children}
    </div>
  );
}
