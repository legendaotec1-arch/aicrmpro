import { useEffect, useMemo, useRef } from 'react';
import { ImagePlus, X } from 'lucide-react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import Input from '../ui/Input';
import { formatServicePrice } from '../../lib/format';
import { getServiceNameError } from '../../lib/serviceName';
import { mediaUrl } from '../../lib/media';

const PRICE_TYPES = [
  { id: 'fixed', label: 'Точная' },
  { id: 'from', label: 'От' },
  { id: 'to', label: 'До' },
  { id: 'range', label: 'От – до' }
];

export default function ServicePriceModal({
  open,
  onClose,
  form,
  onChange,
  imageFile,
  onImageChange,
  onSubmit,
  saving = false
}) {
  const fileInputRef = useRef(null);
  const isEdit = Boolean(form.id);

  const previewUrl = useMemo(() => {
    if (imageFile) return URL.createObjectURL(imageFile);
    if (form.image_url) return mediaUrl(form.image_url);
    return null;
  }, [imageFile, form.image_url]);

  useEffect(() => {
    if (!imageFile || !previewUrl?.startsWith('blob:')) return undefined;
    return () => URL.revokeObjectURL(previewUrl);
  }, [imageFile, previewUrl]);

  const priceLabel =
    form.price_type === 'to'
      ? 'До, ₽'
      : form.price_type === 'from'
        ? 'От, ₽'
        : form.price_type === 'range'
          ? 'От, ₽'
          : 'Цена, ₽';

  const nameError = form.name ? getServiceNameError(form.name) : null;

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="md"
      title={isEdit ? 'Редактировать услугу' : 'Новая услуга'}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Отмена
          </Button>
          <Button type="submit" form="price-form" loading={saving} disabled={Boolean(nameError)}>
            Сохранить
          </Button>
        </>
      }
    >
      <form id="price-form" onSubmit={onSubmit} className="space-y-4">
        <div className="flex gap-3">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="sr-only"
            onChange={(e) => onImageChange(e.target.files?.[0] || null)}
          />
          {previewUrl ? (
            <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl border border-admin-border">
              <img src={previewUrl} alt="" className="h-full w-full object-cover" />
              <button
                type="button"
                onClick={() => {
                  onImageChange(null);
                  onChange({ image_url: null });
                  if (fileInputRef.current) fileInputRef.current.value = '';
                }}
                className="absolute right-0.5 top-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-black/50 text-white"
                aria-label="Убрать фото"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex h-16 w-16 shrink-0 flex-col items-center justify-center rounded-xl border border-dashed border-admin-border bg-admin-bg text-admin-textMuted transition hover:border-admin-accent/50 hover:text-admin-accent"
              aria-label="Загрузить фото"
            >
              <ImagePlus className="h-5 w-5" />
            </button>
          )}
          <div className="min-w-0 flex-1">
            <Input
              label="Название"
              required
              value={form.name}
              error={nameError}
              onChange={(e) => onChange({ name: e.target.value })}
            />
          </div>
        </div>

        <div>
          <p className="label-field">Стоимость</p>
          <div className="mb-3 grid grid-cols-4 gap-1 rounded-lg border border-admin-border bg-admin-bg p-1">
            {PRICE_TYPES.map(({ id, label }) => (
              <button
                key={id}
                type="button"
                onClick={() =>
                  onChange({
                    price_type: id,
                    price_max: id === 'range' ? form.price_max : ''
                  })
                }
                className={`rounded-md px-2 py-1.5 text-xs font-semibold transition ${
                  form.price_type === id
                    ? 'bg-white text-admin-accent shadow-sm'
                    : 'text-admin-textMuted hover:text-admin-text'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          <div className={`grid gap-3 ${form.price_type === 'range' ? 'grid-cols-3' : 'grid-cols-2'}`}>
            <Input
              label={priceLabel}
              type="number"
              min="0"
              required
              value={form.price}
              onChange={(e) => onChange({ price: e.target.value })}
            />
            {form.price_type === 'range' && (
              <Input
                label="До, ₽"
                type="number"
                min="0"
                required
                value={form.price_max}
                onChange={(e) => onChange({ price_max: e.target.value })}
              />
            )}
            <Input
              label="Минут"
              type="number"
              min="1"
              required
              value={form.duration_minutes}
              onChange={(e) => onChange({ duration_minutes: e.target.value })}
            />
          </div>
        </div>

        {form.price > 0 && (
          <p className="text-xs text-admin-textMuted">
            Клиент увидит:{' '}
            <span className="font-semibold text-admin-text">{formatServicePrice(form)}</span>
            {form.duration_minutes ? ` · ${form.duration_minutes} мин` : ''}
          </p>
        )}

        <label className="flex cursor-pointer items-center justify-between gap-3 rounded-lg border border-admin-border px-3 py-2.5">
          <span className="text-sm text-admin-text">Показывать клиентам</span>
          <input
            type="checkbox"
            checked={form.is_active}
            onChange={(e) => onChange({ is_active: e.target.checked })}
            className="h-4 w-4 rounded border-gray-300 text-admin-accent focus:ring-admin-accent"
          />
        </label>
      </form>
    </Modal>
  );
}
