import { Link } from 'react-router-dom';

import { APP_VERSION } from '../../app/version';
import { PageIntro } from '../../components/PageIntro';
import { OfflineExerciseData } from './OfflineExerciseData';

export function SettingsPage() {
  return (
    <section className="page-stack" aria-labelledby="settings-title">
      <PageIntro
        titleId="settings-title"
        eyebrow="Settings"
        title="Make Liftwise yours"
        description="Manage device storage, backups, recovery, offline media, and app credits."
      />
      <section className="settings-card" aria-labelledby="data-safety-card-title">
        <p className="section-kicker">Data safety</p>
        <h2 id="data-safety-card-title">Backup and recovery</h2>
        <p>Inspect local storage, create a verified backup, or safely restore user-owned data.</p>
        <Link className="compact-link" to="/settings/data-safety">
          Open Data Safety
        </Link>
      </section>
      <div>
        <OfflineExerciseData />
      </div>
      <section className="settings-card" aria-labelledby="credits-title">
        <p className="section-kicker">About / Credits</p>
        <h2 id="credits-title">Liftwise v{APP_VERSION}</h2>
        <p>
          <a href="https://repdb.co" rel="external">
            Exercise data by RepDB (repdb.co)
          </a>
        </p>
        <p className="storage-note">No account, analytics, or workout-data sharing.</p>
      </section>
    </section>
  );
}
