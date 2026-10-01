import { Link, isRouteErrorResponse, useRouteError } from 'react-router-dom';

export function ProgramRouteError() {
  const error = useRouteError();
  const message =
    isRouteErrorResponse(error) && error.status === 404
      ? 'That program item is not available.'
      : 'Programs could not be opened.';
  return (
    <section className="page-stack">
      <p className="section-kicker">Programs</p>
      <h1>{message}</h1>
      <p className="muted">Your existing data is unchanged.</p>
      <Link className="primary-link" to="/plan">
        Return to programs
      </Link>
    </section>
  );
}
