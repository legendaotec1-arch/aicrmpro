import { Globe } from 'lucide-react';
import { IconTelegram, IconVk, IconInstagram } from '../brand/SocialBrandIcons';
import MaxLogo from '../brand/MaxLogo';
import { hasSocialLinks } from '../../lib/socialLinks';

const STYLES = {
  telegram: {
    ring: 'ring-sky-200/80 hover:ring-sky-400',
    bg: 'bg-white shadow-md shadow-sky-100/80',
    label: 'Telegram'
  },
  instagram: {
    ring: 'ring-pink-200/80 hover:ring-pink-400',
    bg: 'bg-gradient-to-br from-[#F58529] via-[#DD2A7B] to-[#8134AF] shadow-md shadow-pink-200/50',
    label: 'Instagram'
  },
  vk: {
    ring: 'ring-blue-200/80 hover:ring-blue-500',
    bg: 'bg-white shadow-md shadow-blue-100/80',
    label: 'ВКонтакте'
  },
  website: {
    ring: 'ring-violet-200/80 hover:ring-violet-400',
    bg: 'bg-gradient-to-br from-violet-500 to-indigo-600 shadow-md shadow-violet-200/50',
    label: 'Сайт'
  },
  max: {
    ring: 'ring-slate-300/80 hover:ring-slate-500',
    bg: 'bg-white shadow-md shadow-slate-200/80',
    label: 'MAX'
  }
};

function SocialIcon({ id }) {
  const imgFill = 'block size-full object-cover';
  switch (id) {
    case 'telegram':
      return <IconTelegram className={imgFill} alt="" />;
    case 'instagram':
      return <IconInstagram className="size-full text-white" />;
    case 'vk':
      return <IconVk className={imgFill} alt="" />;
    case 'max':
      return <MaxLogo className={imgFill} alt="" />;
    case 'website':
      return <Globe className="size-full text-white" strokeWidth={1.75} />;
    default:
      return null;
  }
}

function SocialButton({ link }) {
  const style = STYLES[link.id] || STYLES.website;
  const isWebsite = link.id === 'website';
  const isVector = link.id === 'instagram' || link.id === 'website';

  return (
    <a
      href={link.url}
      target="_blank"
      rel="noopener noreferrer"
      title={link.name}
      aria-label={link.name}
      className={`group relative flex h-14 w-14 shrink-0 overflow-hidden rounded-2xl ring-2 transition-all duration-200 hover:scale-105 hover:shadow-lg active:scale-95 sm:h-16 sm:w-16 ${style.ring} ${style.bg} ${isVector ? 'p-2.5' : 'p-0'}`}
    >
      <SocialIcon id={link.id} />
      <span
        className={`pointer-events-none absolute -bottom-6 left-1/2 hidden -translate-x-1/2 whitespace-nowrap rounded-lg px-2 py-0.5 text-[10px] font-semibold opacity-0 transition group-hover:opacity-100 sm:block ${
          link.id === 'instagram' || isWebsite ? 'bg-black/75 text-white' : 'ct-surface ct-text border ct-border shadow-sm'
        }`}
      >
        {style.label}
      </span>
    </a>
  );
}

export default function MasterSocialFollow({ links }) {
  if (!hasSocialLinks(links)) return null;

  return (
    <div className="mt-6 border-t border-[color-mix(in_srgb,var(--ct-border-soft)_70%,transparent)] pt-6">
      <p className="ct-text text-center text-sm font-semibold tracking-wide">Подпишись на нас:</p>
      <div className="mt-4 flex flex-wrap items-center justify-center gap-3 sm:gap-4">
        {links.map((link) => (
          <SocialButton key={link.id} link={link} />
        ))}
      </div>
      {links.some((l) => l.id === 'instagram') && (
        <p className="ct-text-muted mx-auto mt-4 max-w-xs text-center text-[10px] leading-relaxed">
          * Instagram — проект Meta, признан экстремистской организацией в РФ
        </p>
      )}
    </div>
  );
}
