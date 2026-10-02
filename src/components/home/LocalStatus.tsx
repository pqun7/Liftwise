import { Link } from 'react-router-dom';

export function LocalStatus() {
  return (
    <Link
      to="/settings/data-safety"
      className="home-local"
      aria-label="Local data — open Data Safety"
    >
      <span aria-hidden="true" /> Local
    </Link>
  );
}
