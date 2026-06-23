import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ChevronRight,
  Download,
  FolderPlus,
  Pencil,
  Trash2,
  Upload,
  Check,
  X,
} from 'lucide-react';
import adminApi from '../../lib/adminApi';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Modal from '../ui/Modal';
import AdminFilePreview from './AdminFilePreview';
import { formatDate, formatFileSize } from './adminFormat';

function FileCard({ file, onDownload, onRequestDelete, onRename }) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(file.original_name);
  const [saving, setSaving] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    setName(file.original_name);
  }, [file.original_name]);

  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  const saveRename = async () => {
    const trimmed = name.trim();
    if (!trimmed || trimmed === file.original_name) {
      setEditing(false);
      setName(file.original_name);
      return;
    }
    setSaving(true);
    try {
      await onRename(file.id, trimmed);
      setEditing(false);
    } catch {
      /* parent alerts */
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="group rounded-2xl border border-slate-200 bg-white p-3 shadow-sm hover:border-violet-200 hover:shadow-md transition">
      <AdminFilePreview file={file} className="aspect-[4/3] w-full" />

      <div className="mt-3 space-y-1">
        {editing ? (
          <div className="flex items-center gap-1">
            <input
              ref={inputRef}
              className="w-full rounded-lg border border-violet-300 px-2 py-1 text-sm"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') saveRename();
                if (e.key === 'Escape') {
                  setEditing(false);
                  setName(file.original_name);
                }
              }}
            />
            <button type="button" onClick={saveRename} disabled={saving} className="text-emerald-600 p-1">
              <Check size={16} />
            </button>
            <button
              type="button"
              onClick={() => { setEditing(false); setName(file.original_name); }}
              className="text-slate-400 p-1"
            >
              <X size={16} />
            </button>
          </div>
        ) : (
          <p className="text-sm font-semibold text-slate-900 truncate" title={file.original_name}>
            {file.original_name}
          </p>
        )}
        <p className="text-xs text-slate-500">
          {formatFileSize(file.size_bytes)} · {file.uploaded_by_name}
        </p>
        <p className="text-xs text-slate-400">{formatDate(file.created_at)}</p>
      </div>

      <div className="mt-2 flex items-center gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition">
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-violet-700"
          title="Переименовать"
        >
          <Pencil size={15} />
        </button>
        <button
          type="button"
          onClick={() => onDownload(file)}
          className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-violet-700"
          title="Скачать"
        >
          <Download size={15} />
        </button>
        <button
          type="button"
          onClick={() => onRequestDelete(file)}
          className="rounded-lg p-2 text-slate-500 hover:bg-rose-50 hover:text-rose-600"
          title="Удалить"
        >
          <Trash2 size={15} />
        </button>
      </div>
    </div>
  );
}

