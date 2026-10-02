import { Link, useRevalidator } from 'react-router-dom';
import { MobilePage } from '../../components/layout/MobilePage';
import { Button } from '../../components/ui/Button';
import { ProgressHeader, progressLayout } from './ProgressUI';
export function ProgressRouteError() {
  const revalidator = useRevalidator();
  return (
    <MobilePage className={progressLayout}>
      <ProgressHeader
        title="Progress unavailable"
        description="Your saved data is unchanged. Try loading this screen again."
      />
      <Button
        disabled={revalidator.state === 'loading'}
        onClick={() => void revalidator.revalidate()}
      >
        Try again
      </Button>
      <Link to="/progress">Return to Progress</Link>
    </MobilePage>
  );
}
