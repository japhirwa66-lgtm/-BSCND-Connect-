/**
 * Turns user input such as "instagram.com/name" into a safe absolute http(s) URL, or returns null.
 * Rejects javascript:, data:, mailto:, credentials in the URL, whitespace and overlong values.
 */
export function normalizeUrl(input) {
  if (typeof input !== 'string') return null;
  let s = input.trim();
  if (!s || s.length > 300 || /\s/.test(s)) return null;
  if (!/^[a-z][a-z0-9+.-]*:\/\//i.test(s)) {
    const looksLikeScheme = /^[a-z][a-z0-9+.-]*:/i.test(s) && !/^[^/]+:\d+/.test(s); // javascript:, mailto: ...
    if (looksLikeScheme) return null;
    s = `https://${s}`;
  }
  let u;
  try { u = new URL(s); } catch { return null; }
  if (u.protocol !== 'http:' && u.protocol !== 'https:') return null;
  if (!u.hostname.includes('.') || u.username || u.password) return null;
  return u.href.length <= 300 ? u.href : null;
}