export default function AdminDriveTab() {
  const [folderId, setFolderId] = useState(null);
  const [breadcrumbs, setBreadcrumbs] = useState([{ id: null, name: 'Облако' }]);
  const [folders, setFolders] = useState([]);
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [newFolderName, setNewFolderName] = useState('');
  const [uploading, setUploading] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const fileInputRef = useRef(null);

  const load = useCallback(async (currentFolderId) => {
    setError('');
    setLoading(true);
    try {
      const params = currentFolderId ? `?parentId=${currentFolderId}` : '';
      const fileParams = currentFolderId ? `?folderId=${currentFolderId}` : '';
      const [foldersRes, filesRes] = await Promise.all([
        adminApi.get(`/folders${params}`),
        adminApi.get(`/files${fileParams}`),
      ]);
      setFolders(foldersRes.data.folders || []);
      setFiles(filesRes.data.files || []);
    } catch (err) {
      setError(err?.response?.data?.error || 'Не удалось загрузить облако');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load(folderId);
  }, [folderId, load]);

  const openFolder = (folder) => {
    setFolderId(folder.id);
    setBreadcrumbs((prev) => [...prev, { id: folder.id, name: folder.name }]);
  };

  const goToCrumb = (index) => {
    const crumb = breadcrumbs[index];
    setFolderId(crumb.id);
    setBreadcrumbs(breadcrumbs.slice(0, index + 1));
  };

  const createFolder = async (e) => {
    e.preventDefault();
    const name = newFolderName.trim();
    if (!name) return;
    try {
      const res = await adminApi.post('/folders', { name, parentId: folderId || undefined });
      setFolders((prev) => [...prev, res.data.folder].sort((a, b) => a.name.localeCompare(b.name)));
      setNewFolderName('');
    } catch (err) {
      alert(err?.response?.data?.error || 'Не удалось создать папку');
    }
  };

  const requestDeleteFolder = (folder) => {
    setConfirmDelete({ type: 'folder', id: folder.id, name: folder.name });
  };

  const requestDeleteFile = (file) => {
    setConfirmDelete({ type: 'file', id: file.id, name: file.original_name });
  };

  const executeDelete = async () => {
    if (!confirmDelete) return;
    setDeleting(true);
    try {
      if (confirmDelete.type === 'folder') {
        await adminApi.delete(`/folders/${confirmDelete.id}`);
        setFolders((prev) => prev.filter((f) => f.id !== confirmDelete.id));
      } else {
        await adminApi.delete(`/files/${confirmDelete.id}`);
        setFiles((prev) => prev.filter((f) => f.id !== confirmDelete.id));
      }
      setConfirmDelete(null);
    } catch (err) {
      alert(err?.response?.data?.error || 'Не удалось удалить');
    } finally {
      setDeleting(false);
    }
  };

  const uploadFile = async (e) => {
    const picked = Array.from(e.target.files || []);
    if (!picked.length) return;
    setUploading(true);
    try {
      const uploaded = [];
      for (const file of picked) {
        const fd = new FormData();
        fd.append('file', file, file.name);
        fd.append('originalName', file.name);
        if (folderId) fd.append('folderId', folderId);
        const res = await adminApi.post('/files', fd, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        uploaded.push(res.data.file);
      }
      setFiles((prev) => [...prev, ...uploaded].sort((a, b) => a.original_name.localeCompare(b.original_name)));
    } catch (err) {
      alert(err?.response?.data?.error || 'Не удалось загрузить файл');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const downloadFile = async (file) => {
    try {
      const res = await adminApi.get(`/files/${file.id}/download`, { responseType: 'blob' });
      const url = URL.createObjectURL(res.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = file.original_name;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      alert('Не удалось скачать файл');
    }
  };

  const renameFile = async (id, original_name) => {
    try {
      const res = await adminApi.patch(`/files/${id}`, { original_name });
      setFiles((prev) =>
        prev
          .map((f) => (f.id === id ? res.data.file : f))
          .sort((a, b) => a.original_name.localeCompare(b.original_name))
      );
    } catch (err) {
      alert(err?.response?.data?.error || 'Не удалось переименовать');
      throw err;
    }
  };

  const confirmTitle = confirmDelete?.type === 'folder' ? 'Удалить папку?' : 'Удалить файл?';
  const confirmDescription = confirmDelete?.type === 'folder'
    ? `Папка «${confirmDelete?.name}» и всё её содержимое будут удалены безвозвратно.`
    : `Файл «${confirmDelete?.name}» будет удалён с диска безвозвратно.`;

  return (
    <div className="space-y-4">
      {error ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>
      ) : null}

      <div className="flex flex-wrap items-center gap-2 text-sm text-slate-600">
        {breadcrumbs.map((crumb, i) => (
          <span key={crumb.id || 'root'} className="inline-flex items-center gap-1">
            {i > 0 ? <ChevronRight size={14} className="text-slate-300" /> : null}
            <button type="button" onClick={() => goToCrumb(i)} className="font-medium hover:text-violet-600">
              {crumb.name}
            </button>
          </span>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="secondary" onClick={() => fileInputRef.current?.click()} loading={uploading}>
          <Upload size={16} className="mr-1.5" />
          Загрузить файлы
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*,video/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.zip"
          className="hidden"
          onChange={uploadFile}
        />
      </div>

      <form onSubmit={createFolder} className="flex flex-wrap gap-2">
        <Input
          className="min-w-[200px] flex-1"
          placeholder="Название новой папки"
          value={newFolderName}
          onChange={(e) => setNewFolderName(e.target.value)}
        />
        <Button type="submit" variant="secondary">
          <FolderPlus size={16} className="mr-1.5" />
          Создать папку
        </Button>
      </form>

      {loading ? (
        <p className="text-slate-500">Загрузка…</p>
      ) : (
        <>
          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 text-left text-slate-500">
                <tr>
                  <th className="px-5 py-3 font-medium">Имя</th>
                  <th className="px-5 py-3 font-medium">Размер</th>
                  <th className="px-5 py-3 font-medium">Кто создал</th>
                  <th className="px-5 py-3 font-medium">Дата</th>
                  <th className="px-5 py-3 font-medium" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {folders.map((folder) => (
                  <tr key={folder.id} className="hover:bg-slate-50/80">
                    <td className="px-5 py-3">
                      <button
                        type="button"
                        onClick={() => openFolder(folder)}
                        className="font-medium text-violet-700 hover:underline text-left"
                      >
                        📁 {folder.name}
                      </button>
                    </td>
                    <td className="px-5 py-3 text-slate-400">—</td>
                    <td className="px-5 py-3 text-slate-500">—</td>
                    <td className="px-5 py-3 text-slate-500">{formatDate(folder.created_at)}</td>
                    <td className="px-5 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => requestDeleteFolder(folder)}
                        className="text-slate-300 hover:text-rose-500"
                        title="Удалить папку"
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
                {!folders.length && !files.length ? (
                  <tr>
                    <td colSpan={5} className="px-5 py-12 text-center text-slate-400">
                      Папка пуста — создайте папку или загрузите документ
                    </td>
                  </tr>
                ) : null}
                {!folders.length && files.length > 0 ? (
                  <tr>
                    <td colSpan={5} className="px-5 py-3 text-center text-xs text-slate-400 border-b border-slate-100">
                      Папок нет — файлы ниже
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>

          {files.length > 0 ? (
            <section>
              <h3 className="mb-3 text-sm font-bold text-slate-700">Файлы</h3>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {files.map((file) => (
                  <FileCard
                    key={file.id}
                    file={file}
                    onDownload={downloadFile}
                    onRequestDelete={requestDeleteFile}
                    onRename={renameFile}
                  />
                ))}
              </div>
            </section>
          ) : null}
        </>
      )}

      <Modal
        open={Boolean(confirmDelete)}
        onClose={() => !deleting && setConfirmDelete(null)}
        title={confirmTitle}
        description={confirmDescription}
        size="sm"
        footer={(
          <>
            <Button type="button" variant="secondary" onClick={() => setConfirmDelete(null)} disabled={deleting}>
              Отмена
            </Button>
            <Button type="button" onClick={executeDelete} loading={deleting} className="!bg-rose-600 hover:!bg-rose-700">
              Удалить
            </Button>
          </>
        )}
      />
    </div>
  );
}
