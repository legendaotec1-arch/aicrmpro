import { useEffect, useState } from 'react';
import axios from 'axios';
import { withClientAuth } from '../../lib/clientApi';
import { ImagePlus, X, Star } from 'lucide-react';
import { formatDate } from '../../lib/format';
import { ReviewPhotoFullscreen, ReviewPhotoThumbnails } from './ReviewPhotoGallery';

const MAX_REVIEW_PHOTOS = 3;
const PREMIUM = {
  accent: '#6A5ACD',
  accentLight: '#5A4CBD',
  accentSoft: 'rgba(106, 90, 205, 0.1)',
  bgSoft: 'rgba(220, 220, 220, 0.5)',
  textPrimary: '#1A1A1A',
  textSecondary: '#666666',
  textMuted: '#999999',
  bgCard: 'rgba(255, 255, 255, 0.92)',
  borderLight: 'rgba(0, 0, 0, 0.08)',
  shadowCard: '0 2px 16px rgba(0, 0, 0, 0.04)',
  radiusCard: '28px',
  radiusSlot: '16px',
  transition: 'all 0.2s ease-out',
};

function StarsInteractive({ value, onChange }) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onChange?.(n)}
          style={{
            fontSize: '28px',
            transition: PREMIUM.transition,
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            padding: '0',
            lineHeight: '1',
          }}
        >
          <Star
            size={28}
            fill={n <= value ? '#F59E0B' : 'transparent'}
            color={n <= value ? '#F59E0B' : '#D1D5DB'}
            strokeWidth={1.5}
          />
        </button>
      ))}
    </div>
  );
}

function StarsDisplay({ value }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          size={16}
          fill={n <= value ? '#F59E0B' : 'transparent'}
          color={n <= value ? '#F59E0B' : '#D1D5DB'}
          strokeWidth={1.5}
        />
      ))}
    </div>
  );
}

