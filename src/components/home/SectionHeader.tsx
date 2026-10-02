import { SectionHeader as SharedSectionHeader } from '../ui/SectionHeader';
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
    <SharedSectionHeader
      title={title}
      trailing={
        to ? (
          <Link className="inline-flex min-h-11 items-center text-sm text-mint" to={to}>
            {detail}
            <span className="sr-only"> — {title}</span>
          </Link>
        ) : undefined
      }
    />
  );
}
