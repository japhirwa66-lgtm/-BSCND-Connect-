import { Upload } from '../models/Upload.js';
import { deleteStored } from './storage.js';

/** Delete uploads matching a filter, including their Cloudinary files. */
export async function removeUploads(filter) {
  const docs = await Upload.find(filter).select('provider publicId').lean();
  if (!docs.length) return 0;
  await deleteStored(docs);
  await Upload.deleteMany({ _id: { $in: docs.map((d) => d._id) } });
  return docs.length;
}

/** Remove the photos referenced by the given response answers. */
export async function deleteAnswerUploads(form, answersList) {
  const imageIds = form.fields.filter((f) => f.type === 'image').map((f) => f.id);
  const tokens = answersList.flatMap((a) => imageIds.flatMap((id) => (Array.isArray(a?.[id]) ? a[id] : [])));
  if (tokens.length) await removeUploads({ form: form._id, token: { $in: tokens } });
}

/** Photos uploaded but never attached to a submitted response are removed after 24h. */
export async function sweepExpiredUploads(limit = 200) {
  const docs = await Upload.find({ claimed: false, expiresAt: { $lt: new Date() } }).limit(limit).select('provider publicId').lean();
  if (!docs.length) return 0;
  await deleteStored(docs);
  await Upload.deleteMany({ _id: { $in: docs.map((d) => d._id) } });
  return docs.length;
}

export function startUploadSweeper() {
  const run = () => sweepExpiredUploads().catch((e) => console.error('Upload sweep failed:', e?.message || e));
  run();
  const timer = setInterval(run, 30 * 60 * 1000);
  timer.unref();
  return timer;
}
