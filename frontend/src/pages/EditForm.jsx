import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import FormBuilder from '../components/FormBuilder.jsx';
import Spinner from '../components/Spinner.jsx';
import { api } from '../lib/api.js';
import { saveForm } from '../lib/storage.js';

export default function EditForm() {
  const { key } = useParams();
  const navigate = useNavigate();
  const [form, setForm] = useState(null);
  const [loadError, setLoadError] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const ac = new AbortController();
    api.getManaged(key, ac.signal).then((d) => setForm(d.form)).catch((e) => e.name !== 'AbortError' && setLoadError(e.message));
    return () => ac.abort();
  }, [key]);

  const onSubmit = async (payload) => {
    setSaving(true);
    setError('');
    try {
      const { form: saved } = await api.updateForm(key, payload);
      saveForm({ slug: saved.slug, key, title: saved.title });
      navigate(`/manage/${key}`);
    } catch (err) {
      setError(err.message);
      setSaving(false);
    }
  };

  if (loadError) return <div className="banner banner-danger">{loadError} <Link to="/">Go home</Link></div>;
  if (!form) return <Spinner />;

  return (
    <div className="page-narrow">
      <h1 className="h1">Edit form</h1>
      {form.responseCount > 0 && (
        <p className="banner">This form already has {form.responseCount} response{form.responseCount === 1 ? '' : 's'}. Removing a question hides its answers from the dashboard; existing answers to other questions are kept.</p>
      )}
      <FormBuilder initial={form} submitLabel="Save changes" saving={saving} serverError={error} onSubmit={onSubmit} onCancel={() => navigate(`/manage/${key}`)} />
    </div>
  );
}
