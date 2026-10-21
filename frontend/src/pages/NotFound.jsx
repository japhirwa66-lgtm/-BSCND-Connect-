import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <div className="page-narrow center-block">
      <h1 className="h1">Page not found</h1>
      <p className="lead">The link may be mistyped or the form may have been deleted.</p>
      <Link to="/" className="btn btn-primary">Back to home</Link>
    </div>
  );
}
