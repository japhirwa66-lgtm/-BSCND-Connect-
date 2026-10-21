import { useState } from 'react';
import FieldEditor from './FieldEditor.jsx';
import SocialIcon from './SocialIcon.jsx';
import { detectPlatform } from '../lib/social.js';
import { FIELD_TYPES, CHOICE_TYPES, newField, uid } from '../lib/fieldTypes.js';
import { toLocalInput } from '../lib/utils.js';

const DEFAULT_CONFIRM = 'Your response has been recorded.';

export default function FormBuilder({ initial, onSubmit, submitLabel, saving, serverError, onCancel }) {
  const [title, setTitle] = useState(initial?.title || '');
  const [description, setDescription] = useState(initial?.description || '');
  const [fields, setFields] = useState(initial?.fields?.length ? initial.fields : [newField()]);
  const [confirmation, setConfirmation] = useState(initial?.confirmationMessage ?? DEFAULT_CONFIRM);
  const [closesAt, setClosesAt] = useState(initial?.closesAt ? toLocalInput(initial.closesAt) : '');
  const [maxResponses, setMaxResponses] = useState(initial?.maxResponses ? String(initial.maxResponses) : '');
  const [errors, setErrors] = useState({});
  const [addType, setAddType] = useState('short_text');
  const [resultsPublic, setResultsPublic] = useState(initial?.resultsPublic !== false);
  const [links, setLinks] = useState(initial?.socialLinks || []);

  const update = (i, patch) => setFields((fs) => fs.map((f, j) => (j === i ? { ...f, ...patch } : f)));
  const move = (i, dir) => setFields((fs) => {
    const j = i + dir;
    if (j < 0 || j >= fs.length) return fs;
    const c = [...fs];
    [c[i], c[j]] = [c[j], c[i]];
    return c;
  });
  const remove = (i) => setFields((fs) => (fs.length > 1 ? fs.filter((_, j) => j !== i) : fs));
  const duplicate = (i) => setFields((fs) => {
    const c = [...fs];
    c.splice(i + 1, 0, { ...fs[i], id: uid(), options: [...fs[i].options] });
    return c;
  });

  const validate = () => {
    const e = { fields: {} };
    if (!title.trim()) e.title = 'Give your form a title';
    fields.forEach((f) => {
      const msgs = [];
      if (!f.label.trim()) msgs.push('Every question needs a title');
      if (CHOICE_TYPES.includes(f.type)) {
        const opts = f.options.map((o) => o.trim());
        if (opts.length < 1 || opts.some((o) => !o)) msgs.push('Options cannot be empty');
        else if (new Set(opts).size !== opts.length) msgs.push('Options must be unique');
      }
      if (msgs.length) e.fields[f.id] = msgs.join('. ');
    });
    if (maxResponses && (!/^\d+$/.test(maxResponses) || Number(maxResponses) < 1)) e.maxResponses = 'Enter a whole number of 1 or more';
    if (closesAt && Number.isNaN(new Date(closesAt).getTime())) e.closesAt = 'Enter a valid date and time';
    if (links.some((l) => l.trim() && !/^(https?:\/\/)?[^\s/]+\.[^\s/]+\S*$/i.test(l.trim()))) e.links = 'Enter valid links, e.g. instagram.com/yourname';
    setErrors(e);
    return !e.title && !e.maxResponses && !e.closesAt && !e.links && Object.keys(e.fields).length === 0;
  };

  const submit = (ev) => {
    ev.preventDefault();
    if (!validate()) return;
    onSubmit({
      title: title.trim(),
      description: description.trim(),
      confirmationMessage: confirmation.trim() || DEFAULT_CONFIRM,
      closesAt: closesAt ? new Date(closesAt).toISOString() : null,
      maxResponses: maxResponses ? Number(maxResponses) : null,
      resultsPublic,
      socialLinks: links.map((l) => l.trim()).filter(Boolean),
      fields: fields.map((f) => ({
        id: f.id,
        type: f.type,
        label: f.label.trim(),
        description: (f.description || '').trim(),
        required: !!f.required,
        options: CHOICE_TYPES.includes(f.type) ? f.options.map((o) => o.trim()) : [],
        maxFiles: f.type === 'image' ? f.maxFiles || 1 : 1,
      })),
    });
  };

  const hasErrors = errors.title || errors.maxResponses || errors.closesAt || errors.links || (errors.fields && Object.keys(errors.fields).length);

  return (
    <form className="builder" onSubmit={submit} noValidate>
      <section className="sheet">
        <div className="fgroup">
          <label className="flabel" htmlFor="f-title">Form title</label>
          <input id="f-title" className="input input-title" value={title} maxLength={200} placeholder="e.g. Parent feedback survey" onChange={(e) => setTitle(e.target.value)} aria-invalid={errors.title ? true : undefined} />
          {errors.title && <p className="error-text" role="alert">{errors.title}</p>}
        </div>
        <div className="fgroup">
          <label className="flabel" htmlFor="f-desc">Description <span className="muted">(optional)</span></label>
          <textarea id="f-desc" className="input" rows={2} value={description} maxLength={2000} placeholder="Tell people what this form is for" onChange={(e) => setDescription(e.target.value)} />
        </div>
        <div className="fgroup">
          <span className="flabel">Social media links <span className="muted">(optional, shown on your form with their icons)</span></span>
          <ul className="options">
            {links.map((l, i) => (
              <li key={i}>
                <span className="social-preview" aria-hidden="true"><SocialIcon platform={detectPlatform(l)} size={20} /></span>
                <input className="input" value={l} maxLength={300} inputMode="url" autoCapitalize="none" spellCheck={false} placeholder="instagram.com/yourname" aria-label={`Social link ${i + 1}`} onChange={(e) => setLinks((ls) => ls.map((x, j) => (j === i ? e.target.value : x)))} />
                <button type="button" className="icon-btn" aria-label={`Remove social link ${i + 1}`} onClick={() => setLinks((ls) => ls.filter((_, j) => j !== i))}>✕</button>
              </li>
            ))}
          </ul>
          <div><button type="button" className="btn btn-ghost btn-sm" onClick={() => setLinks((ls) => [...ls, ''])} disabled={links.length >= 8}>Add social link</button></div>
          {errors.links && <p className="error-text" role="alert">{errors.links}</p>}
        </div>
      </section>

      <div className="qlist">
        {fields.map((f, i) => (
          <FieldEditor
            key={f.id}
            index={i}
            count={fields.length}
            field={f}
            error={errors.fields?.[f.id]}
            onChange={(patch) => update(i, patch)}
            onMove={(d) => move(i, d)}
            onDuplicate={() => duplicate(i)}
            onRemove={() => remove(i)}
          />
        ))}
      </div>

      <div className="addbar">
        <select className="input" value={addType} onChange={(e) => setAddType(e.target.value)} aria-label="Type of question to add">
          {FIELD_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
        <button type="button" className="btn btn-ghost" onClick={() => setFields((fs) => [...fs, newField(addType)])} disabled={fields.length >= 100}>
          Add question
        </button>
      </div>

      <details className="sheet settings">
        <summary>Settings</summary>
        <div className="fgroup">
          <label className="flabel" htmlFor="f-conf">Message after submitting</label>
          <input id="f-conf" className="input" value={confirmation} maxLength={500} onChange={(e) => setConfirmation(e.target.value)} />
        </div>
        <label className="switch">
          <input type="checkbox" checked={resultsPublic} onChange={(e) => setResultsPublic(e.target.checked)} />
          <span>Anyone with the link can see the results</span>
        </label>
        <p className="hint spaced">They see totals and charts only. Written answers, emails, links and photos stay private to you.</p>
        <div className="qgrid">
          <div className="fgroup qgrow">
            <label className="flabel" htmlFor="f-close">Stop accepting responses at <span className="muted">(optional)</span></label>
            <input id="f-close" className="input" type="datetime-local" value={closesAt} onChange={(e) => setClosesAt(e.target.value)} />
            {errors.closesAt && <p className="error-text" role="alert">{errors.closesAt}</p>}
          </div>
          <div className="fgroup qgrow">
            <label className="flabel" htmlFor="f-max">Maximum responses <span className="muted">(optional)</span></label>
            <input id="f-max" className="input" inputMode="numeric" value={maxResponses} placeholder="Unlimited" onChange={(e) => setMaxResponses(e.target.value)} />
            {errors.maxResponses && <p className="error-text" role="alert">{errors.maxResponses}</p>}
          </div>
        </div>
      </details>

      {(serverError || hasErrors) && (
        <p className="banner banner-danger" role="alert">{serverError || 'Fix the highlighted problems, then save again.'}</p>
      )}

      <div className="actionbar">
        {onCancel && <button type="button" className="btn btn-ghost" onClick={onCancel} disabled={saving}>Cancel</button>}
        <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving…' : submitLabel}</button>
      </div>
    </form>
  );
}
