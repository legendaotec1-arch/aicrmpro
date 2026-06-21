export default function Logo({ className = '', light = false, iconOnly = false }) {
  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      {!iconOnly && (
        <span className={`font-display text-xl font-black tracking-tight ${light ? 'text-white' : 'text-ink'}`}>
          Wonder<span className={light ? 'text-violet-200' : 'text-primary'}>.ru</span>
        </span>
      )}
    </div>
  );
}
