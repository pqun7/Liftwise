import { ArrowLeft } from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';

export function ContextBackLink({ fallback, label }: { fallback: string; label: string }) {
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
      <Link className="back-link" to={fallback}>
        <ArrowLeft size={18} aria-hidden="true" /> {label}
      </Link>
    );
  return (
    <button type="button" className="back-link" onClick={() => void navigate(-1)}>
      <ArrowLeft size={18} aria-hidden="true" />{' '}
      {typeof origin.returnLabel === 'string' ? origin.returnLabel : 'Back'}
    </button>
  );
}
