// "Your forms on this device": a convenience list so creators don't have to keep the key in their head.
const KEY = 'bscnd-connect:forms';
const LEGACY_KEY = 'formflow:forms'; // list saved before the BSCND Connect rename; migrated on first read

export function getSavedForms() {
  try {
    let raw = localStorage.getItem(KEY);
    if (raw === null) {
      raw = localStorage.getItem(LEGACY_KEY);
      if (raw !== null) {
        localStorage.setItem(KEY, raw);
        localStorage.removeItem(LEGACY_KEY);
      }
    }
    const list = JSON.parse(raw || '[]');
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

function write(list) {
  try { localStorage.setItem(KEY, JSON.stringify(list)); } catch { /* storage unavailable (private mode) */ }
}

export function saveForm({ slug, key, title }) {
  const rest = getSavedForms().filter((f) => f.key !== key);
  write([{ slug, key, title, savedAt: new Date().toISOString() }, ...rest].slice(0, 50));
}

export function removeSavedForm(key) {
  write(getSavedForms().filter((f) => f.key !== key));
}
