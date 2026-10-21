import { SOCIAL_ICONS } from './socialIcons.js';

const HOSTS = [
  ['instagram', /(^|\.)instagram\.com$/],
  ['facebook', /(^|\.)(facebook\.com|fb\.com|fb\.me|fb\.watch)$/],
  ['x', /(^|\.)(x\.com|twitter\.com)$/],
  ['linkedin', /(^|\.)linkedin\.com$/],
  ['tiktok', /(^|\.)tiktok\.com$/],
  ['youtube', /(^|\.)(youtube\.com|youtu\.be)$/],
  ['whatsapp', /(^|\.)(wa\.me|whatsapp\.com)$/],
  ['telegram', /(^|\.)(t\.me|telegram\.me|telegram\.org)$/],
  ['github', /(^|\.)github\.com$/],
];

/** Returns a platform key (instagram, facebook, x, ...) or 'website' for any other link. */
export function detectPlatform(input) {
  const s = String(input || '').trim();
  if (!s) return 'website';
  let host = '';
  try {
    host = new URL(/^[a-z][a-z0-9+.-]*:\/\//i.test(s) ? s : `https://${s}`).hostname.toLowerCase();
  } catch {
    return 'website';
  }
  return HOSTS.find(([, re]) => re.test(host))?.[0] || 'website';
}

export const platformName = (p) => SOCIAL_ICONS[p]?.title || 'Website';
export const platformColor = (p) => (SOCIAL_ICONS[p] ? `#${SOCIAL_ICONS[p].hex}` : '#1d3fd8');

/** Only http(s) links are ever rendered as clickable. */
export const isSafeUrl = (u) => /^https?:\/\//i.test(String(u || ''));
export const displayUrl = (u) => String(u || '').replace(/^https?:\/\/(www\.)?/i, '').replace(/\/$/, '');
