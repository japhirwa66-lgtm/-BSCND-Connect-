import SocialIcon from './SocialIcon.jsx';
import { detectPlatform, isSafeUrl, platformColor, platformName } from '../lib/social.js';

/** Row of round brand-coloured icon buttons for the links the form owner added. */
export default function SocialBar({ links }) {
  const list = (links || []).filter(isSafeUrl);
  if (!list.length) return null;
  return (
    <ul className="social-bar" aria-label="Follow us">
      {list.map((url) => {
        const p = detectPlatform(url);
        return (
          <li key={url}>
            <a className="social-btn" style={{ background: platformColor(p) }} href={url} target="_blank" rel="noopener noreferrer nofollow" aria-label={platformName(p)} title={platformName(p)}>
              <SocialIcon platform={p} size={20} />
            </a>
          </li>
        );
      })}
    </ul>
  );
}
