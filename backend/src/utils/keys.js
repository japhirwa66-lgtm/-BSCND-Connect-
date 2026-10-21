import crypto from 'node:crypto';

/** Secret string that unlocks a form's dashboard. Only its SHA-256 hash is stored. */
export const generateAdminKey = () => `bc_${crypto.randomBytes(24).toString('base64url')}`;
export const hashKey = (key) => crypto.createHash('sha256').update(String(key)).digest('hex');
/** Public, shareable identifier used in /f/:slug */
export const generateSlug = () => crypto.randomBytes(8).toString('base64url');
export const SLUG_RE = /^[A-Za-z0-9_-]{6,24}$/;
export const OBJECT_ID_RE = /^[a-f\d]{24}$/i;
/** Unguessable token that identifies an uploaded file (used in /api/files/:token). */
export const generateFileToken = () => crypto.randomBytes(18).toString('base64url');
export const TOKEN_RE = /^[A-Za-z0-9_-]{20,40}$/;
