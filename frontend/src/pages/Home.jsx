import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import CopyButton from '../components/CopyButton.jsx';
import { getSavedForms, removeSavedForm } from '../lib/storage.js';
import { formatDate, parseKey, publicUrl } from '../lib/utils.js';

export default function Home() {
  const navigate = useNavigate();
  const [saved, setSaved] = useState(getSavedForms);
  const [keyInput, setKeyInput] = useState('');

  const open = (e) => {
    e.preventDefault();
    const key = parseKey(keyInput);
    if (key) navigate(`/manage/${encodeURIComponent(key)}`);
  };

  return (
    <div className="home">
      <section className="hero">
        <h1 className="hero-title">Ask a question.<br />Share a link.<br />Read the answers.</h1>
        <p className="lead">Build a form in minutes, send it to anyone on any phone, and follow responses as they arrive. No sign-up: one private key opens your results.</p>
        <Link to="/create" className="btn btn-primary btn-lg">Create a form</Link>
      </section>

      <section className="panel">
        <h2 className="h2">Open a dashboard</h2>
        <form className="inline-form" onSubmit={open}>
          <label className="sr-only" htmlFor="key">Access key or dashboard link</label>
          <input id="key" className="input" value={keyInput} onChange={(e) => setKeyInput(e.target.value)} placeholder="Paste your access key or dashboard link" autoComplete="off" spellCheck={false} />
          <button className="btn btn-dark" type="submit" disabled={!keyInput.trim()}>Open</button>
        </form>
      </section>

      <section className="panel">
        <h2 className="h2">Forms on this device</h2>
        {saved.length === 0 ? (
          <p className="muted">Forms you create or open here will be listed so you can get back to them quickly.</p>
        ) : (
          <ul className="list">
            {saved.map((f) => (
              <li key={f.key} className="list-item">
                <div className="list-main">
                  <Link to={`/manage/${f.key}`} className="list-title">{f.title}</Link>
                  <span className="muted small">Saved {formatDate(f.savedAt)}</span>
                </div>
                <div className="list-actions">
                  <CopyButton text={publicUrl(f.slug)} label="Copy link" />
                  <button type="button" className="btn btn-ghost btn-sm" onClick={() => { removeSavedForm(f.key); setSaved(getSavedForms()); }} aria-label={`Remove ${f.title} from this list`}>Remove</button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
