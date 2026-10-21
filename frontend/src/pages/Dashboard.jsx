import { useCallback, useEffect, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import Spinner from '../components/Spinner.jsx';
import SummaryTab from '../components/dashboard/SummaryTab.jsx';
import ResponsesTab from '../components/dashboard/ResponsesTab.jsx';
import ShareTab from '../components/dashboard/ShareTab.jsx';
import CopyButton from '../components/CopyButton.jsx';
import { api } from '../lib/api.js';
import { saveForm } from '../lib/storage.js';
import { dashboardUrl, publicUrl, STATUS_LABEL } from '../lib/utils.js';

const TABS = [['summary', 'Summary'], ['responses', 'Responses'], ['share', 'Share & settings']];

export default function Dashboard() {
  const { key } = useParams();
  const location = useLocation();
  const [form, setForm] = useState(null);
  const [error, setError] = useState(null);
  const [tab, setTab] = useState('summary');
  const [busy, setBusy] = useState(false);
  const [refreshToken, setRefreshToken] = useState(0);
  const [showWelcome, setShowWelcome] = useState(!!location.state?.justCreated);

  const load = useCallback((signal) =>
    api.getManaged(key, signal).then((d) => {
      setForm(d.form);
      saveForm({ slug: d.form.slug, key, title: d.form.title });
      document.title = `${d.form.title} · Results`;
    }).catch((e) => { if (e.name !== 'AbortError') setError(e); }), [key]);

  useEffect(() => {
    const ac = new AbortController();
    setForm(null);
    setError(null);
    load(ac.signal);
    return () => ac.abort();
  }, [load]);

  const refresh = () => { load(); setRefreshToken((n) => n + 1); };

  const toggle = async () => {
    setBusy(true);
    try { const d = await api.setStatus(key, !form.isOpen); setForm(d.form); }
    catch (e) { window.alert(e.message); }
    finally { setBusy(false); }
  };

  if (error) {
    return (
      <div className="page-narrow center-block">
        <h1 className="h1">{error.status === 404 ? 'Dashboard not found' : 'Could not load dashboard'}</h1>
        <p className="lead">{error.message}</p>
        <Link to="/" className="btn btn-primary">Back to home</Link>
      </div>
    );
  }
  if (!form) return <Spinner />;

  return (
    <div className="dash">
      {showWelcome && (
        <section className="banner banner-ok welcome">
          <h2 className="h3">Your form is live</h2>
          <p>Share the public link below. Save your access key: it is the only way back to these results from another device.</p>
          <div className="row-wrap">
            <CopyButton text={publicUrl(form.slug)} label="Copy public link" className="btn btn-dark btn-sm" />
            <CopyButton text={key} label="Copy access key" className="btn btn-dark btn-sm" />
            <CopyButton text={dashboardUrl(key)} label="Copy dashboard link" className="btn btn-dark btn-sm" />
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setShowWelcome(false)}>Dismiss</button>
          </div>
        </section>
      )}

      <header className="dash-head">
        <div>
          <h1 className="h1">{form.title}</h1>
          <p className="muted">
            <span className={`badge badge-${form.status}`}>{STATUS_LABEL[form.status]}</span>{' '}
            {form.responseCount} response{form.responseCount === 1 ? '' : 's'}
            {form.maxResponses ? ` of ${form.maxResponses}` : ''}
          </p>
        </div>
        <div className="row-wrap">
          <button type="button" className="btn btn-ghost btn-sm" onClick={toggle} disabled={busy}>
            {form.isOpen ? 'Stop accepting responses' : 'Accept responses again'}
          </button>
          <Link to={`/manage/${key}/edit`} className="btn btn-ghost btn-sm">Edit form</Link>
          <a href={publicUrl(form.slug)} target="_blank" rel="noreferrer" className="btn btn-primary btn-sm">View form</a>
        </div>
      </header>

      <div className="tabs" role="tablist" aria-label="Dashboard sections">
        {TABS.map(([id, label]) => (
          <button key={id} role="tab" type="button" aria-selected={tab === id} className={tab === id ? 'tab on' : 'tab'} onClick={() => setTab(id)}>
            {label}
          </button>
        ))}
        <button type="button" className="tab refresh" onClick={refresh} aria-label="Refresh results">Refresh</button>
      </div>

      <div role="tabpanel">
        {tab === 'summary' && <SummaryTab formKey={key} refreshToken={refreshToken} />}
        {tab === 'responses' && <ResponsesTab formKey={key} form={form} onChanged={refresh} refreshToken={refreshToken} />}
        {tab === 'share' && <ShareTab formKey={key} form={form} />}
      </div>
    </div>
  );
}
