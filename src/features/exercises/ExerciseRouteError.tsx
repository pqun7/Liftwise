import { Link, isRouteErrorResponse, useRouteError } from 'react-router-dom';

export function ExerciseRouteError() {
  const error = useRouteError();
  const message = isRouteErrorResponse(error)
    ? error.status === 404
      ? 'That exercise is not available.'
      : error.statusText
    : 'The local exercise catalog could not be opened.';

  return (
    <section className="page-stack">
      <p className="section-kicker">Exercise library</p>
      <h1>{message}</h1>
      <p className="muted">No data was reset or deleted. Retry, or return home.</p>
      <Link className="primary-link ui-button ui-button-primary" to="/exercises">
        Retry library
      </Link>
    </section>
  );
}
