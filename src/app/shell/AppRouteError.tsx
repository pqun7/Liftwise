import { Link, useRouteError } from 'react-router-dom';
export function AppRouteError() {
  const error = useRouteError();
  return (
    <main className="app-frame page-stack" role="alert">
      <h1>Liftwise could not open this screen</h1>
      <p>{error instanceof Error ? error.message : 'An unexpected error occurred.'}</p>
      <p>
        No automatic reset or deletion has been performed. If storage is unavailable, close other
        tabs and try again. Keep a backup before clearing browser data.
      </p>
      <Link className="primary-link" to="/">
        Return home
      </Link>
      <Link className="primary-link" to="/settings/data-safety">
        Open Data Safety
      </Link>
      <button className="primary-link" type="button" onClick={() => window.location.reload()}>
        Retry this screen
      </button>
    </main>
  );
}
