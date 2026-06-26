import { Fragment } from 'react';
import { BRAND_NAME, BRAND_TLD, BRAND_WORD } from '../../config/brand';

const TEXT_CLASS_RE = /\btext-[\w\[\]#%/.\-]+(?:\/\d+)?\b/g;

export default function BrandName({
  className = '',
  light = false,
  as: Tag = 'span',
  style,
  tldClassName,
  ...props
}) {
  const textClasses = className.match(TEXT_CLASS_RE) || [];
  const wrapperClasses = className.replace(TEXT_CLASS_RE, '').replace(/\s+/g, ' ').trim();
  const nameClass = light ? 'text-white' : textClasses[0] || 'text-inherit';
  const tldClass = tldClassName ?? (light ? 'text-white/85' : 'text-[#2b2b2b]');

  return (
    <Tag style={style} className={`font-bold ${wrapperClasses}`.trim()} {...props}>
      <span className={nameClass}>{BRAND_WORD}</span>
      <span className={tldClass}>{BRAND_TLD}</span>
    </Tag>
  );
}

/** Вставляет жирный Woner.ru в произвольный текст */
export function RichBrandText({ text, brandClassName = '', brandTldClassName }) {
  if (!text || !text.includes(BRAND_NAME)) return text;
  const parts = text.split(BRAND_NAME);
  return (
    <>
      {parts.map((part, i) => (
        <Fragment key={i}>
          {part}
          {i < parts.length - 1 && (
            <BrandName className={brandClassName} tldClassName={brandTldClassName} />
          )}
        </Fragment>
      ))}
    </>
  );
}

export { BRAND_NAME };
