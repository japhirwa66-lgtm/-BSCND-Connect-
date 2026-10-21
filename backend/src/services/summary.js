import { Submission } from '../models/Submission.js';

const SAMPLE_LIMIT = 8;

function init(f) {
  const base = { fieldId: f.id, label: f.label, type: f.type, answered: 0 };
  if (['radio', 'checkbox', 'dropdown'].includes(f.type)) {
    return { ...base, counts: new Map(f.options.map((o) => [o, 0])) };
  }
  if (f.type === 'rating') return { ...base, dist: [0, 0, 0, 0, 0], sum: 0 };
  if (f.type === 'number') return { ...base, sum: 0, min: null, max: null };
  return { ...base, samples: [] };
}

function accumulate(a, f, v) {
  a.answered += 1;
  if (a.counts) {
    for (const x of Array.isArray(v) ? v : [v]) a.counts.set(x, (a.counts.get(x) || 0) + 1);
  } else if (a.dist) {
    const n = Number(v);
    if (n >= 1 && n <= 5) { a.dist[n - 1] += 1; a.sum += n; }
  } else if (f.type === 'number') {
    const n = Number(v);
    a.sum += n;
    a.min = a.min === null ? n : Math.min(a.min, n);
    a.max = a.max === null ? n : Math.max(a.max, n);
  } else {
    for (const x of Array.isArray(v) ? v : [v]) {
      if (a.samples.length < SAMPLE_LIMIT) a.samples.push(String(x));
    }
  }
}

function finalize(a) {
  const out = { fieldId: a.fieldId, label: a.label, type: a.type, answered: a.answered };
  if (a.counts) out.options = [...a.counts].map(([option, count]) => ({ option, count }));
  else if (a.dist) {
    const n = a.dist.reduce((s, x) => s + x, 0);
    out.average = n ? Math.round((a.sum / n) * 100) / 100 : null;
    out.distribution = a.dist;
  } else if (a.type === 'number') {
    out.min = a.min;
    out.max = a.max;
    out.average = a.answered ? Math.round((a.sum / a.answered) * 100) / 100 : null;
  } else out.samples = a.samples;
  return out;
}

export async function buildSummary(form) {
  const fields = form.fields || [];
  const acc = new Map(fields.map((f) => [f.id, init(f)]));

  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const daily = [];
  const dayIndex = new Map();
  for (let i = 13; i >= 0; i -= 1) {
    const d = new Date(today);
    d.setUTCDate(d.getUTCDate() - i);
    const key = d.toISOString().slice(0, 10);
    dayIndex.set(key, daily.length);
    daily.push({ date: key, count: 0 });
  }

  let total = 0;
  let lastResponseAt = null;
  const cursor = Submission.find({ form: form._id }).sort({ createdAt: -1 }).select('answers createdAt').lean().cursor();
  for await (const s of cursor) {
    total += 1;
    if (!lastResponseAt) lastResponseAt = s.createdAt;
    const di = dayIndex.get(s.createdAt.toISOString().slice(0, 10));
    if (di !== undefined) daily[di].count += 1;
    for (const f of fields) {
      const v = s.answers?.[f.id];
      if (v !== undefined && v !== null) accumulate(acc.get(f.id), f, v);
    }
  }

  return { total, lastResponseAt, daily, fields: fields.map((f) => finalize(acc.get(f.id))) };
}

/** What anyone with the public link may see: totals and chart data only, never written answers, links or photos. */
export function toPublicSummary(summary) {
  return {
    total: summary.total,
    fields: summary.fields.map(({ samples, ...rest }) => rest), // eslint-disable-line no-unused-vars
  };
}
