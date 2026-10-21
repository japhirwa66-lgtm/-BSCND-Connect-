import { useEffect } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import Brand from './Logo.jsx';

export default function AppLayout() {
  const { pathname } = useLocation();
  useEffect(() => { window.scrollTo(0, 0); }, [pathname]);
  useEffect(() => { document.title = 'BSCND Connect'; }, [pathname]);

  return (
    <div className="shell">
      <header className="topbar">
        <div className="container topbar-in">
          <Brand />
          <nav className="topnav" aria-label="Main">
            <NavLink to="/create" className="btn btn-primary btn-sm">New form</NavLink>
          </nav>
        </div>
      </header>
      <main className="container main">
        <Outlet />
      </main>
      <footer className="footer container">Forms stay private to whoever holds the access key.</footer>
    </div>
  );
}
