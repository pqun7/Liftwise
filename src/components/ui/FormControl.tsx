import type { ComponentProps } from 'react';

const control =
  'w-full min-w-0 min-h-11 rounded-xl border border-border bg-surface-2 px-3 py-2 text-[max(16px,1rem)] leading-normal text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mint disabled:opacity-40 aria-invalid:border-red-300';
export function Input({ className = '', ...props }: ComponentProps<'input'>) {
  return <input className={`${control} ${className}`} {...props} />;
}
export function NumericInput({ inputMode = 'decimal', ...props }: ComponentProps<'input'>) {
  return <Input inputMode={inputMode} {...props} />;
}
export function Textarea({ className = '', ...props }: ComponentProps<'textarea'>) {
  return <textarea className={`${control} min-h-24 resize-y ${className}`} {...props} />;
}
export function Select({ className = '', ...props }: ComponentProps<'select'>) {
  return <select className={`${control} ${className}`} {...props} />;
}
