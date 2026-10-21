import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { config } from '../config.js';
import { Form } from '../models/Form.js';
import { formInput } from '../validators/formInput.js';
import { generateAdminKey, generateSlug, hashKey } from '../utils/keys.js';
import { adminView } from '../utils/serialize.js';
import { asyncHandler } from '../utils/async.js';

const router = Router();

const createLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: config.limits.createPerHour,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: 'You are creating forms too quickly. Please try again later.' },
});

/** Create a form. No account needed: the response contains the one-time admin key. */
router.post(
  '/',
  createLimiter,
  asyncHandler(async (req, res) => {
    const input = formInput.parse(req.body);
    const adminKey = generateAdminKey();

    let form;
    for (let attempt = 0; attempt < 5; attempt += 1) {
      try {
        form = await Form.create({ ...input, slug: generateSlug(), adminKeyHash: hashKey(adminKey) });
        break;
      } catch (err) {
        if (err?.code !== 11000) throw err; // retry only on slug collision
      }
    }
    if (!form) throw new Error('Could not allocate a unique form id');

    res.status(201).json({ form: adminView(form), adminKey });
  }),
);

export default router;
