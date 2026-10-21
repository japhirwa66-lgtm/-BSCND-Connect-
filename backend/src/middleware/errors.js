import { ZodError } from 'zod';

export class HttpError extends Error {
  constructor(status, message, extra = {}) {
    super(message);
    this.status = status;
    this.extra = extra;
  }
}

export const notFound = (req, res) => res.status(404).json({ error: 'Not found' });

// eslint-disable-next-line no-unused-vars
export const errorHandler = (err, req, res, next) => {
  if (res.headersSent) return next(err);

  if (err instanceof HttpError) {
    return res.status(err.status).json({ error: err.message, ...err.extra });
  }
  if (err instanceof ZodError) {
    const first = err.issues[0];
    const where = first?.path?.length ? ` (${first.path.join('.')})` : '';
    return res.status(400).json({
      error: `${first?.message || 'Invalid input'}${where}`,
      issues: err.issues.map((i) => ({ path: i.path.join('.'), message: i.message })),
    });
  }
  if (err?.type === 'entity.parse.failed') return res.status(400).json({ error: 'Invalid JSON body' });
  if (err?.type === 'entity.too.large') return res.status(413).json({ error: 'That file or request is too large (photos: max 4 MB).' });
  if (err?.name === 'CastError' || err?.name === 'ValidationError') {
    return res.status(400).json({ error: 'Invalid input' });
  }
  console.error(err);
  return res.status(500).json({ error: 'Something went wrong on our side. Please try again.' });
};
