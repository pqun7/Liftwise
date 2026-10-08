export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
export type ButtonSize = 'default' | 'large' | 'icon';
const variants: Record<ButtonVariant, string> = {
  primary: 'ui-button-primary',
  secondary: 'ui-button-secondary',
  outline: 'ui-button-outline',
  ghost: 'ui-button-ghost',
  danger: 'ui-button-danger',
};
const sizes: Record<ButtonSize, string> = {
  default: '',
  large: 'ui-button-large',
  icon: 'ui-button-icon',
};
// Links share appearance only; routing stays with the feature that renders them.
export function buttonClasses(
  variant: ButtonVariant = 'secondary',
  className = '',
  size: ButtonSize = 'default',
) {
  return `ui-button ${sizes[size]} ${variants[variant]} ${className}`;
}
export function iconButtonClasses(variant: ButtonVariant = 'secondary') {
  return buttonClasses(variant, '', 'icon');
}
