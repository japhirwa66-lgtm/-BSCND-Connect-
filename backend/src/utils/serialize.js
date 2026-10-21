export function formStatus(f, now = new Date()) {
  if (!f.isOpen) return 'closed';
  if (f.closesAt && new Date(f.closesAt) <= now) return 'expired';
  if (f.maxResponses && f.responseCount >= f.maxResponses) return 'full';
  return 'open';
}

const plainField = (q) => ({
  id: q.id, type: q.type, label: q.label, description: q.description || '',
  required: !!q.required, options: q.options || [], maxFiles: q.maxFiles || 1,
});

export function adminView(doc) {
  const f = typeof doc.toObject === 'function' ? doc.toObject() : doc;
  return {
    id: String(f._id),
    slug: f.slug,
    title: f.title,
    description: f.description,
    fields: (f.fields || []).map(plainField),
    confirmationMessage: f.confirmationMessage,
    isOpen: f.isOpen,
    closesAt: f.closesAt,
    maxResponses: f.maxResponses,
    responseCount: f.responseCount,
    resultsPublic: f.resultsPublic !== false,
    socialLinks: f.socialLinks || [],
    status: formStatus(f),
    createdAt: f.createdAt,
    updatedAt: f.updatedAt,
  };
}

export function publicView(f) {
  const status = formStatus(f);
  return {
    slug: f.slug,
    title: f.title,
    description: f.description,
    status,
    confirmationMessage: f.confirmationMessage,
    resultsPublic: f.resultsPublic !== false,
    socialLinks: f.socialLinks || [],
    fields: status === 'open' ? f.fields.map(plainField) : [],
  };
}
