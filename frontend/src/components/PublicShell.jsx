import { Link } from 'react-router-dom';
import Brand from './Logo.jsx';

export default function PublicShell({ children }) {
  return (
    <div className="public">
      <header className="container public-top"><Brand size={26} /></header>
      <div className="container page-narrow">{children}</div>
      <p className="footer container">Made with <Link to="/">BSCND Connect</Link></p>
    </div>
  );
}
