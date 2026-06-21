import BrandName from './BrandName';

export default function Logo({ className = '', light = false, iconOnly = false }) {
  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      {!iconOnly && (
        <BrandName
          as="span"
          light={light}
          className={`font-display text-xl tracking-tight ${light ? '' : 'text-ink'}`}
        />
      )}
    </div>
  );
}
