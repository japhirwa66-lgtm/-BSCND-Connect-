import { useCallback, useEffect, useState } from 'react';
import Spinner from '../Spinner.jsx';
import { api } from '../../lib/api.js';
import AnswerValue from '../AnswerValue.jsx';
import { formatDate } from '../../lib/utils.js';

export default function ResponsesTab({ formKey, form, onChanged, refreshToken }) {
  const [page, setPage] = useState(1);
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  const load = useCallback((signal) => {
    setError('');
    return api.listResponses(formKey, page, signal).then((d) => {
      setData(d);
      if (d.page !== page) setPage(d.page);
    }).catch((e) => e.name !== 'AbortError' && setError(e.message));
  }, [formKey, page]);

  useEffect(() => {
    const ac = new AbortController();
    load(ac.signal);
    return () => ac.abort();
  }, [load, refreshToken]);

  const removeOne = async (id) => {
    if (!window.confirm('Delete this response? This cannot be undone.')) return;
    try { await api.deleteResponse(formKey, id); await load(); onChanged(); } catch (e) { setError(e.message); }
  };
  const clearAll = async () => {
    if (!window.confirm(`Delete all ${data.total} responses? This cannot be undone.`)) return;
    try { await api.clearResponses(formKey); setPage(1); await load(); onChanged(); } catch (e) { setError(e.message); }
  };

  if (error && !data) return <p className="banner banner-danger">{error}</p>;
  if (!data) return <Spinner />;

  return (
    <div className="stack">
      <div className="toolbar">
        <span className="muted">{data.total} response{data.total === 1 ? '' : 's'}</span>
        <div className="toolbar-actions">
          <a className="btn btn-ghost btn-sm" href={api.exportUrl(formKey)} download>Download CSV</a>
          {data.total > 0 && <button type="button" className="btn btn-ghost btn-sm danger-text" onClick={clearAll}>Delete all</button>}
        </div>
      </div>
      {error && <p className="banner banner-danger">{error}</p>}
      {data.total === 0 ? (
        <p className="panel muted">No responses yet. Share the public link and they will show up here.</p>
      ) : (
        <ul className="responses">
          {data.items.map((r, i) => (
            <li key={r.id} className="panel response">
              <div className="response-head">
                <strong>#{data.total - ((data.page - 1) * data.limit + i)}</strong>
                <span className="muted small">{formatDate(r.createdAt)}</span>
                <button type="button" className="btn btn-ghost btn-sm danger-text" onClick={() => removeOne(r.id)}>Delete</button>
              </div>
              <dl className="answers">
                {form.fields.map((f) => (
                  <div key={f.id}>
                    <dt>{f.label}</dt>
                    <dd className={r.answers?.[f.id] === undefined ? 'muted' : ''}><AnswerValue field={f} value={r.answers?.[f.id]} /></dd>
                  </div>
                ))}
              </dl>
            </li>
          ))}
        </ul>
      )}
      {data.pages > 1 && (
        <div className="pager">
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={data.page <= 1}>Previous</button>
          <span className="muted small">Page {data.page} of {data.pages}</span>
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => setPage((p) => Math.min(data.pages, p + 1))} disabled={data.page >= data.pages}>Next</button>
        </div>
      )}
    </div>
  );
}
