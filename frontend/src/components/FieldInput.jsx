import { memo } from 'react';
import PhotoInput from './PhotoInput.jsx';
import SocialIcon from './SocialIcon.jsx';
import { detectPlatform } from '../lib/social.js';

function FieldInput({ field, slug, value, error, onChange, onBusy }) {
  const id = `q-${field.id}`;
  const describedBy = [field.description && `${id}-d`, error && `${id}-e`].filter(Boolean).join(' ') || undefined;
  const common = { id, 'aria-describedby': describedBy, 'aria-invalid': error ? true : undefined };

  let control;
  switch (field.type) {
    case 'long_text':
      control = <textarea {...common} className="input" rows={4} value={value || ''} onChange={(e) => onChange(field.id, e.target.value)} />;
      break;
    case 'email':
      control = <input {...common} className="input" type="email" inputMode="email" autoComplete="email" value={value || ''} onChange={(e) => onChange(field.id, e.target.value)} />;
      break;
    case 'number':
      control = <input {...common} className="input" type="text" inputMode="decimal" value={value ?? ''} onChange={(e) => onChange(field.id, e.target.value)} />;
      break;
    case 'date':
      control = <input {...common} className="input" type="date" value={value || ''} onChange={(e) => onChange(field.id, e.target.value)} />;
      break;
    case 'dropdown':
      control = (
        <select {...common} className="input" value={value || ''} onChange={(e) => onChange(field.id, e.target.value)}>
          <option value="">Choose…</option>
          {field.options.map((o) => <option key={o} value={o}>{o}</option>)}
        </select>
      );
      break;
    case 'radio':
      control = (
        <div className="choices" role="radiogroup" aria-labelledby={`${id}-l`}>
          {field.options.map((o) => (
            <label key={o} className="choice">
              <input type="radio" name={id} checked={value === o} onChange={() => onChange(field.id, o)} />
              <span>{o}</span>
            </label>
          ))}
        </div>
      );
      break;
    case 'checkbox': {
      const list = Array.isArray(value) ? value : [];
      control = (
        <div className="choices" role="group" aria-labelledby={`${id}-l`}>
          {field.options.map((o) => (
            <label key={o} className="choice">
              <input
                type="checkbox"
                checked={list.includes(o)}
                onChange={(e) => onChange(field.id, e.target.checked ? [...list, o] : list.filter((x) => x !== o))}
              />
              <span>{o}</span>
            </label>
          ))}
        </div>
      );
      break;
    }
    case 'image':
      control = <PhotoInput slug={slug} field={field} labelId={`${id}-l`} onChange={onChange} onBusy={onBusy} />;
      break;
    case 'social':
      control = (
        <div className="social-input">
          <span className="social-preview" aria-hidden="true"><SocialIcon platform={detectPlatform(value)} size={20} /></span>
          <input {...common} className="input" type="text" inputMode="url" autoCapitalize="none" autoCorrect="off" spellCheck={false} placeholder="instagram.com/yourname" maxLength={300} value={value || ''} onChange={(e) => onChange(field.id, e.target.value)} />
        </div>
      );
      break;
    case 'rating':
      control = (
        <div className="rating" role="radiogroup" aria-labelledby={`${id}-l`}>
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              role="radio"
              aria-checked={value === n}
              aria-label={`${n} out of 5`}
              className={value >= n ? 'star on' : 'star'}
              onClick={() => onChange(field.id, value === n ? '' : n)}
            >
              ★
            </button>
          ))}
        </div>
      );
      break;
    default:
      control = <input {...common} className="input" type="text" maxLength={500} value={value || ''} onChange={(e) => onChange(field.id, e.target.value)} />;
  }

  const grouped = ['radio', 'checkbox', 'rating', 'image'].includes(field.type);
  return (
    <div className={error ? 'question has-error' : 'question'}>
      {grouped ? (
        <div className="q-label" id={`${id}-l`}>{field.label}{field.required && <span className="req" title="Required"> *</span>}</div>
      ) : (
        <label className="q-label" id={`${id}-l`} htmlFor={id}>{field.label}{field.required && <span className="req" title="Required"> *</span>}</label>
      )}
      {field.description && <p className="hint" id={`${id}-d`}>{field.description}</p>}
      {control}
      {error && <p className="error-text" id={`${id}-e`} role="alert">{error}</p>}
    </div>
  );
}

export default memo(FieldInput);
