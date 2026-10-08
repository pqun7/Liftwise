import { Link, useRouteError } from 'react-router-dom';

export function WorkoutRouteError() {
  const error = useRouteError();
  const message = error instanceof Error ? error.message : 'The workout could not be opened.';

  return (
    <section className="page-stack">
      <p className="section-kicker">Workout</p>
      <h1>{message}</h1>
      <p className="muted">Your saved workout data has not been changed.</p>
      <Link className="primary-link ui-button ui-button-primary" to="/workout">
        Return to workouts
      </Link>
    </section>
  );
}
