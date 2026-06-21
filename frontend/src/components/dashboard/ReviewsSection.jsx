import { useEffect, useState } from 'react';
import Card, { CardHeader } from '../ui/Card';
import Button from '../ui/Button';
import Textarea from '../ui/Textarea';
import Badge from '../ui/Badge';
import { PageLoader } from '../ui/Spinner';
import { formatDate } from '../../lib/format';
import { ReviewPhotoFullscreen, ReviewPhotoThumbnails } from '../client/ReviewPhotoGallery';

function Stars({ value }) {
  return (
    <span className="text-amber-400 text-sm" aria-label={`${value} из 5`}>
      {'★'.repeat(value)}{'☆'.repeat(5 - value)}
    </span>
  );
}

function ReviewItem({ r, replyId, replyText, setReplyId, setReplyText, onTogglePublish, onSaveReply, onPhotoPreview }) {
  const isPending = r.is_published === false;

  return (
    <li
      className={`rounded-2xl border p-4 ${
        isPending ? 'border-amber-400/30 bg-warning-soft' : 'border-admin-border bg-admin-card'
      }`}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <Stars value={r.rating} />
          <p className="font-semibold text-white mt-1">{r.client_name || r.client_db_name || 'Клиент'}</p>
          <p className="text-xs text-slate-500">
            {formatDate(r.created_at)}
            {r.salon_master_name && ` · ${r.salon_master_name}`}
          </p>
        </div>
        {isPending ? (
          <Badge tone="warning">На модерации</Badge>
        ) : r.is_published ? (
          <Badge tone="success">На сайте</Badge>
        ) : (
          <Badge tone="neutral">Скрыт</Badge>
        )}
      </div>
      {r.body && <p className="mt-2 text-sm text-slate-400">{r.body}</p>}
      <ReviewPhotoThumbnails urls={r.photo_urls} onPreview={onPhotoPreview} size="sm" />
      {r.salon_reply && replyId !== r.id && (
        <p className="mt-2 text-sm bg-accent-soft rounded-lg px-3 py-2 text-slate-200">
          <span className="font-medium">Ваш ответ: </span>{r.salon_reply}
        </p>
      )}
      {replyId === r.id ? (
        <div className="mt-3 space-y-2">
          <Textarea value={replyText} onChange={(e) => setReplyText(e.target.value)} rows={2} placeholder="Ответ салона..." />
          <div className="flex gap-2">
            <Button size="sm" onClick={() => onSaveReply(r.id)}>Сохранить</Button>
            <Button size="sm" variant="secondary" onClick={() => setReplyId(null)}>Отмена</Button>
          </div>
        </div>
      ) : (
        <div className="mt-3 flex flex-wrap gap-2">
          {isPending && (
            <Button size="sm" onClick={() => onTogglePublish(r.id, true)}>
              Опубликовать на сайте
            </Button>
          )}
          <Button size="sm" variant="soft" onClick={() => { setReplyId(r.id); setReplyText(r.salon_reply || ''); }}>
            Ответить
          </Button>
          {!isPending && (
            <Button size="sm" variant="ghost" onClick={() => onTogglePublish(r.id, !r.is_published)}>
              {r.is_published ? 'Скрыть' : 'Показать на сайте'}
            </Button>
          )}
          {isPending && (
            <Button size="sm" variant="ghost" onClick={() => onTogglePublish(r.id, false)}>
              Отклонить (скрыть)
            </Button>
          )}
        </div>
      )}
    </li>
  );
}

export default function ReviewsSection({ api, toast, onBadgesChange }) {
  const [loading, setLoading] = useState(true);
  const [reviews, setReviews] = useState([]);
  const [replyId, setReplyId] = useState(null);
  const [replyText, setReplyText] = useState('');
  const [photoPreview, setPhotoPreview] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.get('/master/me/reviews');
      setReviews(res.data);
      onBadgesChange?.();
    } catch {
      toast('Не удалось загрузить отзывы', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const togglePublish = async (id, is_published) => {
    try {
      await api.put(`/master/me/reviews/${id}`, { is_published });
      toast(is_published ? 'Отзыв опубликован' : 'Отзыв скрыт');
      load();
    } catch {
      toast('Ошибка', 'error');
    }
  };

  const saveReply = async (id) => {
    try {
      await api.put(`/master/me/reviews/${id}`, { salon_reply: replyText });
      toast('Ответ сохранён');
      setReplyId(null);
      setReplyText('');
      load();
    } catch {
      toast('Ошибка сохранения', 'error');
    }
  };

  if (loading) return <PageLoader />;

  const pending = reviews.filter((r) => r.is_published === false);
  const published = reviews.filter((r) => r.is_published !== false);

  return (
    <Card>
      <CardHeader
        title="Отзывы"
        description="Новые отзывы сначала на модерации — опубликуйте, чтобы они появились на странице записи"
      />
      {reviews.length === 0 ? (
        <p className="text-sm text-slate-500 py-8 text-center">Отзывов пока нет</p>
      ) : (
        <div className="space-y-8">
          {pending.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-amber-400 mb-3">
                На модерации ({pending.length})
              </h3>
              <ul className="space-y-4">
                {pending.map((r) => (
                  <ReviewItem
                    key={r.id}
                    r={r}
                    replyId={replyId}
                    replyText={replyText}
                    setReplyId={setReplyId}
                    setReplyText={setReplyText}
                    onTogglePublish={togglePublish}
                    onSaveReply={saveReply}
                    onPhotoPreview={(url) => setPhotoPreview(url)}
                  />
                ))}
              </ul>
            </div>
          )}
          {published.length > 0 && (
            <div>
              {pending.length > 0 && (
                <h3 className="text-sm font-semibold text-white mb-3">Опубликованные</h3>
              )}
              <ul className="space-y-4">
                {published.map((r) => (
                  <ReviewItem
                    key={r.id}
                    r={r}
                    replyId={replyId}
                    replyText={replyText}
                    setReplyId={setReplyId}
                    setReplyText={setReplyText}
                    onTogglePublish={togglePublish}
                    onSaveReply={saveReply}
                    onPhotoPreview={(url) => setPhotoPreview(url)}
                  />
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
      <ReviewPhotoFullscreen url={photoPreview} onClose={() => setPhotoPreview(null)} />
    </Card>
  );
}
