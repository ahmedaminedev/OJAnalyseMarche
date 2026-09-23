import { ColumnInfo } from '../types/import';

/**
 * Exports data rows to CSV file and triggers browser download
 */
export function exportToCsv(
  fileName: string,
  columns: ColumnInfo[],
  rows: Record<string, unknown>[]
): void {
  if (!rows || rows.length === 0) return;

  const headerRow = columns.map((col) => `"${(col.name || col.key).replace(/"/g, '""')}"`).join(';');
  const dataRows = rows.map((row) => {
    return columns
      .map((col) => {
        const val = row[col.key];
        if (val === null || val === undefined) return '""';
        const str = String(val).replace(/"/g, '""');
        return `"${str}"`;
      })
      .join(';');
  });

  const csvContent = '\uFEFF' + [headerRow, ...dataRows].join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `${fileName.replace(/\.[^/.]+$/, '')}_export.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Exports data rows to JSON file and triggers browser download
 */
export function exportToJson(
  fileName: string,
  rows: Record<string, unknown>[]
): void {
  if (!rows || rows.length === 0) return;

  // Filter out internal metadata keys starting with __
  const cleanedRows = rows.map((row) => {
    const cleaned: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(row)) {
      if (!k.startsWith('__')) {
        cleaned[k] = v;
      }
    }
    return cleaned;
  });

  const jsonContent = JSON.stringify(cleanedRows, null, 2);
  const blob = new Blob([jsonContent], { type: 'application/json;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `${fileName.replace(/\.[^/.]+$/, '')}_export.json`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
