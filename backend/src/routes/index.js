import { Router } from 'express';
import mongoose from 'mongoose';
import formsRouter from './forms.js';
import manageRouter from './manage.js';
import publicRouter from './public.js';
import filesRouter from './files.js';

const router = Router();

router.get('/health', (req, res) => {
  const dbUp = mongoose.connection.readyState === 1;
  res.status(dbUp ? 200 : 503).json({ ok: dbUp, db: dbUp ? 'up' : 'down', uptime: Math.round(process.uptime()) });
});

router.use('/forms', formsRouter);
router.use('/manage', manageRouter);
router.use('/public', publicRouter);
router.use('/files', filesRouter);

export default router;
