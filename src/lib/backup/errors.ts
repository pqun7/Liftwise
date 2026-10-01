export type BackupErrorCode =
  | 'invalid-json'
  | 'invalid-schema'
  | 'checksum-failed'
  | 'unsupported-version'
  | 'incompatible-schema'
  | 'duplicate-id'
  | 'missing-reference'
  | 'import-failed';

export class BackupError extends Error {
  constructor(
    readonly code: BackupErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'BackupError';
  }
}
