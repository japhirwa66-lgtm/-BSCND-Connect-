import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import FormBuilder from '../components/FormBuilder.jsx';
import { api } from '../lib/api.js';
import { saveForm } from '../lib/storage.js';

export default function CreateForm() {
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const onSubmit = async (payload) => {
    setSaving(true);
    setError('');
    try {
      const { form, adminKey } = await api.createForm(payload);
      saveForm({ slug: form.slug, key: adminKey, title: form.title });
      navigate(`/manage/${adminKey}`, { replace: true, state: { justCreated: true } });
    } catch (err) {
      setError(err.message);
      setSaving(false);
    }
  };

  return (
    <div className="page-narrow">
      <h1 className="h1">New form</h1>
      <p className="lead">No account needed. When you save, you get a public link to share and a private access key for the results.</p>
      <FormBuilder submitLabel="Create form" saving={saving} serverError={error} onSubmit={onSubmit} />
    </div>
  );
}
