import { PageIntro } from '../../components/PageIntro';
import { PlaceholderCard } from '../../components/PlaceholderCard';

export function SettingsPage() {
  return (
    <section className="page-stack" aria-labelledby="settings-title">
      <PageIntro
        eyebrow="Settings"
        title="Make Liftwise yours"
        description="Device preferences, data export, and recovery controls will live here."
      />
      <div id="settings-title">
        <PlaceholderCard
          title="Settings are coming"
          body="The app currently needs no account or configuration."
        />
      </div>
      <p className="version-label">Liftwise v0.2.0</p>
    </section>
  );
}
