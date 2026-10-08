import { Check } from 'lucide-react';

export function SegmentedControl<T extends string>({
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
    <fieldset className="min-w-0 border-0 p-0">
      <legend className="mb-2 text-sm text-secondary">{legend}</legend>
      <div className="flex flex-wrap gap-1">
        {options.map((option) => (
          <label
            key={option}
            className={`relative flex min-h-11 flex-1 cursor-pointer items-center justify-center gap-1 rounded-2xl border px-2 text-xs capitalize transition-colors duration-200 has-focus-visible:outline-2 has-focus-visible:outline-offset-4 has-focus-visible:outline-mint ${value === option ? 'border-mint/30 bg-mint/[0.07] text-mint' : 'border-border bg-surface text-secondary hover:bg-surface-highlight'}`}
          >
            <input
              className="absolute inset-0 z-10 h-full w-full cursor-pointer opacity-0"
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
