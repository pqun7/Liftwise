import { PageIntro } from '../../components/PageIntro';
import { OfflineExerciseData } from './OfflineExerciseData';

export function SettingsPage() {
  return (
    <section className="page-stack" aria-labelledby="settings-title">
      <PageIntro
        titleId="settings-title"
        eyebrow="Settings"
        title="Make Liftwise yours"
        description="Device preferences, data export, and recovery controls will live here."
      />
      <div>
        <OfflineExerciseData />
      </div>
      <section className="settings-card" aria-labelledby="credits-title">
        <p className="section-kicker">About / Credits</p>
        <h2 id="credits-title">Liftwise v0.3.0</h2>
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
