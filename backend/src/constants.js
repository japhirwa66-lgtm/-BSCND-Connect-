export const FIELD_TYPES = [
  'short_text', 'long_text', 'email', 'number', 'date', 'radio', 'checkbox', 'dropdown', 'rating', 'image', 'social',
];
export const CHOICE_TYPES = ['radio', 'checkbox', 'dropdown'];
export const DEFAULT_CONFIRMATION = 'Your response has been recorded.';
export const MAX_PHOTO_BYTES = 4 * 1024 * 1024; // per uploaded photo
export const UPLOAD_TTL_MS = 24 * 60 * 60 * 1000; // unattached uploads are purged after this
export const MAX_PENDING_UPLOADS_PER_FORM = 500;
