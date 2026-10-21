import { api } from '../lib/api.js';
import { formatAnswer } from '../lib/utils.js';
import SocialLink from './SocialLink.jsx';

/** Renders one stored answer: photos as thumbnails, social links with icons, everything else as text. */
export default function AnswerValue({ field, value }) {
  if (value === undefined || value === null || value === '') return <>—</>;
  if (field.type === 'image' && Array.isArray(value)) {
    return (
      <span className="thumbs">
        {value.map((t) => (
          <a key={t} href={api.fileUrl(t)} target="_blank" rel="noreferrer">
            <img src={api.fileUrl(t, 200)} alt={`${field.label}: uploaded photo`} loading="lazy" />
          </a>
        ))}
      </span>
    );
  }
  if (field.type === 'social') return <SocialLink url={value} />;
  return <>{formatAnswer(field, value)}</>;
}
