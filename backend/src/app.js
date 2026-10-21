import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import fs from 'node:fs';
import path from 'node:path';
import { config } from './config.js';
import apiRouter from './routes/index.js';
import { health } from './routes/health.js';
import { notFound, errorHandler } from './middleware/errors.js';

export function createApp() {
  const app = express();
  app.disable('x-powered-by');
  if (config.trustProxy) app.set('trust proxy', 1);

  app.use(
    helmet({
      contentSecurityPolicy: {
        useDefaults: true,
        // allow plain-http deployments (e.g. a VPS IP before TLS is set up)
        directives: {
          'upgrade-insecure-requests': null,
          'img-src': ["'self'", 'data:', 'blob:'], // blob: = instant local photo previews
        },
      },
    }),
  );
  if (config.clientOrigins.length) {
    const origins = config.clientOrigins.map((o) => (o.includes('*')
      ? new RegExp(`^${o.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '[^.]+')}$`)
      : o));
    app.use(cors({ origin: origins, maxAge: 86400 }));
  }
  app.use(compression());
  // health checks run every few seconds on most hosts: answer them first, unthrottled and unlogged
  app.get('/health', health);
  if (config.nodeEnv !== 'test') {
    app.use(morgan(config.nodeEnv === 'production' ? 'combined' : 'dev', { skip: (req) => req.path === '/health' || req.path === '/api/health' }));
  }
  app.use(express.json({ limit: '256kb' }));

  app.use(
    '/api',
    rateLimit({
      windowMs: 60 * 1000,
      limit: 600,
      standardHeaders: 'draft-7',
      legacyHeaders: false,
      skip: (req) => req.path === '/health',
      message: { error: 'Too many requests. Please slow down.' },
    }),
    apiRouter,
    notFound,
  );

  // Serve the built React SPA (production). In development Vite serves it and proxies /api here.
  const dist = config.clientDist;
  if (fs.existsSync(path.join(dist, 'index.html'))) {
    app.use('/assets', express.static(path.join(dist, 'assets'), { immutable: true, maxAge: '1y', index: false }));
    app.use(express.static(dist, { index: false, maxAge: '1h' }));
    app.get('*', (req, res) => {
      res.set('Cache-Control', 'no-cache');
      res.sendFile(path.join(dist, 'index.html'));
    });
  }

  app.use(errorHandler);
  return app;
}
