export const FIELD_TYPES = [
  { value: 'short_text', label: 'Short answer' },
  { value: 'long_text', label: 'Paragraph' },
  { value: 'email', label: 'Email' },
  { value: 'number', label: 'Number' },
  { value: 'date', label: 'Date' },
  { value: 'radio', label: 'Multiple choice' },
  { value: 'checkbox', label: 'Checkboxes' },
  { value: 'dropdown', label: 'Dropdown' },
  { value: 'rating', label: 'Rating (1–5)' },
  { value: 'image', label: 'Photo upload' },
  { value: 'social', label: 'Social media link' },
];
export const CHOICE_TYPES = ['radio', 'checkbox', 'dropdown'];
export const typeLabel = (t) => FIELD_TYPES.find((x) => x.value === t)?.label || t;

// Works on plain http too (crypto.randomUUID needs a secure context). Ids match ^[A-Za-z0-9_-]{1,40}$.
export const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);

export const newField = (type = 'short_text') => ({
  id: uid(),
  type,
  label: '',
  description: '',
  required: false,
  options: CHOICE_TYPES.includes(type) ? ['Option 1', 'Option 2'] : [],
  maxFiles: 1,
});

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const isEmpty = (v) => v === undefined || v === null || (typeof v === 'string' && v.trim() === '') || (Array.isArray(v) && v.length === 0);

/** Mirrors the server rules so people get instant feedback; the server remains the authority. */
export function validateResponse(fields, values) {
  const errors = {};
  for (const f of fields) {
    const v = values[f.id];
    if (isEmpty(v)) {
      if (f.required) errors[f.id] = 'This question is required';
      continue;
    }
    if (f.type === 'email' && !EMAIL_RE.test(String(v).trim())) errors[f.id] = 'Enter a valid email address';
    else if (f.type === 'number' && !Number.isFinite(Number(String(v).trim()))) errors[f.id] = 'Enter a valid number';
    else if (f.type === 'social' && !/^\S+\.\S+$/.test(String(v).trim())) errors[f.id] = 'Enter a valid link, e.g. instagram.com/yourname';
    else if (f.type === 'short_text' && String(v).length > 500) errors[f.id] = 'Keep this under 500 characters';
    else if (f.type === 'long_text' && String(v).length > 5000) errors[f.id] = 'Keep this under 5000 characters';
  }
  return errors;
}
