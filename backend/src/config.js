import 'dotenv/config';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const num = (v, d) => (Number.isFinite(Number(v)) && v !== '' && v !== undefined ? Number(v) : d);

export const config = {
  port: num(process.env.PORT, 5000),
  nodeEnv: process.env.NODE_ENV || 'development',
  mongoUri: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/bscnd-connect',
  isProd: (process.env.NODE_ENV || '') === 'production',
  // exact origins, or wildcards such as https://*.vercel.app (one subdomain label)
  clientOrigins: (process.env.CLIENT_ORIGIN || '').split(',').map((s) => s.trim().replace(/\/+$/, '')).filter(Boolean),
  cloudinary: (() => {
    let { CLOUDINARY_CLOUD_NAME: cloudName, CLOUDINARY_API_KEY: apiKey, CLOUDINARY_API_SECRET: apiSecret } = process.env;
    if (process.env.CLOUDINARY_URL) { // cloudinary://<api_key>:<api_secret>@<cloud_name>
      try {
        const u = new URL(process.env.CLOUDINARY_URL);
        cloudName ||= u.hostname;
        apiKey ||= decodeURIComponent(u.username);
        apiSecret ||= decodeURIComponent(u.password);
      } catch { /* ignored: reported as "not configured" */ }
    }
    return {
      cloudName, apiKey, apiSecret,
      folder: process.env.CLOUDINARY_FOLDER || 'bscnd-connect',
      enabled: Boolean(cloudName && apiKey && apiSecret),
    };
  })(),
  trustProxy: process.env.TRUST_PROXY === '1' || process.env.TRUST_PROXY === 'true',
  clientDist: process.env.CLIENT_DIST || path.resolve(__dirname, '../../frontend/dist'),
  limits: {
    submitPerMin: num(process.env.RATE_LIMIT_SUBMIT_PER_MIN, 120),
    createPerHour: num(process.env.RATE_LIMIT_CREATE_PER_HOUR, 30),
    uploadPerHour: num(process.env.RATE_LIMIT_UPLOAD_PER_HOUR, 300),
  },
};
