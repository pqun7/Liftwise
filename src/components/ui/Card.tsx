import type { HTMLAttributes } from 'react';

const variants = {
  default: '',
  active: 'ui-card-active',
  subtle: 'ui-card-subtle',
  glass: 'ui-card-highlight',
  elevated: 'ui-card-hero',
  interactive: 'ui-card-interactive',
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
      className={`ui-card ${radius === 'hero' ? 'ui-card-hero' : ''} ${padding === 'none' ? 'p-0' : padding === 'spacious' ? 'p-5' : 'p-4'} ${variants[variant]} ${className}`}
      {...props}
    />
  );
}
