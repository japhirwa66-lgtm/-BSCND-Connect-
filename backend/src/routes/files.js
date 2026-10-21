import { Router } from 'express';
import { Upload } from '../models/Upload.js';
import { TOKEN_RE } from '../utils/keys.js';
import { asyncHandler } from '../utils/async.js';
import { HttpError } from '../middleware/errors.js';
import { imageUrl } from '../services/storage.js';

const router = Router();

/**
 * Serves an uploaded photo. The token is unguessable; only photos attached to a response are served.
 * Cloudinary photos redirect to the CDN (optionally as a ?w=<px> thumbnail); local-dev photos stream from MongoDB.
 */
router.get(
  '/:token',
  asyncHandler(async (req, res) => {
    if (!TOKEN_RE.test(req.params.token)) throw new HttpError(404, 'File not found');
    const up = await Upload.findOne({ token: req.params.token, claimed: true }).select('+data contentType provider url publicId');
    if (!up) throw new HttpError(404, 'File not found');

    res.set({ 'Cross-Origin-Resource-Policy': 'cross-origin', 'Cache-Control': 'public, max-age=86400' });
    if (up.provider === 'cloudinary') {
      const w = parseInt(req.query.w, 10);
      return res.redirect(302, Number.isInteger(w) && w >= 32 && w <= 1600 ? imageUrl(up, w) : up.url);
    }
    res.set({
      'Content-Type': up.contentType,
      'Content-Length': String(up.data.length),
      'Content-Disposition': 'inline',
      'Content-Security-Policy': "default-src 'none'; sandbox",
    });
    return res.end(up.data);
  }),
);

export default router;
