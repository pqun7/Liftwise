import { ArrowLeft } from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';

export function ContextBackLink({
  fallback,
  label,
  iconOnly = false,
}: {
  fallback: string;
  label: string;
  iconOnly?: boolean;
}) {
  const location = useLocation();
  const navigate = useNavigate();
  const origin = location.state as {
    returnTo?: unknown;
    returnKey?: unknown;
    returnLabel?: unknown;
  } | null;
  const contextual =
    typeof origin?.returnTo === 'string' &&
    origin.returnTo.startsWith('/') &&
    !origin.returnTo.startsWith('//') &&
    typeof origin.returnKey === 'string';
  if (!contextual)
    return (
      <Link className="back-link" aria-label={iconOnly ? label : undefined} to={fallback}>
        <ArrowLeft size={20} aria-hidden="true" /> {iconOnly ? null : label}
      </Link>
    );
  return (
    <button
      type="button"
      className="back-link"
      aria-label={iconOnly ? label : undefined}
      onClick={() => void navigate(-1)}
    >
      <ArrowLeft size={20} aria-hidden="true" />{' '}
      {iconOnly ? null : typeof origin.returnLabel === 'string' ? origin.returnLabel : 'Back'}
    </button>
  );
}
