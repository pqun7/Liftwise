import { Link } from 'react-router-dom';

export function NotFoundPage() {
  return (
    <section className="page-stack" aria-labelledby="not-found-title">
      <p className="section-kicker">404</p>
      <h1 id="not-found-title">That screen is not here.</h1>
      <p className="muted">Your local data is safe. Head back home to continue.</p>
      <Link className="primary-link" to="/">
        Return home
      </Link>
    </section>
  );
}
