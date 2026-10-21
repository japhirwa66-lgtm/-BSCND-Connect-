import SocialIcon from './SocialIcon.jsx';
import { detectPlatform, displayUrl, isSafeUrl, platformColor, platformName } from '../lib/social.js';

/** One social profile link with its brand icon (used for respondents' answers). */
export default function SocialLink({ url }) {
  if (!isSafeUrl(url)) return <span>{String(url)}</span>;
  const p = detectPlatform(url);
  return (
    <a className="social-link" href={url} target="_blank" rel="noopener noreferrer nofollow" title={platformName(p)}>
      <span className="social-dot" style={{ background: platformColor(p) }}><SocialIcon platform={p} size={14} /></span>
      <span>{displayUrl(url)}</span>
    </a>
  );
}
