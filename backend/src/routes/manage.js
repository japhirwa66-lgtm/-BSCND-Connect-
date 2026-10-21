import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { once } from 'node:events';
import { Form } from '../models/Form.js';
import { Submission } from '../models/Submission.js';
import { deleteAnswerUploads, removeUploads } from '../services/uploads.js';
import { formInput, statusInput } from '../validators/formInput.js';
import { hashKey, OBJECT_ID_RE } from '../utils/keys.js';
import { adminView } from '../utils/serialize.js';
import { buildSummary } from '../services/summary.js';
import { asyncHandler } from '../utils/async.js';
import { HttpError } from '../middleware/errors.js';

const router = Router();

// Counts only failed requests, so wrong-key guessing is throttled but normal use is not.
const failedLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 100,
  skipSuccessfulRequests: true,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: 'Too many failed attempts. Please wait a few minutes.' },
});

const requireAdmin = asyncHandler(async (req, res, next) => {
  const key = req.params.key;
  const notFound = new HttpError(404, 'Dashboard not found. Check your access key.');
  if (typeof key !== 'string' || key.length < 10 || key.length > 128) throw notFound;
  const form = await Form.findOne({ adminKeyHash: hashKey(key) });
  if (!form) throw notFound;
  req.form = form;
  next();
});

router.use('/:key', failedLimiter, requireAdmin);

router.get('/:key', (req, res) => res.json({ form: adminView(req.form) }));

router.put(
  '/:key',
  asyncHandler(async (req, res) => {
    const input = formInput.parse(req.body);
    req.form.set({
      title: input.title,
      description: input.description,
      fields: input.fields,
      confirmationMessage: input.confirmationMessage,
      closesAt: input.closesAt,
      maxResponses: input.maxResponses,
      resultsPublic: input.resultsPublic,
      socialLinks: input.socialLinks,
    });
    await req.form.save();
    res.json({ form: adminView(req.form) });
  }),
);

router.patch(
  '/:key/status',
  asyncHandler(async (req, res) => {
    const { isOpen } = statusInput.parse(req.body);
    req.form.isOpen = isOpen;
    await req.form.save();
    res.json({ form: adminView(req.form) });
  }),
);

router.delete(
  '/:key',
  asyncHandler(async (req, res) => {
    await Submission.deleteMany({ form: req.form._id });
    await removeUploads({ form: req.form._id });
    await Form.deleteOne({ _id: req.form._id });
    res.status(204).end();
  }),
);

router.get(
  '/:key/responses',
  asyncHandler(async (req, res) => {
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 20, 1), 100);
    const total = await Submission.countDocuments({ form: req.form._id });
    const pages = Math.max(Math.ceil(total / limit), 1);
    const page = Math.min(Math.max(parseInt(req.query.page, 10) || 1, 1), pages);
    const docs = await Submission.find({ form: req.form._id })
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();
    res.json({
      items: docs.map((d) => ({ id: String(d._id), createdAt: d.createdAt, answers: d.answers })),
      total,
      page,
      pages,
      limit,
    });
  }),
);

router.delete(
  '/:key/responses/:id',
  asyncHandler(async (req, res) => {
    if (!OBJECT_ID_RE.test(req.params.id)) throw new HttpError(404, 'Response not found');
    const removed = await Submission.findOneAndDelete({ _id: req.params.id, form: req.form._id });
    if (!removed) throw new HttpError(404, 'Response not found');
    await deleteAnswerUploads(req.form, [removed.answers]);
    await Form.updateOne({ _id: req.form._id, responseCount: { $gt: 0 } }, { $inc: { responseCount: -1 } });
    res.status(204).end();
  }),
);

router.delete(
  '/:key/responses',
  asyncHandler(async (req, res) => {
    await Submission.deleteMany({ form: req.form._id });
    await removeUploads({ form: req.form._id });
    await Form.updateOne({ _id: req.form._id }, { $set: { responseCount: 0 } });
    res.status(204).end();
  }),
);

router.get(
  '/:key/summary',
  asyncHandler(async (req, res) => {
    res.json(await buildSummary(req.form));
  }),
);

// ---- CSV export (streamed, safe against spreadsheet formula injection) ----
function cell(v) {
  if (v === undefined || v === null) return '';
  const isText = typeof v === 'string' || Array.isArray(v);
  let s = Array.isArray(v) ? v.join('; ') : String(v);
  if (isText && /^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}
const row = (cells) => `${cells.map(cell).join(',')}\r\n`;

router.get(
  '/:key/export.csv',
  asyncHandler(async (req, res) => {
    const form = req.form;
    const origin = `${req.protocol}://${req.get('host')}`;
    const base = form.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'responses';
    const stamp = new Date().toISOString().slice(0, 10);

    res.status(200);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${base}-${stamp}.csv"`);
    res.setHeader('Cache-Control', 'no-store');
    res.write('\ufeff' + row(['Submitted at (UTC)', ...form.fields.map((f) => f.label)]));

    try {
      const cursor = Submission.find({ form: form._id }).sort({ createdAt: 1 }).lean().cursor();
      for await (const s of cursor) {
        const line = row([
          s.createdAt.toISOString(),
          ...form.fields.map((f) => {
            const v = s.answers?.[f.id];
            // photos are exported as links to the files
            return f.type === 'image' && Array.isArray(v) ? v.map((t) => `${origin}/api/files/${t}`) : v;
          }),
        ]);
        if (!res.write(line)) await once(res, 'drain');
      }
      res.end();
    } catch (err) {
      console.error(err);
      res.destroy(err);
    }
  }),
);

export default router;
