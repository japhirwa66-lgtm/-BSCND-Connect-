export const publicUrl = (slug) => `${window.location.origin}/f/${slug}`;
export const resultsUrl = (slug) => `${window.location.origin}/f/${slug}/results`;
export const dashboardUrl = (key) => `${window.location.origin}/manage/${key}`;

const dateFmt = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' });
export const formatDate = (iso) => (iso ? dateFmt.format(new Date(iso)) : '—');

export function toLocalInput(iso) {
  const d = new Date(iso);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
}

export async function copyText(text) {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch { /* fall through to legacy path */ }
  const ta = document.createElement('textarea');
  ta.value = text;
  ta.setAttribute('readonly', '');
  ta.style.cssText = 'position:fixed;opacity:0;top:0;left:0';
  document.body.appendChild(ta);
  ta.select();
  let ok = false;
  try { ok = document.execCommand('copy'); } catch { ok = false; }
  document.body.removeChild(ta);
  return ok;
}

/** Accepts a raw key or a full dashboard link. */
export function parseKey(input) {
  const s = (input || '').trim();
  const m = s.match(/manage\/([^/?#\s]+)/);
  return m ? m[1] : s;
}

export function formatAnswer(field, v) {
  if (v === undefined || v === null || v === '') return '—';
  if (Array.isArray(v)) return v.join(', ');
  if (field.type === 'rating') return `${v} / 5`;
  return String(v);
}

export const STATUS_LABEL = { open: 'Open', closed: 'Closed', expired: 'Expired', full: 'Full' };
