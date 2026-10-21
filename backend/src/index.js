import mongoose from 'mongoose';
import { config } from './config.js';
import { createApp } from './app.js';
import { startUploadSweeper } from './services/uploads.js';

mongoose.set('strictQuery', true);

async function main() {
  if (config.isProd && !process.env.MONGODB_URI) throw new Error('MONGODB_URI is not set');
  if (config.isProd && !config.cloudinary.enabled) {
    console.warn('Cloudinary is not configured: photos will be stored in MongoDB. Set CLOUDINARY_URL for production.');
  }
  // if the URI names no database, never fall back to MongoDB's default "test" database
  let hasDb = true;
  try { hasDb = new URL(config.mongoUri).pathname.length > 1; } catch { /* keep driver default */ }
  await mongoose.connect(config.mongoUri, { serverSelectionTimeoutMS: 10000, ...(hasDb ? {} : { dbName: 'bscnd-connect' }) });
  console.log('MongoDB connected');
  // make sure indexes (unique slug / key hash, submissions lookup) exist before taking traffic
  await Promise.all(Object.values(mongoose.models).map((m) => m.init()));

  startUploadSweeper();
  console.log(`Photo storage: ${config.cloudinary.enabled ? 'Cloudinary' : 'MongoDB (local fallback)'}`);

  const app = createApp();
  const server = app.listen(config.port, () => {
    console.log(`BSCND Connect listening on http://localhost:${config.port} (${config.nodeEnv})`);
  });

  const shutdown = (signal) => {
    console.log(`${signal} received, shutting down`);
    server.close(async () => {
      await mongoose.disconnect();
      process.exit(0);
    });
    setTimeout(() => process.exit(1), 10000).unref();
  };
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

main().catch((err) => {
  console.error('Startup failed:', err.message, '\nIs MongoDB running and is MONGODB_URI in backend/.env correct?');
  process.exit(1);
});
