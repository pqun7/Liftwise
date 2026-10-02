import type { ComponentProps } from 'react';
import { Button } from './Button';
import type { ButtonVariant } from './controlStyles';
export function IconButton(
  props: ComponentProps<'button'> & { 'aria-label': string; variant?: ButtonVariant },
) {
  return <Button {...props} size="icon" />;
}
