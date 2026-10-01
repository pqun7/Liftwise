export type CsvCell = string | number | boolean | null;

function escapeCell(value: CsvCell): string {
  if (value === null) return '';
  const text = String(value);
  return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

export function createCsv<T>(
  columns: readonly { header: string; value: (record: T) => CsvCell }[],
  records: readonly T[],
): string {
  const rows = [
    columns.map(({ header }) => escapeCell(header)).join(','),
    ...records.map((record) => columns.map(({ value }) => escapeCell(value(record))).join(',')),
  ];
  return `\uFEFF${rows.join('\r\n')}\r\n`;
}
