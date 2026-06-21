import { useEffect, useMemo, useState } from 'react';
import { Eye, EyeOff, MessageSquare, Pencil, Star, Trash2 } from 'lucide-react';
import Card from '../ui/Card';
import Button from '../ui/Button';
import Textarea from '../ui/Textarea';
import Badge from '../ui/Badge';
import Modal from '../ui/Modal';
import EmptyState from '../ui/EmptyState';
import { PageLoader } from '../ui/Spinner';
import { formatDate } from '../../lib/format';
import { ReviewPhotoFullscreen, ReviewPhotoThumbnails } from '../client/ReviewPhotoGallery';

function Stars({ value, size = 'sm' }) {
  const cls = size === 'lg' ? 'text-lg' : 'text-sm';
  return (
    <span className={`${cls} text-amber-400`} aria-label={`${value} из 5`}>
      {'★'.repeat(value)}
      <span className="text-amber-200/80">{'☆'.repeat(5 - value)}</span>
    </span>
  );
}

function StarPicker({ value, onChange }) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(n)}
          className={`rounded-lg px-1.5 py-1 text-xl transition ${
            n <= value ? 'text-amber-400 hover:text-amber-500' : 'text-slate-200 hover:text-amber-200'
          }`}
          aria-label={`${n} звёзд`}
        >
          ★
        </button>
      ))}
    </div>
  );
}

