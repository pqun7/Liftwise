import type { ReactNode } from 'react';
import { Card } from '../../components/ui/Card';
import workoutBench from '../../assets/images/workout-bench.webp';
import restDay from '../../assets/images/rest-day.webp';

export function WorkoutLandingHero({
  eyebrow,
  title,
  description,
  resting = false,
  children,
}: {
  eyebrow: string;
  title: string;
  description: string;
  resting?: boolean;
  children: ReactNode;
}) {
  return (
    <Card
      id="workout-hero"
      radius="hero"
      padding="none"
      className="relative isolate overflow-hidden"
    >
      <img
        src={resting ? restDay : workoutBench}
        alt=""
        className="absolute inset-0 -z-20 h-full w-full object-cover object-right"
      />
      <div className="absolute inset-0 -z-10 bg-gradient-to-r from-app via-app/85 to-app/30" />
      <div className="grid min-h-64 content-between gap-8 p-5">
        <div>
          <p className="mb-3 text-xs font-bold uppercase tracking-[0.16em] text-mint">{eyebrow}</p>
          <h2 className="text-[30px] font-bold leading-tight">{title}</h2>
          <p className="mt-3 max-w-64 text-sm leading-relaxed text-secondary">{description}</p>
        </div>
        <div className="grid gap-3">{children}</div>
      </div>
    </Card>
  );
}
