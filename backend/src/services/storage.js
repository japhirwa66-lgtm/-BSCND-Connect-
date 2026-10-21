import { v2 as cloudinary } from 'cloudinary';
import { config } from '../config.js';

let configured = false;
function ensure() {
  if (configured) return;
  cloudinary.config({
    cloud_name: config.cloudinary.cloudName,
    api_key: config.cloudinary.apiKey,
    api_secret: config.cloudinary.apiSecret,
    secure: true,
  });
  configured = true;
}

/** Store a validated image. Cloudinary when configured, MongoDB otherwise (local development). */
export async function storeImage({ buf, token, formId }) {
  if (!config.cloudinary.enabled) return { provider: 'mongo', data: buf };
  ensure();
  const result = await new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: `${config.cloudinary.folder}/${formId}`,
        public_id: token,
        resource_type: 'image',
        overwrite: false,
        unique_filename: false,
        use_filename: false,
        tags: ['bscnd-connect'],
      },
      (err, r) => (err ? reject(err) : resolve(r)),
    );
    stream.end(buf);
  });
  return { provider: 'cloudinary', url: result.secure_url, publicId: result.public_id };
}

/** URL to send the browser to for a Cloudinary-hosted photo; `width` gives an optimised square thumbnail. */
export function imageUrl(doc, width) {
  if (!width) return doc.url;
  ensure();
  return cloudinary.url(doc.publicId, {
    secure: true,
    transformation: [{ width, height: width, crop: 'fill', quality: 'auto', fetch_format: 'auto' }],
  });
}

/** Delete stored files (Cloudinary only; Mongo-held bytes go away with the document). Never throws. */
export async function deleteStored(docs) {
  const ids = docs.filter((d) => d.provider === 'cloudinary' && d.publicId).map((d) => d.publicId);
  if (!ids.length) return;
  ensure();
  for (let i = 0; i < ids.length; i += 100) {
    try {
      await cloudinary.api.delete_resources(ids.slice(i, i + 100), { resource_type: 'image', type: 'upload', invalidate: true });
    } catch (err) {
      console.error('Cloudinary delete failed:', err?.message || err);
    }
  }
}
