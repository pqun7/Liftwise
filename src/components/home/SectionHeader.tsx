import { Link } from 'react-router-dom';

export function SectionHeader({
  title,
  to,
  detail = 'See all',
}: {
  title: string;
  to?: string;
  detail?: string;
}) {
  return (
    <div className="home-section-header">
      <h2>{title}</h2>
      {to ? (
        <Link to={to}>
          {detail}
          <span className="sr-only"> — {title}</span>
        </Link>
      ) : null}
    </div>
  );
}
