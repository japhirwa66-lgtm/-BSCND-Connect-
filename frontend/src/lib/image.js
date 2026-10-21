const MAX_BYTES = 4 * 1024 * 1024; // keep in sync with the server limit
const MAX_DIM = 1600;
const ALLOWED = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const UNSUPPORTED = 'This image format is not supported. Please use JPG, PNG, WebP or GIF.';

function decodeViaImg(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('decode')); };
    img.src = url;
  });
}
const decode = (file) => (typeof createImageBitmap === 'function' ? createImageBitmap(file).catch(() => decodeViaImg(file)) : decodeViaImg(file));

/**
 * Shrinks big phone photos (e.g. 8 MB / 4000px) to ~1600px JPEG before upload so they send fast
 * on mobile data. Falls back to the original file when it cannot be decoded; GIFs are left untouched.
 */
export async function prepareImage(file) {
  if (!file.type.startsWith('image/') && !/\.(jpe?g|png|webp|gif|heic|heif)$/i.test(file.name)) {
    throw new Error('That file is not an image.');
  }
  let out = file;
  if (file.type !== 'image/gif') {
    try {
      const src = await decode(file);
      const w = src.naturalWidth || src.width;
      const h = src.naturalHeight || src.height;
      const scale = Math.min(1, MAX_DIM / Math.max(w, h));
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(w * scale));
      canvas.height = Math.max(1, Math.round(h * scale));
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#ffffff'; // JPEG has no transparency
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(src, 0, 0, canvas.width, canvas.height);
      if (typeof src.close === 'function') src.close();
      const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.85));
      if (blob && (blob.size < file.size || !ALLOWED.includes(file.type))) out = blob;
    } catch {
      if (!ALLOWED.includes(file.type)) throw new Error(UNSUPPORTED);
    }
  }
  if (!ALLOWED.includes(out.type)) throw new Error(UNSUPPORTED);
  if (out.size > MAX_BYTES) throw new Error('This photo is too large (max 4 MB).');
  return out;
}
