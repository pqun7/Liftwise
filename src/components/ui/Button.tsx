import type { ComponentProps } from 'react';
import { buttonClasses, type ButtonVariant, type ButtonSize } from './controlStyles';
export function Button({
  variant = 'secondary',
  size = 'default',
  className = '',
  type = 'button',
  ...props
}: ComponentProps<'button'> & { variant?: ButtonVariant; size?: ButtonSize }) {
  return <button type={type} className={buttonClasses(variant, className, size)} {...props} />;
}
