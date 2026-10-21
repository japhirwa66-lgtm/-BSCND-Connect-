import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import PublicShell from '../components/PublicShell.jsx';
import Spinner from '../components/Spinner.jsx';
import SocialBar from '../components/SocialBar.jsx';
import { FieldSummary } from '../components/ResultsCharts.jsx';
import { api } from '../lib/api.js';

export default function PublicResults() {
  const { slug } = useParams();
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const ac = new AbortController();
    setError(null);
    api.getResults(slug, ac.signal)
      .then((d) => { setData(d); document.title = `${d.form.title} · Results`; })
      .catch((e) => e.name !== 'AbortError' && setError(e));
    return () => ac.abort();
  }, [slug, tick]);

  let body;
  if (error) {
    body = (
      <div className="sheet done">
        <h1 className="h1">{error.status === 404 ? 'Form not found' : 'Results unavailable'}</h1>
        <p className="banner">{error.message}</p>
        <Link to={`/f/${slug}`} className="btn btn-ghost">Back to the form</Link>
      </div>
    );
  } else if (!data) body = <Spinner />;
  else {
    body = (
      <div className="stack">
        <div className="sheet form-head">
          <p className="muted small">Results</p>
          <h1 className="h1">{data.form.title}</h1>
          <p className="big">{data.total} <span className="muted small">response{data.total === 1 ? '' : 's'}</span></p>
          <SocialBar links={data.form.socialLinks} />
          <div className="row-wrap">
            {data.form.status === 'open' && <Link to={`/f/${slug}`} className="btn btn-primary btn-sm">Fill out the form</Link>}
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setTick((n) => n + 1)}>Refresh</button>
          </div>
        </div>
        {data.total === 0 ? <p className="panel muted">No responses yet. Check back soon.</p> : data.fields.map((s) => <FieldSummary key={s.fieldId} s={s} />)}
      </div>
    );
  }
  return <PublicShell>{body}</PublicShell>;
}
