import { PageIntro } from '../../components/PageIntro';
import { PlaceholderCard } from '../../components/PlaceholderCard';

export function WorkoutPage() {
  return (
    <section className="page-stack" aria-labelledby="workout-title">
      <PageIntro
        titleId="workout-title"
        eyebrow="Workout"
        title="Train without distraction"
        description="Fast, resilient set logging will live here in a future release."
      />
      <div id="workout-title">
        <PlaceholderCard
          title="Workout logging is next"
          body="No workout-domain behavior is included in v0.1.0."
        />
      </div>
    </section>
  );
}
