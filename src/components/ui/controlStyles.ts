export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost';
export type ButtonSize = 'default' | 'large' | 'icon';
const variants: Record<ButtonVariant, string> = {
  primary: 'border-mint bg-mint bg-[image:var(--accent-gradient)] text-app hover:brightness-95',
  secondary: 'border-border bg-surface-2 text-primary hover:bg-surface-3',
  outline: 'border-mint/60 bg-transparent text-mint hover:bg-mint/10',
  ghost: 'border-transparent bg-transparent text-secondary hover:bg-surface-2',
};
const sizes: Record<ButtonSize, string> = {
  default: 'min-h-11 rounded-2xl px-4 py-2 type-button',
  large: 'min-h-[58px] rounded-2xl px-4 py-3 type-button',
  icon: 'size-11 shrink-0 rounded-full p-0',
};
// Links share appearance only; routing stays with the feature that renders them.
export function buttonClasses(
  variant: ButtonVariant = 'secondary',
  className = '',
  size: ButtonSize = 'default',
) {
  return `inline-flex items-center justify-center gap-2 border touch-manipulation focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mint disabled:cursor-not-allowed disabled:opacity-40 motion-safe:transition-colors ${sizes[size]} ${variants[variant]} ${className}`;
}
export function iconButtonClasses(variant: ButtonVariant = 'secondary') {
  return buttonClasses(variant, '', 'icon');
}
