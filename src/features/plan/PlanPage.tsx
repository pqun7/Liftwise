import { PageIntro } from '../../components/PageIntro';
import { PlaceholderCard } from '../../components/PlaceholderCard';

export function PlanPage() {
  return (
    <section className="page-stack" aria-labelledby="plan-title">
      <PageIntro
        eyebrow="Plan"
        title="Shape your training"
        description="Build repeatable routines that are easy to follow when it is time to train."
      />
      <div id="plan-title">
        <PlaceholderCard
          title="Workout plans are coming"
          body="This release establishes the safe foundation they will use."
        />
      </div>
    </section>
  );
}
