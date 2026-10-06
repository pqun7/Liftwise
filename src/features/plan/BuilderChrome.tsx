import { Dumbbell, ChartNoAxesColumnIncreasing, Target, UserRound, Crown } from 'lucide-react';
import { iconButtonClasses } from '../../components/ui/controlStyles';
import { Check, ArrowLeft, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { ReactNode } from 'react';
const labels = ['Basics', 'Program', 'Schedule', 'Exercises', 'Review'];
export function BuilderHeader({
  title,
  back,
  step,
  programId,
  exercisesPath,
  backLabel = 'Back',
}: {
  title: string;
  back: string;
  step?: number;
  programId?: string;
  exercisesPath?: string;
  backLabel?: string;
}) {
  const paths = programId
    ? [
        `/plan/${programId}/edit`,
        `/plan/${programId}/build/days?stage=program`,
        `/plan/${programId}/build/days?stage=schedule`,
        exercisesPath ?? `/plan/${programId}/build/days?stage=schedule`,
        `/plan/${programId}/build/review`,
      ]
    : [];
  return (
    <>
      <header className="builder-header">
        <Link to={back} aria-label={backLabel} className={iconButtonClasses()}>
          <ArrowLeft size={20} aria-hidden="true" />
        </Link>
        <h1>
          {step !== undefined ? (title === 'Edit Program' ? title : 'Create Program') : title}
        </h1>
        <span />
      </header>
      {step !== undefined ? (
        <nav aria-label="Program builder steps">
          <ol className="builder-stepper">
            {labels.map((label, index) => (
              <li
                key={label}
                className={index < step ? 'is-complete' : index === step ? 'is-current' : ''}
              >
                {index < step && paths[index] ? (
                  <Link to={paths[index]}>
                    <span className="step-node">
                      <Check size={14} aria-hidden="true" />
                    </span>
                    <span>{label}</span>
                  </Link>
                ) : (
                  <span aria-current={index === step ? 'step' : undefined}>
                    <span className="step-node">
                      {index === step ? <span className="step-dot" /> : null}
                    </span>
                    <span>{label}</span>
                  </span>
                )}
              </li>
            ))}
          </ol>
        </nav>
      ) : null}
    </>
  );
}
export function BuilderFooter({ children }: { children: ReactNode }) {
  return <div className="builder-footer">{children}</div>;
}
export function NextLabel({ children }: { children: ReactNode }) {
  return (
    <>
      {children}
      <ArrowRight size={19} aria-hidden="true" />
    </>
  );
}
export function SegmentedSelector<T extends string>({
  legend,
  options,
  value,
  onChange,
}: {
  legend: string;
  options: readonly T[];
  value: T;
  onChange: (value: T) => void;
}) {
  const icons = {
    strength: Dumbbell,
    hypertrophy: ChartNoAxesColumnIncreasing,
    general: Target,
    beginner: UserRound,
    intermediate: ChartNoAxesColumnIncreasing,
    advanced: Crown,
  };
  return (
    <fieldset className="builder-segment">
      <legend>{legend}</legend>
      <div>
        {options.map((option) => {
          const Icon = icons[option as keyof typeof icons] ?? Target;
          return (
            <label key={option} className={value === option ? 'is-selected' : ''}>
              <input
                type="radio"
                name={legend}
                value={option}
                checked={value === option}
                onChange={() => onChange(option)}
              />
              <Icon size={26} />
              <span>{option}</span>
              {value === option && <Check className="choice-check" size={16} />}
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
