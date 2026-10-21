import { useEffect, useRef, useState } from 'react';
import { api } from '../lib/api.js';
import { prepareImage } from '../lib/image.js';

let seq = 0;

/** Drag & drop / click-to-pick photo uploader. Reports uploaded tokens (and busy state) to the parent form. */
export default function PhotoInput({ slug, field, labelId, onChange, onBusy }) {
  const max = field.maxFiles || 1;
  const [items, setItems] = useState([]);
  const [drag, setDrag] = useState(false);
  const [notice, setNotice] = useState('');
  const inputRef = useRef(null);
  const live = useRef(new Map());
  const itemsRef = useRef(items);
  itemsRef.current = items;

  useEffect(() => {
    onChange(field.id, items.filter((i) => i.status === 'done').map((i) => i.token));
    onBusy(field.id, items.some((i) => i.status === 'uploading'));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items]);

  useEffect(() => () => {
    live.current.forEach((c) => c.abort());
    itemsRef.current.forEach((i) => URL.revokeObjectURL(i.previewUrl));
    onBusy(field.id, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const patch = (key, p) => setItems((list) => list.map((i) => (i.key === key ? { ...i, ...p } : i)));

  const startUpload = async (item) => {
    const ac = new AbortController();
    live.current.set(item.key, ac);
    try {
      const blob = await prepareImage(item.file);
      const token = await api.uploadPhoto(slug, blob, item.name, (pct) => patch(item.key, { progress: pct }), ac.signal);
      patch(item.key, { status: 'done', token, progress: 100, file: null });
    } catch (err) {
      if (err.name === 'AbortError') return;
      patch(item.key, { status: 'error', error: err.message || 'Upload failed. Please try again.' });
    } finally {
      live.current.delete(item.key);
    }
  };

  const dropItem = (i) => {
    live.current.get(i.key)?.abort();
    URL.revokeObjectURL(i.previewUrl);
  };

  const remove = (item) => {
    dropItem(item);
    setItems((list) => list.filter((i) => i.key !== item.key));
    setNotice('');
  };

  const retry = (item) => {
    patch(item.key, { status: 'uploading', progress: 0, error: '' });
    startUpload(item);
  };

  const addFiles = (fileList) => {
    setNotice('');
    let files = Array.from(fileList || []).filter((f) => f.type.startsWith('image/') || /\.(jpe?g|png|webp|gif|heic|heif)$/i.test(f.name));
    if (!files.length) { setNotice('Please choose image files (JPG, PNG, WebP or GIF).'); return; }

    if (max === 1) {
      itemsRef.current.forEach(dropItem); // a single-photo question: the new photo replaces the old one
      files = files.slice(0, 1);
    } else {
      const room = max - itemsRef.current.length;
      if (room <= 0) { setNotice(`You can add up to ${max} photos.`); return; }
      if (files.length > room) { setNotice(`Only ${room} more photo${room === 1 ? '' : 's'} can be added (max ${max}).`); files = files.slice(0, room); }
    }
    const fresh = files.map((file) => ({
      key: `p${++seq}`, name: file.name, file, previewUrl: URL.createObjectURL(file),
      status: 'uploading', progress: 0, token: null, error: '',
    }));
    setItems((prev) => (max === 1 ? fresh : prev.concat(fresh)));
    fresh.forEach(startUpload);
  };

  const stop = (e) => { e.preventDefault(); e.stopPropagation(); };

  return (
    <div className="photo-input">
      <div
        className={drag ? 'dropzone drag' : 'dropzone'}
        role="button"
        tabIndex={0}
        aria-labelledby={labelId}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); inputRef.current?.click(); } }}
        onDragEnter={(e) => { stop(e); setDrag(true); }}
        onDragOver={(e) => { stop(e); setDrag(true); }}
        onDragLeave={(e) => { stop(e); if (!e.currentTarget.contains(e.relatedTarget)) setDrag(false); }}
        onDrop={(e) => { stop(e); setDrag(false); addFiles(e.dataTransfer?.files); }}
      >
        <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <rect x="3" y="4" width="18" height="16" rx="3" /><circle cx="9" cy="10" r="1.8" /><path d="M21 16l-5-5-8 8" />
        </svg>
        <p><strong>Drag &amp; drop</strong> {max > 1 ? 'photos' : 'a photo'} here, or <span className="dz-link">browse</span></p>
        <p className="hint">JPG, PNG, WebP or GIF{max > 1 ? ` · up to ${max} photos` : ''}</p>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple={max > 1}
          hidden
          onChange={(e) => { addFiles(e.target.files); e.target.value = ''; }}
        />
      </div>
      {notice && <p className="error-text" role="alert">{notice}</p>}
      {items.length > 0 && (
        <ul className="photo-grid">
          {items.map((i) => (
            <li key={i.key} className={`photo ${i.status}`}>
              <img src={i.previewUrl} alt={i.name} />
              {i.status === 'uploading' && <div className="photo-progress" role="progressbar" aria-valuenow={i.progress} aria-valuemin={0} aria-valuemax={100}><span style={{ width: `${Math.max(i.progress, 6)}%` }} /></div>}
              {i.status === 'done' && <span className="photo-ok" aria-label="Uploaded">✓</span>}
              {i.status === 'error' && (
                <div className="photo-error">
                  <span>{i.error}</span>
                  {i.file && <button type="button" className="btn btn-sm btn-ghost" onClick={() => retry(i)}>Retry</button>}
                </div>
              )}
              <button type="button" className="photo-remove" aria-label={`Remove ${i.name}`} onClick={() => remove(i)}>✕</button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
