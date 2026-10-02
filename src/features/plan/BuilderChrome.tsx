import { Check, ArrowLeft, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { ReactNode } from 'react';

const labels = ['Basic Info', 'Days', 'Exercises', 'Review'];
export function BuilderHeader({
  title,
  back,
  step,
  programId,
  exercisesPath,
}: {
  title: string;
  back: string;
  step?: number;
  programId?: string;
  exercisesPath?: string;
}) {
  const paths = programId
    ? [
        `/plan/${programId}/edit`,
        `/plan/${programId}/build/days`,
        exercisesPath ?? `/plan/${programId}`,
        `/plan/${programId}/build/review`,
      ]
    : [];
  return (
    <>
      <header className="builder-header">
        <Link to={back} aria-label="Back" className="builder-back">
          <ArrowLeft size={20} aria-hidden="true" />
        </Link>
        <h1>{title}</h1>
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
  return (
    <fieldset className="builder-segment">
      <legend>{legend}</legend>
      <div>
        {options.map((option) => (
          <label key={option} className={value === option ? 'is-selected' : ''}>
            <input
              type="radio"
              name={legend}
              value={option}
              checked={value === option}
              onChange={() => onChange(option)}
            />
            <span>{option}</span>
            {value === option ? <Check size={12} aria-hidden="true" /> : null}
          </label>
        ))}
      </div>
    </fieldset>
  );
}
