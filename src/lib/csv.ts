export type CsvValue = string | number | null | undefined;

const FORMULA_START = /^[=+\-@\t\r]/;

export function csvCell(value: CsvValue): string {
  if (value === null || value === undefined) {
    return "";
  }
  if (typeof value === "number") {
    return Number.isFinite(value) ? String(value) : "";
  }
  const safe = FORMULA_START.test(value) ? `'${value}` : value;
  return /[",\r\n]/.test(safe) || safe !== value ? `"${safe.replace(/"/g, '""')}"` : safe;
}

export function toCsv(headers: readonly string[], rows: ReadonlyArray<readonly CsvValue[]>): string {
  return [headers, ...rows].map((row) => row.map(csvCell).join(",")).join("\r\n") + "\r\n";
}

export function koboToNaira(kobo: number | null | undefined): number | null {
  return kobo === null || kobo === undefined ? null : kobo / 100;
}
