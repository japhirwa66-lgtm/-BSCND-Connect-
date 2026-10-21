import express, { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { config } from '../config.js';
import { Form } from '../models/Form.js';
import { Submission } from '../models/Submission.js';
import { SLUG_RE } from '../utils/keys.js';
import { publicView, formStatus } from '../utils/serialize.js';
import { validateAnswers } from '../services/answers.js';
import { asyncHandler } from '../utils/async.js';
import { HttpError } from '../middleware/errors.js';
import { Upload } from '../models/Upload.js';
import { storeImage, deleteStored } from '../services/storage.js';
import { detectImageType } from '../utils/image.js';
import { generateFileToken } from '../utils/keys.js';
import { buildSummary, toPublicSummary } from '../services/summary.js';
import { MAX_PHOTO_BYTES, UPLOAD_TTL_MS, MAX_PENDING_UPLOADS_PER_FORM } from '../constants.js';

const router = Router();

const submitLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: config.limits.submitPerMin,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: 'Too many submissions from your network. Please try again in a minute.' },
});

const CLOSED_MESSAGES = {
  closed: 'This form is no longer accepting responses.',
  expired: 'This form has passed its closing date.',
  full: 'This form has reached its maximum number of responses.',
};

async function loadForm(slug) {
  if (!SLUG_RE.test(slug)) throw new HttpError(404, 'Form not found');
  const form = await Form.findOne({ slug }).lean();
  if (!form) throw new HttpError(404, 'Form not found');
  return form;
}

router.get(
  '/:slug',
  asyncHandler(async (req, res) => {
    const form = await loadForm(req.params.slug);
    res.set('Cache-Control', 'no-store');
    res.json({ form: publicView(form) });
  }),
);

router.post(
  '/:slug/responses',
  submitLimiter,
  asyncHandler(async (req, res) => {
    const form = await loadForm(req.params.slug);

    // Honeypot: bots fill hidden fields. Pretend success, store nothing.
    if (typeof req.body?._hp === 'string' && req.body._hp.trim() !== '') {
      return res.status(201).json({ ok: true });
    }

    const status = formStatus(form);
    if (status !== 'open') throw new HttpError(403, CLOSED_MESSAGES[status], { code: status });

    const { answers, errors, ok } = validateAnswers(form.fields, req.body?.answers);
    if (!ok) throw new HttpError(422, 'Please fix the highlighted answers.', { fieldErrors: errors });

    // Photos must have been uploaded to THIS form and not used by another response yet.
    const imageFields = form.fields.filter((f) => f.type === 'image');
    const tokens = imageFields.flatMap((f) => answers[f.id] || []);
    const photoErrors = (bad) => Object.fromEntries(
      imageFields.filter((f) => (answers[f.id] || []).some((t) => !bad || bad.has(t))).map((f) => [f.id, 'A photo failed to upload. Please add it again.']),
    );
    if (tokens.length) {
      const ok2 = await Upload.find({ form: form._id, token: { $in: tokens }, claimed: false }).select('token').lean();
      const good = new Set(ok2.map((u) => u.token));
      const bad = new Set(tokens.filter((t) => !good.has(t)));
      if (bad.size) throw new HttpError(422, 'Please fix the highlighted answers.', { fieldErrors: photoErrors(bad) });
    }

    // Atomically claim a slot so concurrent submissions can never exceed maxResponses or pass closesAt.
    const now = new Date();
    const claimed = await Form.findOneAndUpdate(
      {
        _id: form._id,
        isOpen: true,
        $and: [
          { $or: [{ closesAt: null }, { closesAt: { $gt: now } }] },
          { $or: [{ maxResponses: null }, { $expr: { $lt: ['$responseCount', '$maxResponses'] } }] },
        ],
      },
      { $inc: { responseCount: 1 } },
      { projection: { _id: 1 } },
    );
    if (!claimed) {
      const fresh = (await Form.findById(form._id).lean()) || form;
      const s = formStatus(fresh);
      throw new HttpError(403, CLOSED_MESSAGES[s] || CLOSED_MESSAGES.closed, { code: s === 'open' ? 'closed' : s });
    }

    try {
      if (tokens.length) {
        const claim = await Upload.updateMany(
          { form: form._id, token: { $in: tokens }, claimed: false },
          { $set: { claimed: true }, $unset: { expiresAt: 1 } },
        );
        if (claim.modifiedCount !== tokens.length) {
          throw new HttpError(422, 'Please fix the highlighted answers.', { fieldErrors: photoErrors(null) });
        }
      }
      await Submission.create({ form: form._id, answers });
    } catch (err) {
      await Form.updateOne({ _id: form._id, responseCount: { $gt: 0 } }, { $inc: { responseCount: -1 } });
      throw err;
    }
    res.status(201).json({ ok: true });
  }),
);

