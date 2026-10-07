import type { HTMLAttributes } from 'react';

const variants = {
  default: 'border-border bg-surface',
  active: 'border-mint/60 bg-mint/5',
  subtle: 'border-border/60 bg-surface/60',
  glass: 'border-border bg-[image:var(--panel-gradient)]',
};
export function Card({
  as: Tag = 'section',
  variant = 'default',
  padding = 'default',
  radius = 'default',
  className = '',
  ...props
}: HTMLAttributes<HTMLElement> & {
  as?: 'section' | 'article' | 'div';
  variant?: keyof typeof variants;
  padding?: 'default' | 'none' | 'spacious';
  radius?: 'default' | 'hero';
}) {
  return (
    <Tag
      className={`min-w-0 border text-primary ${radius === 'hero' ? 'rounded-3xl' : 'rounded-[18px]'} ${padding === 'none' ? 'p-0' : padding === 'spacious' ? 'p-5' : 'p-4'} ${variants[variant]} ${className}`}
      {...props}
    />
  );
}
