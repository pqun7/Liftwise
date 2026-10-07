export function reviewDestination(base: string, params: URLSearchParams) {
  return `${base}/build/review${params.has('activate') ? `?activate=${params.get('activate') === 'true'}` : ''}`;
}
export function reviewSuffix(params: URLSearchParams) {
  return params.get('return') === 'review'
    ? `?return=review&activate=${params.get('activate') === 'true'}`
    : '';
}
