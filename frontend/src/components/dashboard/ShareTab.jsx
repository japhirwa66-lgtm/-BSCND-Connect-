import { useNavigate } from 'react-router-dom';
import CopyButton from '../CopyButton.jsx';
import { api } from '../../lib/api.js';
import { removeSavedForm } from '../../lib/storage.js';
import { dashboardUrl, publicUrl, resultsUrl } from '../../lib/utils.js';
import { useState } from 'react';

function CopyRow({ label, value, hint }) {
  return (
    <div className="fgroup">
      <label className="flabel" htmlFor={`cr-${label}`}>{label}</label>
      <div className="inline-form">
        <input id={`cr-${label}`} className="input mono" readOnly value={value} onFocus={(e) => e.target.select()} />
        <CopyButton text={value} className="btn btn-dark" />
      </div>
      {hint && <p className="hint">{hint}</p>}
    </div>
  );
}

export default function ShareTab({ formKey, form }) {
  const navigate = useNavigate();
  const [error, setError] = useState('');

  const del = async () => {
    if (!window.confirm(`Delete "${form.title}" and all ${form.responseCount} responses? This cannot be undone.`)) return;
    try {
      await api.deleteForm(formKey);
      removeSavedForm(formKey);
      navigate('/', { replace: true });
    } catch (e) { setError(e.message); }
  };

  return (
    <div className="stack">
      <section className="panel">
        <h3 className="h3">Share with respondents</h3>
        <CopyRow label="Public link" value={publicUrl(form.slug)} hint="Anyone with this link can fill the form. They cannot see results." />
        {form.resultsPublic && <CopyRow label="Public results link" value={resultsUrl(form.slug)} hint="Anyone with this link sees totals and charts only. Turn this off in Edit form → Settings." />}
        <a className="btn btn-ghost btn-sm" href={publicUrl(form.slug)} target="_blank" rel="noreferrer">Open public form</a>
      </section>
      <section className="panel keycard">
        <h3 className="h3">Your private access key</h3>
        <CopyRow label="Access key" value={formKey} hint="Opens this dashboard from any device. It is stored only as a hash on our side, so it cannot be recovered. Keep it somewhere safe." />
        <CopyRow label="Dashboard link" value={dashboardUrl(formKey)} />
      </section>
      <section className="panel">
        <h3 className="h3">Delete this form</h3>
        <p className="muted">Removes the form, its public link and every response.</p>
        {error && <p className="error-text">{error}</p>}
        <button type="button" className="btn btn-danger" onClick={del}>Delete form</button>
      </section>
    </div>
  );
}
