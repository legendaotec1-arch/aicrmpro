import { useEffect, useState } from 'react';
import { mediaUrl } from '../../lib/media';
import { formatSalonMasterInitials, formatSalonMasterName } from '../../lib/masterDisplay';

export default function SalonMasterAvatar({
  master,
  size = 72,
  radius,
  style = {},
  fallbackStyle = {},
  shadow,
  className = ''
}) {
  const [failed, setFailed] = useState(false);
  const photoPath = master?.photo_url;
  const src = photoPath && !failed ? mediaUrl(photoPath) : null;
  const borderRadius = radius ?? (size >= 64 ? 18 : size >= 48 ? 16 : 12);
  const fontSize = size >= 72 ? 22 : size >= 56 ? 20 : size >= 40 ? 16 : 13;

  useEffect(() => {
    setFailed(false);
  }, [master?.id, photoPath]);

  const boxStyle = {
    width: size,
    height: size,
    borderRadius,
    overflow: 'hidden',
    flexShrink: 0,
    boxShadow: shadow,
    ...style
  };

  if (src) {
    return (
      <div className={className} style={boxStyle}>
        <img
          src={src}
          alt={formatSalonMasterName(master)}
          loading={size >= 56 ? 'eager' : 'lazy'}
          decoding="async"
          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
          onError={() => setFailed(true)}
        />
      </div>
    );
  }

  return (
    <div
      className={className}
      style={{
        ...boxStyle,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize,
        fontWeight: 700,
        ...fallbackStyle
      }}
      aria-hidden={!master}
    >
      {formatSalonMasterInitials(master)}
    </div>
  );
}
