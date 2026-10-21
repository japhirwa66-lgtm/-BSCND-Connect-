import { useEffect, useState } from 'react';
import Spinner from '../Spinner.jsx';
import { api } from '../../lib/api.js';
import { FieldSummary } from '../ResultsCharts.jsx';
import { formatDate } from '../../lib/utils.js';

export default function SummaryTab({ formKey, refreshToken }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const ac = new AbortController();
    setError('');
    api.getSummary(formKey, ac.signal).then(setData).catch((e) => e.name !== 'AbortError' && setError(e.message));
    return () => ac.abort();
  }, [formKey, refreshToken]);

  if (error) return <p className="banner banner-danger">{error}</p>;
  if (!data) return <Spinner />;

  const max = Math.max(1, ...data.daily.map((d) => d.count));
  return (
    <div className="stack">
      <section className="panel">
        <div className="kpis">
          <div><p className="big">{data.total}</p><p className="muted small">Responses</p></div>
          <div><p className="kpi-sm">{data.lastResponseAt ? formatDate(data.lastResponseAt) : 'None yet'}</p><p className="muted small">Latest response</p></div>
        </div>
        <p className="muted small">Last 14 days</p>
        <div className="spark" role="img" aria-label={`Responses per day, last 14 days: ${data.daily.map((d) => d.count).join(', ')}`}>
          {data.daily.map((d) => (
            <span key={d.date} title={`${d.date}: ${d.count}`} style={{ height: `${Math.max(4, (d.count / max) * 100)}%` }} className={d.count ? 'on' : ''} />
          ))}
        </div>
      </section>
      {data.total === 0 ? (
        <p className="muted">Charts appear here as soon as the first response arrives.</p>
      ) : (
        data.fields.map((s) => <FieldSummary key={s.fieldId} s={s} />)
      )}
    </div>
  );
}
