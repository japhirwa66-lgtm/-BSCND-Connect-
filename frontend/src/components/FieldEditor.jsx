import { FIELD_TYPES, CHOICE_TYPES } from '../lib/fieldTypes.js';

export default function FieldEditor({ index, count, field, error, onChange, onMove, onDuplicate, onRemove }) {
  const isChoice = CHOICE_TYPES.includes(field.type);
  const setOption = (i, v) => onChange({ options: field.options.map((o, j) => (j === i ? v : o)) });
  const addOption = () => onChange({ options: [...field.options, `Option ${field.options.length + 1}`] });
  const removeOption = (i) => field.options.length > 1 && onChange({ options: field.options.filter((_, j) => j !== i) });

  const changeType = (type) => {
    const patch = { type };
    if (CHOICE_TYPES.includes(type) && field.options.length === 0) patch.options = ['Option 1', 'Option 2'];
    onChange(patch);
  };

  return (
    <section className={error ? 'qcard has-error' : 'qcard'} aria-label={`Question ${index + 1}`}>
      <div className="qcard-head">
        <span className="qnum">Q{index + 1}</span>
        <div className="qtools">
          <button type="button" className="icon-btn" onClick={() => onMove(-1)} disabled={index === 0} aria-label="Move question up">↑</button>
          <button type="button" className="icon-btn" onClick={() => onMove(1)} disabled={index === count - 1} aria-label="Move question down">↓</button>
          <button type="button" className="icon-btn" onClick={onDuplicate} aria-label="Duplicate question">⧉</button>
          <button type="button" className="icon-btn danger" onClick={onRemove} disabled={count === 1} aria-label="Delete question">✕</button>
        </div>
      </div>

      <div className="qgrid">
        <div className="fgroup qgrow">
          <label className="flabel" htmlFor={`l-${field.id}`}>Question</label>
          <input id={`l-${field.id}`} className="input" value={field.label} maxLength={300} placeholder="Type your question" onChange={(e) => onChange({ label: e.target.value })} />
        </div>
        <div className="fgroup">
          <label className="flabel" htmlFor={`t-${field.id}`}>Answer type</label>
          <select id={`t-${field.id}`} className="input" value={field.type} onChange={(e) => changeType(e.target.value)}>
            {FIELD_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </div>
      </div>

      <div className="fgroup">
        <label className="flabel" htmlFor={`d-${field.id}`}>Help text <span className="muted">(optional)</span></label>
        <input id={`d-${field.id}`} className="input" value={field.description} maxLength={500} onChange={(e) => onChange({ description: e.target.value })} />
      </div>

      {isChoice && (
        <div className="fgroup">
          <span className="flabel">Options</span>
          <ul className="options">
            {field.options.map((o, i) => (
              <li key={i}>
                <input className="input" value={o} maxLength={200} aria-label={`Option ${i + 1}`} onChange={(e) => setOption(i, e.target.value)} />
                <button type="button" className="icon-btn" onClick={() => removeOption(i)} disabled={field.options.length === 1} aria-label={`Remove option ${i + 1}`}>✕</button>
              </li>
            ))}
          </ul>
          <button type="button" className="btn btn-ghost btn-sm" onClick={addOption} disabled={field.options.length >= 50}>Add option</button>
        </div>
      )}

      {field.type === 'image' && (
        <div className="fgroup">
          <label className="flabel" htmlFor={`m-${field.id}`}>Maximum photos per response</label>
          <select id={`m-${field.id}`} className="input narrow" value={field.maxFiles || 1} onChange={(e) => onChange({ maxFiles: Number(e.target.value) })}>
            {[1, 2, 3, 4, 5, 6, 8, 10].map((n) => <option key={n} value={n}>{n}</option>)}
          </select>
        </div>
      )}

      <label className="switch">
        <input type="checkbox" checked={field.required} onChange={(e) => onChange({ required: e.target.checked })} />
        <span>Required</span>
      </label>
      {error && <p className="error-text" role="alert">{error}</p>}
    </section>
  );
}
