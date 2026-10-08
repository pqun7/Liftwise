import type { ComponentProps } from 'react';

const control = 'ui-control';
export function Input({ className = '', ...props }: ComponentProps<'input'>) {
  return <input className={`${control} ${className}`} {...props} />;
}
export function NumericInput({ inputMode = 'decimal', ...props }: ComponentProps<'input'>) {
  return (
    <Input inputMode={inputMode} {...props} className={`tabular-nums ${props.className ?? ''}`} />
  );
}
export function Textarea({ className = '', ...props }: ComponentProps<'textarea'>) {
  return <textarea className={`${control} min-h-24 resize-y ${className}`} {...props} />;
}
export function Select({ className = '', ...props }: ComponentProps<'select'>) {
  return <select className={`${control} ${className}`} {...props} />;
}
