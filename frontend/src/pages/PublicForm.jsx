import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import FieldInput from '../components/FieldInput.jsx';
import PublicShell from '../components/PublicShell.jsx';
import SocialBar from '../components/SocialBar.jsx';
import Spinner from '../components/Spinner.jsx';
import { api } from '../lib/api.js';
import { validateResponse } from '../lib/fieldTypes.js';

const CLOSED = {
  closed: 'This form is no longer accepting responses.',
  expired: 'This form has passed its closing date.',
  full: 'This form has reached its maximum number of responses.',
};

export default function PublicForm() {
  const { slug } = useParams();
  const [form, setForm] = useState(null);
  const [loadError, setLoadError] = useState('');
  const [values, setValues] = useState({});
  const [errors, setErrors] = useState({});
  const [busyFields, setBusyFields] = useState({});
  const [round, setRound] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [done, setDone] = useState(false);
  const hp = useRef('');

  useEffect(() => {
    const ac = new AbortController();
    api.getPublic(slug, ac.signal)
      .then((d) => { setForm(d.form); document.title = d.form.title; })
      .catch((e) => e.name !== 'AbortError' && setLoadError(e.status === 404 ? 'This form does not exist or was deleted.' : e.message));
    return () => ac.abort();
  }, [slug]);

  const onChange = useCallback((id, v) => {
    setValues((prev) => ({ ...prev, [id]: v }));
    setErrors((prev) => (prev[id] ? { ...prev, [id]: undefined } : prev));
  }, []);
  const onBusy = useCallback((id, busy) => {
    setBusyFields((prev) => (!!prev[id] === busy ? prev : { ...prev, [id]: busy }));
  }, []);
  const uploading = Object.values(busyFields).some(Boolean);

  const submit = async (e) => {
    e.preventDefault();
    if (submitting || uploading) return;
    const local = validateResponse(form.fields, values);
    if (Object.keys(local).length) {
      setErrors(local);
      setFormError('Please fix the highlighted answers.');
      document.getElementById(`q-${Object.keys(local)[0]}-l`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    setSubmitting(true);
    setFormError('');
    try {
      await api.submit(slug, values, hp.current);
      setDone(true);
      window.scrollTo(0, 0);
    } catch (err) {
      if (err.fieldErrors) setErrors(err.fieldErrors);
      if (err.status === 403 && err.code) setForm((f) => ({ ...f, status: err.code, fields: [] }));
      setFormError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const again = () => { setValues({}); setErrors({}); setFormError(''); setBusyFields({}); setRound((n) => n + 1); setDone(false); };
  const resultsLink = form?.resultsPublic ? (
    <Link to={`/f/${slug}/results`} className="btn btn-ghost btn-sm">View results</Link>
  ) : null;

  let body;
  if (loadError) body = <div className="banner banner-danger">{loadError}</div>;
  else if (!form) body = <Spinner />;
  else if (done) {
    body = (
      <div className="sheet done">
        <h1 className="h1">{form.title}</h1>
        <p className="lead">{form.confirmationMessage}</p>
        <div className="row-wrap">
          {resultsLink && <Link to={`/f/${slug}/results`} className="btn btn-primary">See the results</Link>}
          <button type="button" className="btn btn-ghost" onClick={again}>Submit another response</button>
        </div>
        <SocialBar links={form.socialLinks} />
      </div>
    );
  } else if (form.status !== 'open') {
    body = (
      <div className="sheet done">
        <h1 className="h1">{form.title}</h1>
        <p className="banner">{CLOSED[form.status] || CLOSED.closed}</p>
        {resultsLink}
        <SocialBar links={form.socialLinks} />
      </div>
    );
  } else {
    body = (
      <form onSubmit={submit} noValidate>
        <div className="sheet form-head">
          <h1 className="h1">{form.title}</h1>
          {form.description && <p className="lead preline">{form.description}</p>}
          <SocialBar links={form.socialLinks} />
          <div className="head-row">
            <p className="muted small"><span className="req">*</span> Required</p>
            {resultsLink}
          </div>
        </div>
        <div className="sheet questions" key={round}>
          {form.fields.map((f) => (
            <FieldInput key={f.id} field={f} slug={slug} value={values[f.id]} error={errors[f.id]} onChange={onChange} onBusy={onBusy} />
          ))}
        </div>
        {/* honeypot: invisible to people, tempting to bots */}
        <div className="hp" aria-hidden="true">
          <label>Leave this empty<input type="text" tabIndex={-1} autoComplete="off" onChange={(e) => { hp.current = e.target.value; }} /></label>
        </div>
        {formError && <p className="banner banner-danger" role="alert">{formError}</p>}
        <div className="actionbar">
          <button type="submit" className="btn btn-primary btn-lg" disabled={submitting || uploading}>
            {submitting ? 'Sending…' : uploading ? 'Uploading photos…' : 'Submit'}
          </button>
        </div>
      </form>
    );
  }

  return <PublicShell>{body}</PublicShell>;
}
