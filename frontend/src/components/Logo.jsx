import { Link } from 'react-router-dom';

/** BSCND Connect mark: two interlocked links (people and answers connecting) on a cobalt tile. */
export function LogoMark({ size = 28 }) {
  return (
    <svg viewBox="0 0 32 32" width={size} height={size} aria-hidden="true" focusable="false">
      <rect width="32" height="32" rx="8" fill="#1d3fd8" />
      <rect x="5" y="11" width="14" height="10" rx="5" fill="none" stroke="#ffffff" strokeWidth="3" />
      <rect x="13" y="11" width="14" height="10" rx="5" fill="none" stroke="#ffc83d" strokeWidth="3" />
    </svg>
  );
}

export default function Brand({ size = 28 }) {
  return (
    <Link to="/" className="brand" aria-label="BSCND Connect home">
      <LogoMark size={size} />
      <span className="brand-name"><b>BSCND</b> Connect</span>
    </Link>
  );
}
