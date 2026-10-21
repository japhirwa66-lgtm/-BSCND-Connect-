import { api } from '../lib/api.js';
import { typeLabel } from '../lib/fieldTypes.js';
import SocialLink from './SocialLink.jsx';

const pct = (n, total) => (total ? Math.round((n / total) * 100) : 0);

export function Bars({ rows, total }) {
  return (
    <ul className="bars">
      {rows.map((r) => (
        <li key={r.label}>
          <div className="bar-top"><span>{r.label}</span><span className="muted">{r.count} · {pct(r.count, total)}%</span></div>
          <div className="bar"><span style={{ width: `${pct(r.count, total)}%` }} /></div>
        </li>
      ))}
    </ul>
  );
}

/** One question's results. Used by the owner dashboard (with samples) and the public results page (without). */
export function FieldSummary({ s }) {
  let body;
  if (s.options) body = <Bars rows={s.options.map((o) => ({ label: o.option, count: o.count }))} total={s.answered} />;
  else if (s.distribution) {
    body = (
      <>
        <p className="big">{s.average ?? '—'} <span className="muted small">average of 5</span></p>
        <Bars rows={s.distribution.map((c, i) => ({ label: `${i + 1} ★`, count: c })).reverse()} total={s.answered} />
      </>
    );
  } else if (s.type === 'number') {
    body = (
      <dl className="stats">
        <div><dt>Lowest</dt><dd>{s.min ?? '—'}</dd></div>
        <div><dt>Average</dt><dd>{s.average ?? '—'}</dd></div>
        <div><dt>Highest</dt><dd>{s.max ?? '—'}</dd></div>
      </dl>
    );
  } else if (!s.samples) {
    body = <p className="muted">{s.answered} answer{s.answered === 1 ? '' : 's'}. Written answers, links and photos are visible only to the form owner.</p>;
  } else if (!s.samples.length) {
    body = <p className="muted">No answers yet.</p>;
  } else if (s.type === 'image') {
    body = (
      <div className="thumbs">
        {s.samples.map((t) => (
          <a key={t} href={api.fileUrl(t)} target="_blank" rel="noreferrer"><img src={api.fileUrl(t, 200)} alt="Uploaded photo" loading="lazy" /></a>
        ))}
      </div>
    );
  } else if (s.type === 'social') {
    body = <ul className="samples">{s.samples.map((u, i) => <li key={i}><SocialLink url={u} /></li>)}</ul>;
  } else {
    body = <ul className="samples">{s.samples.map((t, i) => <li key={i}>{t}</li>)}</ul>;
  }
  return (
    <section className="panel">
      <h3 className="h3">{s.label}</h3>
      <p className="muted small">{typeLabel(s.type)} · {s.answered} answered{s.samples ? ' · latest first' : ''}</p>
      {body}
    </section>
  );
}