// ---- Photo upload (raw binary body; magic bytes are checked, SVG is rejected) ----
const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: config.limits.uploadPerHour,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: 'Too many photo uploads from your network. Please try again later.' },
});

router.post(
  '/:slug/uploads',
  uploadLimiter,
  express.raw({ type: () => true, limit: MAX_PHOTO_BYTES }),
  asyncHandler(async (req, res) => {
    const form = await loadForm(req.params.slug);
    const status = formStatus(form);
    if (status !== 'open') throw new HttpError(403, CLOSED_MESSAGES[status], { code: status });
    if (!form.fields.some((f) => f.type === 'image')) throw new HttpError(400, 'This form has no photo questions.');

    const buf = req.body;
    if (!Buffer.isBuffer(buf) || buf.length === 0) throw new HttpError(400, 'No file received.');
    const contentType = detectImageType(buf);
    if (!contentType) throw new HttpError(415, 'Unsupported image. Please use JPG, PNG, WebP or GIF.');

    const pending = await Upload.countDocuments({ form: form._id, claimed: false });
    if (pending >= MAX_PENDING_UPLOADS_PER_FORM) {
      throw new HttpError(429, 'Too many uploads are in progress for this form. Please try again shortly.');
    }

    let name = '';
    try { name = decodeURIComponent(String(req.get('x-file-name') || '')); } catch { name = ''; }
    name = name.replace(/\p{C}/gu, '').slice(0, 100);

    const token = generateFileToken();
    let stored;
    try {
      stored = await storeImage({ buf, token, formId: String(form._id) });
    } catch (err) {
      console.error('Photo storage failed:', err?.message || err);
      throw new HttpError(502, 'Photo storage is temporarily unavailable. Please try again.');
    }
    try {
      await Upload.create({
        form: form._id, token, contentType, size: buf.length, name,
        provider: stored.provider, data: stored.data, url: stored.url, publicId: stored.publicId,
        expiresAt: new Date(Date.now() + UPLOAD_TTL_MS),
      });
    } catch (err) {
      await deleteStored([stored]); // don't leave an orphan file behind
      throw err;
    }
    res.status(201).json({ token, size: buf.length, contentType });
  }),
);

// ---- Public results: totals + chart data only, if the owner allows it (default) ----
const resultsLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 90,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: 'Too many requests. Please try again in a minute.' },
});
const resultsCache = new Map(); // slug -> { at, data }; keeps a busy results page from re-scanning every response
const RESULTS_TTL_MS = 10_000;

router.get(
  '/:slug/results',
  resultsLimiter,
  asyncHandler(async (req, res) => {
    const form = await loadForm(req.params.slug);
    if (form.resultsPublic === false) {
      throw new HttpError(403, 'The owner of this form has not made the results public.', { code: 'private' });
    }
    let hit = resultsCache.get(form.slug);
    if (!hit || Date.now() - hit.at > RESULTS_TTL_MS) {
      hit = { at: Date.now(), data: toPublicSummary(await buildSummary(form)) };
      resultsCache.set(form.slug, hit);
      if (resultsCache.size > 500) resultsCache.delete(resultsCache.keys().next().value);
    }
    const view = publicView(form);
    res.set('Cache-Control', 'no-store');
    res.json({
      form: { slug: view.slug, title: view.title, description: view.description, status: view.status, socialLinks: view.socialLinks },
      ...hit.data,
    });
  }),
);

export default router;
