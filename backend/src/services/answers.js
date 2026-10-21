import { normalizeUrl } from '../utils/url.js';
import { TOKEN_RE } from '../utils/keys.js';

/**
 * Validates and normalises a respondent's answers against the form definition.
 * Unknown keys are dropped; every value is type-checked server-side (never trust the client).
 */
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const isEmpty = (v) =>
  v === undefined || v === null ||
  (typeof v === 'string' && v.trim() === '') ||
  (Array.isArray(v) && v.length === 0);

function checkField(f, v) {
  const bad = (error) => ({ error });
  switch (f.type) {
    case 'short_text':
    case 'long_text': {
      if (typeof v !== 'string') return bad('Enter text');
      const s = v.trim();
      const max = f.type === 'short_text' ? 500 : 5000;
      if (s.length > max) return bad(`Keep this under ${max} characters`);
      return { value: s };
    }
    case 'email': {
      if (typeof v !== 'string') return bad('Enter an email address');
      const s = v.trim();
      if (s.length > 254 || !EMAIL_RE.test(s)) return bad('Enter a valid email address');
      return { value: s };
    }
    case 'number': {
      const n = typeof v === 'number' ? v : typeof v === 'string' ? Number(v.trim()) : NaN;
      if (!Number.isFinite(n) || Math.abs(n) > 1e15) return bad('Enter a valid number');
      return { value: n };
    }
    case 'date': {
      if (typeof v !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(v)) return bad('Enter a valid date');
      const d = new Date(`${v}T00:00:00Z`);
      if (Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== v) return bad('Enter a valid date');
      return { value: v };
    }
    case 'radio':
    case 'dropdown':
      if (typeof v !== 'string' || !f.options.includes(v)) return bad('Choose one of the options');
      return { value: v };
    case 'checkbox': {
      if (!Array.isArray(v) || v.some((x) => typeof x !== 'string' || !f.options.includes(x))) {
        return bad('Choose from the listed options');
      }
      return { value: [...new Set(v)] };
    }
    case 'rating': {
      const n = Number(v);
      if (!Number.isInteger(n) || n < 1 || n > 5) return bad('Choose a rating from 1 to 5');
      return { value: n };
    }
    case 'image': {
      const max = f.maxFiles || 1;
      if (!Array.isArray(v) || v.length > max || v.some((x) => typeof x !== 'string' || !TOKEN_RE.test(x))) {
        return bad(max > 1 ? `Add up to ${max} photos` : 'Add a photo');
      }
      return { value: [...new Set(v)] };
    }
    case 'social': {
      const url = typeof v === 'string' ? normalizeUrl(v) : null;
      if (!url) return bad('Enter a valid link, e.g. instagram.com/yourname');
      return { value: url };
    }
    default:
      return bad('Unsupported question type');
  }
}

export function validateAnswers(fields, raw) {
  const input = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {};
  const answers = {};
  const errors = {};
  for (const f of fields) {
    const v = input[f.id];
    if (isEmpty(v)) {
      if (f.required) errors[f.id] = 'This question is required';
      continue;
    }
    const r = checkField(f, v);
    if (r.error) errors[f.id] = r.error;
    else answers[f.id] = r.value;
  }
  return { answers, errors, ok: Object.keys(errors).length === 0 };
}
