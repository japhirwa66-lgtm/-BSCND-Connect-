/* End-to-end check against a RUNNING server + MongoDB:  npm run smoke  (BASE_URL=http://localhost:5000) */
const BASE = process.env.BASE_URL || 'http://localhost:5000';
let failed = 0;
const check = (name, cond, extra = '') => {
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}${cond ? '' : `  ${extra}`}`);
  if (!cond) failed += 1;
};
const call = async (method, path, body) => {
  const res = await fetch(BASE + path, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json = null;
  try { json = JSON.parse(text); } catch { /* not json */ }
  return { status: res.status, json, text };
};

const fields = [
  { id: 'name', type: 'short_text', label: 'Your name', required: true },
  { id: 'email', type: 'email', label: 'Email', required: false },
  { id: 'color', type: 'radio', label: 'Favourite colour', required: true, options: ['Red', 'Blue'] },
  { id: 'tools', type: 'checkbox', label: 'Tools', options: ['A', 'B', 'C'] },
  { id: 'score', type: 'rating', label: 'Score' },
  { id: 'age', type: 'number', label: 'Age' },
  { id: 'photo', type: 'image', label: 'Photo', maxFiles: 2 },
  { id: 'ig', type: 'social', label: 'Instagram' },
];

const health = await call('GET', '/api/health');
check('health is up', health.status === 200, JSON.stringify(health.json));

const bad = await call('POST', '/api/forms', { title: '', fields: [] });
check('rejects invalid form (400)', bad.status === 400);

const created = await call('POST', '/api/forms', {
  title: 'Smoke =test', fields, maxResponses: 2, resultsPublic: true, socialLinks: ['instagram.com/bscnd'],
});
check('creates form (201)', created.status === 201 && created.json?.adminKey, created.text);
const { form, adminKey } = created.json;

const admin = await call('GET', `/api/manage/${adminKey}`);
check('dashboard loads with key', admin.status === 200 && admin.json.form.slug === form.slug);
check('admin key hash never leaked', !JSON.stringify(admin.json).includes('adminKeyHash'));
check('wrong key is 404', (await call('GET', '/api/manage/bc_definitely-wrong-key')).status === 404);

const pub = await call('GET', `/api/public/${form.slug}`);
check('public form loads', pub.status === 200 && pub.json.form.fields.length === fields.length);
check('public view has no admin data', !JSON.stringify(pub.json).includes('responseCount'));

const PNG = Buffer.from('89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000d4944415478da63fcffff3f0300050001a5f645400000000049454e44ae426082', 'hex');
const upload = async (body, type = 'image/png') => {
  const res = await fetch(`${BASE}/api/public/${form.slug}/uploads`, { method: 'POST', headers: { 'Content-Type': type, 'X-File-Name': 'smoke.png' }, body });
  return { status: res.status, json: await res.json().catch(() => null) };
};
const svg = await upload(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"></svg>'), 'image/svg+xml');
check('rejects non-image uploads (415)', svg.status === 415);
const photo = await upload(PNG);
check('uploads a photo (201)', photo.status === 201 && photo.json?.token, JSON.stringify(photo.json));
check('unattached photo is not served', (await fetch(`${BASE}/api/files/${photo.json.token}`)).status === 404);
check('form exposes social links', pub.json.form.socialLinks?.[0] === 'https://instagram.com/bscnd');

const invalid = await call('POST', `/api/public/${form.slug}/responses`, { answers: { color: 'Green' } });
check('validation errors (422)', invalid.status === 422 && invalid.json.fieldErrors?.name && invalid.json.fieldErrors?.color);

const ok1 = await call('POST', `/api/public/${form.slug}/responses`, {
  answers: { name: '  Aline ', color: 'Blue', tools: ['A', 'C', 'A'], score: 5, age: '31', rogue: 'x', photo: [photo.json.token], ig: 'instagram.com/aline' },
});
check('submits response (201)', ok1.status === 201, ok1.text);
const ok2 = await call('POST', `/api/public/${form.slug}/responses`, { answers: { name: '=HACK()', color: 'Red' } });
check('second response (201)', ok2.status === 201, ok2.text);
const over = await call('POST', `/api/public/${form.slug}/responses`, { answers: { name: 'Late', color: 'Red' } });
check('maxResponses enforced (403 full)', over.status === 403 && over.json.code === 'full', over.text);

const list = await call('GET', `/api/manage/${adminKey}/responses`);
check('lists 2 responses', list.json?.total === 2);
const first = list.json.items.find((i) => i.answers.name === 'Aline');
check('answers normalised (trim, dedupe, drop unknown)', first && first.answers.tools.length === 2 && first.answers.rogue === undefined && first.answers.age === 31);

const served = await fetch(`${BASE}/api/files/${photo.json.token}`);
check('attached photo is served as an image', served.status === 200 && served.headers.get('content-type') === 'image/png');
check('social link normalised', first.answers.ig === 'https://instagram.com/aline');

const results = await call('GET', `/api/public/${form.slug}/results`);
check('public results visible to anyone with the link', results.status === 200 && results.json.total === 2);
check('public results hide written answers, links and photos', !results.text.includes('Aline') && !results.text.includes(photo.json.token) && !results.text.includes('instagram.com/aline'));
const summary = await call('GET', `/api/manage/${adminKey}/summary`);
const colour = summary.json?.fields?.find((f) => f.fieldId === 'color');
check('summary counts', summary.json?.total === 2 && colour?.options.find((o) => o.option === 'Blue').count === 1);

const csv = await call('GET', `/api/manage/${adminKey}/export.csv`);
check('csv export + formula guard', csv.status === 200 && csv.text.includes("'=HACK()"));
check('csv has photo link', csv.text.includes(`/api/files/${photo.json.token}`));

const hide = await call('PUT', `/api/manage/${adminKey}`, { title: 'Smoke =test', fields, resultsPublic: false });
check('owner can hide public results', hide.json?.form?.resultsPublic === false);
check('hidden results return 403', (await call('GET', `/api/public/${form.slug}/results`)).status === 403);
await call('PUT', `/api/manage/${adminKey}`, { title: 'Smoke =test', fields, maxResponses: 2, resultsPublic: true });

const del = await call('DELETE', `/api/manage/${adminKey}/responses/${first.id}`);
check('delete one response (204)', del.status === 204);
const reopen = await call('POST', `/api/public/${form.slug}/responses`, { answers: { name: 'Again', color: 'Red' } });
check('slot freed after delete', reopen.status === 201);

check('deleting a response removes its photo', (await fetch(`${BASE}/api/files/${photo.json.token}`)).status === 404);
const close = await call('PATCH', `/api/manage/${adminKey}/status`, { isOpen: false });
check('close form', close.json?.form?.status === 'closed');
const closed = await call('POST', `/api/public/${form.slug}/responses`, { answers: { name: 'X', color: 'Red' } });
check('closed form rejects (403)', closed.status === 403);

const del2 = await call('DELETE', `/api/manage/${adminKey}`);
check('delete form (204)', del2.status === 204);
check('form gone (404)', (await call('GET', `/api/public/${form.slug}`)).status === 404);

console.log(failed ? `\n${failed} check(s) FAILED` : '\nAll checks passed');
process.exit(failed ? 1 : 0);