export default function ClientReviewsPanel({
  reviews,
  reviewSummary,
  masterId,
  clientAuth,
  formData,
  onSubmitted
}) {
  const [rating, setRating] = useState(5);
  const [body, setBody] = useState('');
  const [photos, setPhotos] = useState([]);
  const [sending, setSending] = useState(false);
  const [previewUrl, setPreviewUrl] = useState(null);

  useEffect(() => {
    return () => {
      photos.forEach((p) => {
        if (p.preview) URL.revokeObjectURL(p.preview);
      });
    };
  }, [photos]);

  const addPhotos = (fileList) => {
    const room = MAX_REVIEW_PHOTOS - photos.length;
    if (room <= 0) return;
    const incoming = Array.from(fileList || [])
      .filter((f) => f.type.startsWith('image/'))
      .slice(0, room)
      .map((file) => ({
        id: `${Date.now()}-${Math.random()}`,
        file,
        preview: URL.createObjectURL(file)
      }));
    setPhotos((prev) => [...prev, ...incoming]);
  };

  const removePhoto = (id) => {
    setPhotos((prev) => {
      const item = prev.find((p) => p.id === id);
      if (item?.preview) URL.revokeObjectURL(item.preview);
      return prev.filter((p) => p.id !== id);
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!clientAuth) return;
    setSending(true);
    try {
      const fd = new FormData();
      fd.append('masterId', masterId);
      fd.append('channel', clientAuth.channel);
      fd.append('userId', clientAuth.userId);
      fd.append('rating', String(rating));
      if (body.trim()) fd.append('body', body.trim());
      if (formData?.name) fd.append('clientName', formData.name);
      if (clientAuth.channel === 'telegram') fd.append('telegramUserId', clientAuth.userId);
      else fd.append('maxUserId', clientAuth.userId);
      photos.forEach((p) => fd.append('photos', p.file));

      await axios.post('/api/client/reviews', fd, withClientAuth(clientAuth));
      setBody('');
      photos.forEach((p) => {
        if (p.preview) URL.revokeObjectURL(p.preview);
      });
      setPhotos([]);
      onSubmitted?.();
      alert('Спасибо! Отзыв отправлен на модерацию — появится на сайте после проверки салоном.');
    } catch (err) {
      alert(err.response?.data?.error || 'Не удалось отправить отзыв');
    } finally {
      setSending(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Summary Header */}
      {reviewSummary?.count > 0 && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          padding: '16px 20px',
          background: PREMIUM.bgCard,
          borderRadius: PREMIUM.radiusSlot,
          boxShadow: PREMIUM.shadowCard,
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}>
            <Star size={20} fill="#F59E0B" color="#F59E0B" strokeWidth={1.5} />
            <span style={{ fontSize: '24px', fontWeight: '800', color: PREMIUM.textPrimary }}>
              {reviewSummary.average || '—'}
            </span>
          </div>
          <span style={{ fontSize: '14px', color: PREMIUM.textSecondary }}>
            ({reviewSummary.count} {reviewSummary.count === 1 ? 'отзыв' : reviewSummary.count < 5 ? 'отзыва' : 'отзывов'})
          </span>
        </div>
      )}

      {/* Reviews List */}
      {reviews?.length > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {reviews.map((r) => (
            <div
              key={r.id}
              style={{
                padding: '20px',
                background: PREMIUM.bgCard,
                borderRadius: PREMIUM.radiusSlot,
                boxShadow: PREMIUM.shadowCard,
                border: `1px solid ${PREMIUM.borderLight}`,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                <StarsDisplay value={r.rating} />
                <span style={{ fontSize: '12px', color: PREMIUM.textMuted }}>
                  {formatDate(r.created_at)}
                </span>
              </div>

              <p style={{
                fontSize: '15px',
                fontWeight: '600',
                color: PREMIUM.textPrimary,
                marginBottom: '8px',
              }}>
                {r.client_name || 'Клиент'}
              </p>

              {r.body && (
                <p style={{
                  fontSize: '14px',
                  color: PREMIUM.textSecondary,
                  lineHeight: '1.5',
                  marginBottom: '12px',
                }}>
                  {r.body}
                </p>
              )}

              <ReviewPhotoThumbnails urls={r.photo_urls} onPreview={(url) => setPreviewUrl(url)} />

              {r.salon_reply && (
                <div style={{
                  marginTop: '12px',
                  padding: '12px 16px',
                  background: PREMIUM.accentSoft,
                  borderRadius: '12px',
                  borderLeft: `3px solid ${PREMIUM.accent}`,
                }}>
                  <p style={{ fontSize: '12px', fontWeight: '600', color: PREMIUM.accent, marginBottom: '4px' }}>
                    Ответ салона
                  </p>
                  <p style={{ fontSize: '14px', color: PREMIUM.textPrimary, lineHeight: '1.4' }}>
                    {r.salon_reply}
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div style={{
          padding: '32px',
          textAlign: 'center',
          background: PREMIUM.bgCard,
          borderRadius: PREMIUM.radiusSlot,
          boxShadow: PREMIUM.shadowCard,
        }}>
          <p style={{ fontSize: '14px', color: PREMIUM.textMuted }}>
            Отзывов пока нет — будьте первым!
          </p>
        </div>
      )}

      {/* Review Form */}
      <form
        onSubmit={handleSubmit}
        style={{
          padding: '20px',
          background: 'rgba(255, 255, 255, 0.98)',
          borderRadius: PREMIUM.radiusSlot,
          border: `2px solid ${PREMIUM.accent}`,
          boxShadow: `0 4px 24px rgba(106, 90, 205, 0.15)`,
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
        }}
      >
        <p style={{ fontSize: '16px', fontWeight: '700', color: PREMIUM.textPrimary }}>
          Оставить отзыв
        </p>

        <StarsInteractive value={rating} onChange={setRating} />

        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Расскажите о визите..."
          rows={3}
          style={{
            width: '100%',
            padding: '12px 16px',
            fontSize: '14px',
            border: `1px solid ${PREMIUM.borderLight}`,
            borderRadius: '16px',
            background: 'rgba(255,255,255,0.8)',
            color: PREMIUM.textPrimary,
            resize: 'none',
            outline: 'none',
            fontFamily: 'inherit',
            transition: PREMIUM.transition,
          }}
          onFocus={(e) => e.target.style.borderColor = PREMIUM.accent}
          onBlur={(e) => e.target.style.borderColor = PREMIUM.borderLight}
        />

        {/* Photo Upload */}
        <div>
          <p style={{ fontSize: '13px', fontWeight: '600', color: PREMIUM.textSecondary, marginBottom: '10px' }}>
            Фото (до {MAX_REVIEW_PHOTOS} шт.)
          </p>

          {photos.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginBottom: '12px' }}>
              {photos.map((p) => (
                <div
                  key={p.id}
                  style={{
                    position: 'relative',
                    width: '72px',
                    height: '72px',
                    borderRadius: '12px',
                    overflow: 'hidden',
                    border: `1px solid ${PREMIUM.borderLight}`,
                  }}
                >
                  <img src={p.preview} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  <button
                    type="button"
                    onClick={() => removePhoto(p.id)}
                    style={{
                      position: 'absolute',
                      right: '4px',
                      top: '4px',
                      width: '22px',
                      height: '22px',
                      borderRadius: '50%',
                      background: 'rgba(0,0,0,0.6)',
                      border: 'none',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <X size={12} color="#fff" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {photos.length < MAX_REVIEW_PHOTOS && (
            <label style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '12px 20px',
              border: `1.5px dashed ${PREMIUM.borderLight}`,
              borderRadius: '14px',
              background: 'rgba(255,255,255,0.6)',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '600',
              color: PREMIUM.accent,
              transition: PREMIUM.transition,
            }}>
              <ImagePlus size={18} />
              Добавить фото
              <input
                type="file"
                accept="image/*"
                multiple
                style={{ display: 'none' }}
                onChange={(e) => {
                  addPhotos(e.target.files);
                  e.target.value = '';
                }}
              />
            </label>
          )}
        </div>

        <button
          type="submit"
          disabled={sending}
          style={{
            width: '100%',
            padding: '14px 24px',
            background: sending ? PREMIUM.bgSoft : `linear-gradient(135deg, ${PREMIUM.accent} 0%, ${PREMIUM.accentLight} 100%)`,
            color: '#fff',
            fontSize: '15px',
            fontWeight: '700',
            border: 'none',
            borderRadius: '14px',
            cursor: sending ? 'not-allowed' : 'pointer',
            boxShadow: `0 4px 16px rgba(106, 90, 205, 0.3)`,
            transition: PREMIUM.transition,
          }}
        >
          {sending ? 'Отправка...' : 'Отправить отзыв'}
        </button>
      </form>

      <ReviewPhotoFullscreen url={previewUrl} onClose={() => setPreviewUrl(null)} />
    </div>
  );
}
