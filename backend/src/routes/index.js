import { Router } from 'express';
import { health } from './health.js';
import formsRouter from './forms.js';
import manageRouter from './manage.js';
import publicRouter from './public.js';
import filesRouter from './files.js';

const router = Router();

router.get('/health', health);

router.use('/forms', formsRouter);
router.use('/manage', manageRouter);
router.use('/public', publicRouter);
router.use('/files', filesRouter);

export default router;
