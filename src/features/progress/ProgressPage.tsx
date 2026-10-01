import { PageIntro } from '../../components/PageIntro';
import { PlaceholderCard } from '../../components/PlaceholderCard';

export function ProgressPage() {
  return (
    <section className="page-stack" aria-labelledby="progress-title">
      <PageIntro
        titleId="progress-title"
        eyebrow="Progress"
        title="See the work add up"
        description="Useful trends will be calculated from records stored only on this device."
      />
      <div id="progress-title">
        <PlaceholderCard
          title="Progress views are planned"
          body="Charts will arrive once reliable workout data exists."
        />
      </div>
    </section>
  );
}
