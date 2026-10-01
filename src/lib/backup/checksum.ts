function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value !== null && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value)
        .filter(([, entry]) => entry !== undefined)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, entry]) => [key, canonicalize(entry)]),
    );
  }
  return value;
}

export function canonicalStringify(value: unknown): string {
  return JSON.stringify(canonicalize(value));
}

export async function sha256(value: unknown): Promise<string> {
  if (!globalThis.crypto?.subtle) {
    throw new Error('Secure checksum support is unavailable in this browser.');
  }
  const bytes = new TextEncoder().encode(canonicalStringify(value));
  const digest = await globalThis.crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

export function withoutChecksum<T extends { checksum: string }>(envelope: T): Omit<T, 'checksum'> {
  const payload: Partial<T> = { ...envelope };
  delete payload.checksum;
  return payload as Omit<T, 'checksum'>;
}
