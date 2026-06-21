import { useRef, useState } from 'react';
import Button from '../ui/Button';
import { PageLoader } from '../ui/Spinner';
import { mediaUrl } from '../../lib/media';
import { Film, Trash2, Upload } from 'lucide-react';

const MAX_BYTES = 50 * 1024 * 1024;
const ASPECT_TARGET = 9 / 16;
const ASPECT_TOLERANCE = 0.06;

function validateVideoFile(file) {
  if (!file.type?.startsWith('video/')) {
    return Promise.reject(new Error('Выберите видеофайл'));
  }
  if (file.size > MAX_BYTES) {
    return Promise.reject(new Error('Максимальный размер видео — 50 МБ'));
  }

  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.onloadedmetadata = () => {
      URL.revokeObjectURL(video.src);
      const ratio = video.videoWidth / video.videoHeight;
      if (Math.abs(ratio - ASPECT_TARGET) > ASPECT_TOLERANCE) {
        reject(new Error('Видео должно быть вертикальным в формате 9:16'));
        return;
      }
      resolve();
    };
    video.onerror = () => {
      URL.revokeObjectURL(video.src);
      reject(new Error('Не удалось прочитать видео'));
    };
    video.src = URL.createObjectURL(file);
  });
}

export default function VideoReelCard({ api, toast, videoUrl, onChanged }) {
  const inputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handlePick = () => inputRef.current?.click();

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    try {
      await validateVideoFile(file);
    } catch (err) {
      toast(err.message || 'Некорректный файл', 'error');
      return;
    }

    const fd = new FormData();
    fd.append('video', file);
    setUploading(true);
    try {
      await api.post('/master/me/video-reel', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      toast('Видеовизитка загружена');
      onChanged?.();
    } catch (err) {
      toast(err.response?.data?.error || 'Ошибка загрузки видео', 'error');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Удалить видеовизитку?')) return;
    setDeleting(true);
    try {
      await api.delete('/master/me/video-reel');
      toast('Видеовизитка удалена');
      onChanged?.();
    } catch {
      toast('Ошибка удаления', 'error');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <p className="text-sm font-semibold text-admin-text">Видеовизитка</p>
        <p className="text-xs text-admin-textSecondary mt-1 leading-relaxed">
          Короткое вертикальное видео 9:16, где вы обращаетесь к клиентам. Показывается на странице записи
          в правом нижнем углу — без звука в мини-режиме, со звуком при нажатии. До 50 МБ.
        </p>
      </div>

      {uploading ? (
        <div className="py-8">
          <PageLoader />
        </div>
      ) : videoUrl ? (
        <div className="flex flex-col sm:flex-row gap-4 items-start">
          <div className="relative w-[108px] shrink-0 rounded-2xl overflow-hidden border-2 border-admin-accent/40 shadow-lg shadow-admin-accent/20">
            <video
              src={mediaUrl(videoUrl)}
              className="w-full aspect-[9/16] object-cover bg-black"
              muted
              loop
              playsInline
              autoPlay
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="secondary" size="sm" onClick={handlePick}>
              <Upload className="h-4 w-4" />
              Заменить
            </Button>
            <Button type="button" variant="danger" size="sm" onClick={handleDelete} loading={deleting}>
              <Trash2 className="h-4 w-4" />
              Удалить
            </Button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={handlePick}
          className="w-full max-w-md flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-admin-border bg-admin-bg/50 px-6 py-10 text-center hover:border-admin-accent/50 hover:bg-admin-accentSoft/30 transition cursor-pointer"
        >
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-admin-accent/10 text-admin-accent">
            <Film className="h-7 w-7" />
          </div>
          <div>
            <p className="text-sm font-semibold text-admin-text">Загрузить видеовизитку</p>
            <p className="text-xs text-admin-textMuted mt-1">Формат 9:16 · MP4, MOV, WebM · до 50 МБ</p>
          </div>
        </button>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="video/mp4,video/quicktime,video/webm,video/*"
        className="hidden"
        onChange={handleUpload}
      />
    </div>
  );
}
