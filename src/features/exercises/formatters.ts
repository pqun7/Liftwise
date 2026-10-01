export function formatExerciseValue(value: string | null): string {
  if (!value) return 'Not specified';
  return value
    .split('_')
    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
    .join(' ');
}