function ReviewCard({
  review,
  onPublish,
  onHide,
  onEdit,
  onDelete,
  onPhotoPreview
}) {
  const isPending = review.is_published === false;
  const clientName = review.client_name || review.client_db_name || 'Клиент';

  return (
    <li
      className={`rounded-2xl border bg-white p-4 shadow-sm transition hover:shadow-md sm:p-5 ${
        isPending
          ? 'border-amber-200/80 ring-1 ring-amber-100'
          : 'border-admin-border/70 hover:border-violet-200/80'
      }`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <Stars value={review.rating} />
          <p className="mt-1.5 font-semibold text-admin-text">{clientName}</p>
          <p className="mt-0.5 text-xs text-admin-textMuted">
            {formatDate(review.created_at)}
            {review.salon_master_name && ` · ${review.salon_master_name}`}
          </p>
        </div>
        {isPending ? (
          <Badge tone="warning">Модерация</Badge>
        ) : review.is_published ? (
          <Badge tone="success">На сайте</Badge>
        ) : (
          <Badge tone="neutral">Скрыт</Badge>
        )}
      </div>

      {review.body && (
        <p className="mt-3 text-sm leading-relaxed text-admin-textSecondary">{review.body}</p>
      )}

      <ReviewPhotoThumbnails urls={review.photo_urls} onPreview={onPhotoPreview} size="sm" />

      {review.salon_reply && (
        <div className="mt-3 rounded-xl border border-violet-100 bg-violet-50/60 px-3.5 py-2.5">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-violet-600/80">Ваш ответ</p>
          <p className="mt-1 text-sm text-admin-text">{review.salon_reply}</p>
        </div>
      )}

      <div className="mt-4 flex flex-wrap gap-2 border-t border-admin-border/60 pt-4">
        {isPending && (
          <Button size="sm" onClick={() => onPublish(review.id)}>
            <Eye className="h-3.5 w-3.5" />
            Опубликовать
          </Button>
        )}
        {!isPending && (
          <Button
            size="sm"
            variant="soft"
            onClick={() => (review.is_published ? onHide(review.id) : onPublish(review.id))}
          >
            {review.is_published ? (
              <>
                <EyeOff className="h-3.5 w-3.5" />
                Скрыть
              </>
            ) : (
              <>
                <Eye className="h-3.5 w-3.5" />
                Показать
              </>
            )}
          </Button>
        )}
        {isPending && (
          <Button size="sm" variant="ghost" onClick={() => onHide(review.id)}>
            Отклонить
          </Button>
        )}
        <Button size="sm" variant="secondary" onClick={() => onEdit(review)}>
          <Pencil className="h-3.5 w-3.5" />
          Изменить
        </Button>
        <Button size="sm" variant="ghost" className="!text-red-600 hover:!bg-red-50" onClick={() => onDelete(review)}>
          <Trash2 className="h-3.5 w-3.5" />
          Удалить
        </Button>
      </div>
    </li>
  );
}

export default function ReviewsSection({ api, toast, onBadgesChange }) {
  const [loading, setLoading] = useState(true);
  const [reviews, setReviews] = useState([]);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [editTarget, setEditTarget] = useState(null);
  const [editForm, setEditForm] = useState({ rating: 5, body: '', salon_reply: '' });
  const [savingEdit, setSavingEdit] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

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

  const stats = useMemo(() => {
    const pending = reviews.filter((r) => r.is_published === false).length;
    const published = reviews.filter((r) => r.is_published === true).length;
    const avg =
      reviews.length > 0
        ? (reviews.reduce((s, r) => s + Number(r.rating || 0), 0) / reviews.length).toFixed(1)
        : null;
    return { pending, published, avg, total: reviews.length };
  }, [reviews]);

  const pending = reviews.filter((r) => r.is_published === false);
  const published = reviews.filter((r) => r.is_published !== false);

  const togglePublish = async (id, is_published) => {
    try {
      await api.put(`/master/me/reviews/${id}`, { is_published });
      toast(is_published ? 'Опубликовано' : 'Скрыто');
      load();
    } catch {
      toast('Ошибка', 'error');
    }
  };

  const openEdit = (review) => {
    setEditTarget(review);
    setEditForm({
      rating: review.rating || 5,
      body: review.body || '',
      salon_reply: review.salon_reply || ''
    });
  };

  const saveEdit = async () => {
    if (!editTarget) return;
    setSavingEdit(true);
    try {
      await api.put(`/master/me/reviews/${editTarget.id}`, {
        rating: editForm.rating,
        body: editForm.body.trim() || null,
        salon_reply: editForm.salon_reply.trim() || null
      });
      toast('Отзыв сохранён');
      setEditTarget(null);
      load();
    } catch {
      toast('Ошибка сохранения', 'error');
    } finally {
      setSavingEdit(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api.delete(`/master/me/reviews/${deleteTarget.id}`);
      toast('Отзыв удалён');
      setDeleteTarget(null);
      load();
    } catch {
      toast('Не удалось удалить', 'error');
    } finally {
      setDeleting(false);
    }
  };

  if (loading) return <PageLoader />;

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-admin-text sm:text-2xl">Отзывы</h1>
          <p className="mt-0.5 text-sm text-admin-textSecondary">
            Модерация, ответы и публикация на странице записи
          </p>
        </div>
        {stats.total > 0 && (
          <div className="flex flex-wrap gap-2">
            {stats.avg && (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-800">
                <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                {stats.avg} · {stats.total}
              </span>
            )}
            {stats.pending > 0 && (
              <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800">
                {stats.pending} на модерации
              </span>
            )}
          </div>
        )}
      </div>

      <Card className="overflow-hidden" padding={false}>
        {reviews.length === 0 ? (
          <div className="p-8">
            <EmptyState
              icon={<MessageSquare className="h-8 w-8 text-admin-accent" strokeWidth={1.5} />}
              title="Отзывов пока нет"
              description="Клиенты смогут оставить отзыв после визита"
            />
          </div>
        ) : (
          <div className="space-y-6 p-4 sm:p-5">
            {pending.length > 0 && (
              <section>
                <div className="mb-3">
                  <h2 className="text-sm font-bold text-admin-text">На модерации · {pending.length}</h2>
                  <p className="text-xs text-admin-textMuted">Опубликуйте или отклоните</p>
                </div>
                <ul className="space-y-3">
                  {pending.map((r) => (
                    <ReviewCard
                      key={r.id}
                      review={r}
                      onPublish={(id) => togglePublish(id, true)}
                      onHide={(id) => togglePublish(id, false)}
                      onEdit={openEdit}
                      onDelete={setDeleteTarget}
                      onPhotoPreview={setPhotoPreview}
                    />
                  ))}
                </ul>
              </section>
            )}

            {published.length > 0 && (
              <section>
                {pending.length > 0 && (
                  <h2 className="mb-3 text-sm font-bold text-admin-text">Опубликованные</h2>
                )}
                <ul className="space-y-3">
                  {published.map((r) => (
                    <ReviewCard
                      key={r.id}
                      review={r}
                      onPublish={(id) => togglePublish(id, true)}
                      onHide={(id) => togglePublish(id, false)}
                      onEdit={openEdit}
                      onDelete={setDeleteTarget}
                      onPhotoPreview={setPhotoPreview}
                    />
                  ))}
                </ul>
              </section>
            )}
          </div>
        )}
      </Card>

      <Modal
        open={!!editTarget}
        onClose={() => setEditTarget(null)}
        title="Редактировать отзыв"
        footer={
          <>
            <Button variant="secondary" onClick={() => setEditTarget(null)} disabled={savingEdit}>
              Отмена
            </Button>
            <Button onClick={saveEdit} loading={savingEdit}>
              Сохранить
            </Button>
          </>
        }
      >
        {editTarget && (
          <div className="space-y-4">
            <p className="text-sm text-admin-textSecondary">
              {editTarget.client_name || editTarget.client_db_name || 'Клиент'} ·{' '}
              {formatDate(editTarget.created_at)}
            </p>
            <div>
              <p className="label-field mb-2">Оценка</p>
              <StarPicker
                value={editForm.rating}
                onChange={(rating) => setEditForm((f) => ({ ...f, rating }))}
              />
            </div>
            <Textarea
              label="Текст отзыва"
              value={editForm.body}
              onChange={(e) => setEditForm((f) => ({ ...f, body: e.target.value }))}
              rows={4}
              placeholder="Текст от клиента..."
            />
            <Textarea
              label="Ваш ответ"
              value={editForm.salon_reply}
              onChange={(e) => setEditForm((f) => ({ ...f, salon_reply: e.target.value }))}
              rows={3}
              placeholder="Ответ на странице записи..."
            />
          </div>
        )}
      </Modal>

      <Modal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Удалить отзыв?"
        footer={
          <>
            <Button variant="secondary" onClick={() => setDeleteTarget(null)} disabled={deleting}>
              Отмена
            </Button>
            <Button variant="danger" onClick={confirmDelete} loading={deleting}>
              Удалить
            </Button>
          </>
        }
      >
        {deleteTarget && (
          <p className="text-sm text-admin-textSecondary">
            Отзыв от <strong className="text-admin-text">{deleteTarget.client_name || 'клиента'}</strong> будет
            удалён без восстановления.
          </p>
        )}
      </Modal>

      <ReviewPhotoFullscreen url={photoPreview} onClose={() => setPhotoPreview(null)} />
    </div>
  );
}
