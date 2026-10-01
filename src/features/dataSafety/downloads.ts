export function downloadTextFile(contents: string, filename: string, type: string): void {
  const url = URL.createObjectURL(new Blob([contents], { type }));
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.hidden = true;
  document.body.append(link);
  link.click();
  link.remove();
  globalThis.setTimeout(() => URL.revokeObjectURL(url), 1_000);
}

export function backupFilename(createdAt: string): string {
  return `liftwise-backup-${createdAt.slice(0, 10)}.json`;
}
