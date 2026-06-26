import { useEffect, useMemo } from 'react';
import Card, { CardHeader } from '../ui/Card';
import Button from '../ui/Button';
import Input from '../ui/Input';
import EmptyState from '../ui/EmptyState';
import { mediaUrl } from '../../lib/media';

export default function PortfolioSection({
  portfolio,
  portfolioTitle,
  portfolioFile,
  uploadingPortfolio,
  onTitleChange,
  onFileChange,
  onClearFile,
  onUpload,
  onDelete
}) {
  const previewUrl = useMemo(() => {
    if (!portfolioFile) return null;
    return URL.createObjectURL(portfolioFile);
  }, [portfolioFile]);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader
          title="Загрузить медиа"
          description="Общие фото и видео салона — видны всем клиентам на странице записи"
        />
        <form onSubmit={onUpload} className="space-y-4">
          <Input
            label="Подпись"
            value={portfolioTitle}
            onChange={(e) => onTitleChange(e.target.value)}
            placeholder="Работа, кабинет, процесс..."
          />

          <div>
            <label className="label-field">Файл</label>
            <label
              className={`flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-2xl cursor-pointer transition-all ${
                portfolioFile
                  ? 'border-admin-accent bg-admin-accentSoft'
                  : 'border-admin-border hover:border-admin-accent/50 hover:bg-admin-bg'
              }`}
            >
              {portfolioFile ? (
                <div className="flex flex-col items-center gap-2 p-4">
                  {portfolioFile.type.startsWith('video/') ? (
                    <video src={previewUrl} className="h-16 w-16 object-cover rounded-lg" />
                  ) : (
                    <img src={previewUrl} alt="Preview" className="h-16 w-16 object-cover rounded-lg" />
                  )}
                  <div className="text-center">
                    <p className="text-sm font-semibold text-admin-text truncate max-w-[200px]">{portfolioFile.name}</p>
                    <p className="text-xs text-admin-textMuted">{(portfolioFile.size / 1024 / 1024).toFixed(2)} МБ</p>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      onClearFile();
                    }}
                    className="text-xs text-danger hover:underline"
                  >
                    Удалить
                  </button>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2 p-4">
                  <div className="w-12 h-12 rounded-full bg-admin-bg flex items-center justify-center">
                    <svg className="w-6 h-6 text-admin-textMuted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                      />
                    </svg>
                  </div>
                  <p className="text-sm text-admin-textMuted">Нажмите или перетащите файл сюда</p>
                  <p className="text-xs text-admin-textMuted">JPG, PNG, MP4 — до 50 МБ</p>
                </div>
              )}
              <input
                type="file"
                accept="image/*,video/*"
                className="hidden"
                onChange={(e) => onFileChange(e.target.files?.[0] || null)}
              />
            </label>
          </div>

          {uploadingPortfolio && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-admin-textMuted">Загрузка...</span>
                <span className="text-admin-accent font-semibold">100%</span>
              </div>
              <div className="w-full h-2 bg-admin-bg rounded-full overflow-hidden">
                <div className="h-full bg-admin-accent rounded-full animate-pulse" style={{ width: '100%' }} />
              </div>
            </div>
          )}

          <Button type="submit" loading={uploadingPortfolio} disabled={!portfolioFile} className="w-full">
            Загрузить
          </Button>
        </form>
      </Card>

      <Card>
        {portfolio.length === 0 ? (
          <EmptyState icon="▤" title="Медиа пока нет" description="Добавьте фото или видео для главной клиентской страницы" />
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {portfolio.map((item) => (
              <div
                key={item.id}
                className="group relative aspect-square overflow-hidden rounded-2xl bg-admin-surface border border-admin-border"
              >
                {item.media_type === 'video' ? (
                  <video src={mediaUrl(item.video_url)} className="h-full w-full object-cover" muted />
                ) : item.media_type === 'external_video' ? (
                  <div className="flex h-full w-full flex-col items-center justify-center bg-admin-bg p-4 text-center text-admin-textMuted">
                    <span className="text-3xl">▶</span>
                    <span className="mt-2 text-xs break-all">{item.video_url}</span>
                  </div>
                ) : (
                  <img src={mediaUrl(item.image_url)} alt={item.title} className="h-full w-full object-cover" />
                )}
                <span className="absolute left-2 top-2 rounded-lg bg-black/70 px-2 py-1 text-[10px] font-bold uppercase text-white">
                  {item.media_type === 'image' ? 'Фото' : 'Видео'}
                </span>
                {item.title && (
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-3">
                    <p className="text-white text-sm font-medium">{item.title}</p>
                  </div>
                )}
                <div className="absolute top-2 right-2 flex gap-1 opacity-100 transition">
                  <button
                    type="button"
                    onClick={() => onDelete(item.id)}
                    className="rounded-lg bg-danger px-3 py-1.5 text-xs font-semibold text-white shadow-md hover:bg-danger/90 transition"
                  >
                    ✕
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
