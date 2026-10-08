import { ContextToolbar } from '../../components/layout/ContextToolbar';
import { SegmentedControl } from '../../components/ui/SegmentedControl';
import { iconButtonClasses } from '../../components/ui/controlStyles';
import { Check, ArrowLeft, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { ReactNode } from 'react';

const labels = ['Basics', 'Template', 'Schedule', 'Exercises', 'Review'];
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
        `/plan/${programId}/build/template`,
        `/plan/${programId}/build/days`,
        exercisesPath ?? `/plan/${programId}/build/exercises`,
        `/plan/${programId}/build/review`,
      ]
    : [];
  return (
    <>
      <ContextToolbar
        title={title}
        back={
          <Link to={back} aria-label={backLabel} className={iconButtonClasses()}>
            <ArrowLeft size={20} aria-hidden="true" />
          </Link>
        }
      />
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
export const SegmentedSelector = SegmentedControl;
