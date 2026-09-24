import * as XLSX from 'xlsx';
import { parseCsvText, detectCsvDelimiter } from '../utils/csvDetector';
import { isPeriodHeader, parsePeriodToIsoDate, executeUnpivot } from '../utils/unpivotHelper';
import { toTitleCase, detectColumnVariants } from '../utils/cleaningHelper';
import {
  StructureConfig,
  ColumnSetting,
  UnpivotConfig,
  CleaningConfig,
  ColumnStatSummary,
  QualitySummary,
  ChecksumItem,
  VariantMergeRule,
} from '../types/wizard';
import { ValidationIssue } from '../types/import';

function fixWorksheetRange(worksheet: XLSX.WorkSheet): void {
  if (!worksheet) return;
  let minR = 0, minC = 0, maxR = 0, maxC = 0, hasCells = false;
  if (worksheet['!ref']) {
    try {
      const decoded = XLSX.utils.decode_range(worksheet['!ref']);
      minR = decoded.s.r; minC = decoded.s.c; maxR = decoded.e.r; maxC = decoded.e.c;
      hasCells = true;
    } catch {
      // ignore
    }
  }
  for (const cellKey of Object.keys(worksheet)) {
    if (cellKey.startsWith('!')) continue;
    try {
      const decoded = XLSX.utils.decode_cell(cellKey);
      if (!hasCells) {
        minR = decoded.r; minC = decoded.c; maxR = decoded.r; maxC = decoded.c;
        hasCells = true;
      } else {
        if (decoded.r < minR) minR = decoded.r;
        if (decoded.c < minC) minC = decoded.c;
        if (decoded.r > maxR) maxR = decoded.r;
        if (decoded.c > maxC) maxC = decoded.c;
      }
    } catch {
      // ignore
    }
  }
  if (hasCells) {
    worksheet['!ref'] = XLSX.utils.encode_range({ s: { r: minR, c: minC }, e: { r: maxR, c: maxC } });
  }
}

/**
 * Coerces cell value according to target column type and options
 */
function coerceCellValue(
  rawVal: any,
  col: ColumnSetting,
  dateFormatChoice?: 'DD/MM/YYYY' | 'MM/DD/YYYY' | 'auto'
): { value: any; isError: boolean } {
  if (rawVal === null || rawVal === undefined) {
    return { value: null, isError: false };
  }

  // Check Excel error codes
  if (typeof rawVal === 'string') {
    const trimmed = rawVal.trim();
    if (trimmed.startsWith('#') && (trimmed.endsWith('!') || trimmed.endsWith('?') || trimmed === '#N/A')) {
      return { value: null, isError: true };
    }
  }

  // Coerce based on type
  switch (col.type) {
    case 'number': {
      if (typeof rawVal === 'number') {
        return { value: isNaN(rawVal) || !isFinite(rawVal) ? null : rawVal, isError: isNaN(rawVal) };
      }
      const str = String(rawVal).trim();
      if (str === '') return { value: null, isError: false };

      // Handle currency, percentage, spaces
      let cleanNum = str
        .replace(/[\s\u00A0\u202F]/g, '') // remove spaces / non-breaking spaces
        .replace(/[€$£¥%]/g, '');         // remove currency / percent symbols

      // Replace comma with dot if French decimal
      if (cleanNum.includes(',') && !cleanNum.includes('.')) {
        cleanNum = cleanNum.replace(',', '.');
      } else if (cleanNum.includes(',') && cleanNum.includes('.')) {
        // e.g. 1,234.50 or 1.234,50
        if (cleanNum.indexOf('.') < cleanNum.indexOf(',')) {
          // 1.234,50 -> 1234.50
          cleanNum = cleanNum.replace(/\./g, '').replace(',', '.');
        } else {
          // 1,234.50 -> 1234.50
          cleanNum = cleanNum.replace(/,/g, '');
        }
      }

      const num = Number(cleanNum);
      if (isNaN(num) || !isFinite(num)) {
        return { value: null, isError: true };
      }
      return { value: num, isError: false };
    }

    case 'date': {
      if (rawVal instanceof Date) {
        return { value: isNaN(rawVal.getTime()) ? null : rawVal.toISOString().slice(0, 10), isError: isNaN(rawVal.getTime()) };
      }
      // Excel serial number (e.g. 45535)
      if (typeof rawVal === 'number' && rawVal > 1000 && rawVal < 100000) {
        try {
          const parsed = XLSX.SSF.parse_date_code(rawVal);
          if (parsed && parsed.y && parsed.m && parsed.d) {
            const m = String(parsed.m).padStart(2, '0');
            const d = String(parsed.d).padStart(2, '0');
            return { value: `${parsed.y}-${m}-${d}`, isError: false };
          }
        } catch {
          // fallback
        }
      }

      const str = String(rawVal).trim();
      if (str === '') return { value: null, isError: false };

      // French date DD/MM/YYYY or DD-MM-YYYY
      const slashMatch = str.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})/);
      if (slashMatch) {
        const p1 = slashMatch[1].padStart(2, '0');
        const p2 = slashMatch[2].padStart(2, '0');
        const y = slashMatch[3];

        if (dateFormatChoice === 'MM/DD/YYYY') {
          return { value: `${y}-${p1}-${p2}`, isError: false };
        } else {
          // Default DD/MM/YYYY
          return { value: `${y}-${p2}-${p1}`, isError: false };
        }
      }

      // Check ISO YYYY-MM-DD
      const isoMatch = str.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
      if (isoMatch) {
        const y = isoMatch[1];
        const m = isoMatch[2].padStart(2, '0');
        const d = isoMatch[3].padStart(2, '0');
        return { value: `${y}-${m}-${d}`, isError: false };
      }

      const parsedTs = Date.parse(str);
      if (!isNaN(parsedTs)) {
        return { value: new Date(parsedTs).toISOString().slice(0, 10), isError: false };
      }
      return { value: str, isError: true };
    }

    case 'boolean': {
      if (typeof rawVal === 'boolean') return { value: rawVal, isError: false };
      const str = String(rawVal).trim().toLowerCase();
      if (['true', '1', 'vrai', 'oui', 'yes'].includes(str)) return { value: true, isError: false };
      if (['false', '0', 'faux', 'non', 'no'].includes(str)) return { value: false, isError: false };
      return { value: null, isError: true };
    }

    case 'string':
    default: {
      const str = String(rawVal);
      return { value: str, isError: false };
    }
  }
}

/**
 * Main worker logic executed on message
 */
export function processWorkerAction(action: string, payload: any) {
  if (action === 'PARSE_FILE') {
    const { buffer, fileName, fileType, csvDelimiter, csvEncoding } = payload;
    let sheets: Record<string, unknown[][]> = {};
    let sheetNames: string[] = [];
    let detectedDelim = ';';

    if (fileType === 'csv' || fileName.toLowerCase().endsWith('.csv')) {
      const decoder = new TextDecoder(csvEncoding || 'utf-8');
      const text = decoder.decode(buffer);
      detectedDelim = csvDelimiter || detectCsvDelimiter(text);
      const rows = parseCsvText(text, detectedDelim);
      sheets['CSV_DATA'] = rows;
      sheetNames = ['CSV_DATA'];
    } else {
      const workbook = XLSX.read(buffer, {
        type: 'array',
        cellDates: true,
        cellNF: false,
        cellText: false,
      });
      sheetNames = workbook.SheetNames;
      for (const name of sheetNames) {
        const ws = workbook.Sheets[name];
        fixWorksheetRange(ws);
        const rows: unknown[][] = XLSX.utils.sheet_to_json(ws, {
          header: 1,
          defval: null,
          blankrows: true,
        });
        sheets[name] = rows;
      }
    }

    return { sheets, sheetNames, detectedDelim };
  }

  if (action === 'PROCESS_TRANSFORMATION') {
    const {
      rawMatrix,
      structure,
      columns,
      unpivot,
      cleaning,
    }: {
      rawMatrix: unknown[][];
      structure: StructureConfig;
      columns: ColumnSetting[];
      unpivot: UnpivotConfig;
      cleaning: CleaningConfig;
    } = payload;

    const issues: ValidationIssue[] = [];
    const headerRowIdx = structure.headerRowIndex;
    const firstDataIdx = Math.max(headerRowIdx + 1, structure.firstDataRowIndex);
    const lastDataIdx = structure.lastDataRowIndex !== null && structure.lastDataRowIndex !== undefined
      ? Math.min(structure.lastDataRowIndex, rawMatrix.length - 1)
      : rawMatrix.length - 1;

    // 1. Filter and extract data rows
    const sliceRows = rawMatrix.slice(firstDataIdx, lastDataIdx + 1);
    let extractedRows: any[][] = [];

    // Fill-down tracking per column
    const lastNonEmptyValues: any[] = new Array(columns.length).fill(null);

    for (let r = 0; r < sliceRows.length; r++) {
      const row = sliceRows[r] || [];

      // Check empty row
      const isAllEmpty = row.every((c) => c === null || c === undefined || String(c).trim() === '');
      if (structure.ignoreEmptyRows && isAllEmpty) {
        continue;
      }

      // Check total row
      if (structure.ignoreTotalRows) {
        const hasTotalWord = row.some((c) => {
          if (typeof c !== 'string') return false;
          const s = c.toLowerCase().trim();
          return s === 'total' || s === 'somme' || s === 'total général' || s.startsWith('total ') || s === 'sous-total';
        });
        if (hasTotalWord) {
          continue;
        }
      }

      // Fill down merged cells if option enabled
      const processedRow: any[] = [];
      for (let c = 0; c < columns.length; c++) {
        let val = row[c];
        if (structure.fillDownMergedCells) {
          if (val !== null && val !== undefined && String(val).trim() !== '') {
            lastNonEmptyValues[c] = val;
          } else {
            val = lastNonEmptyValues[c];
          }
        }
        processedRow.push(val);
      }

      extractedRows.push(processedRow);
    }

    // 2. Coerce types, clean and build initial records
    const initialRecords: Record<string, any>[] = [];
    const colExcelErrors: Record<string, number> = {};
    const colVariantSamples: Record<string, string[]> = {};

    for (const c of columns) {
      colExcelErrors[c.key] = 0;
      if (c.type === 'string') {
        colVariantSamples[c.key] = [];
      }
    }

    // Prepare variant merge lookup
    const mergeMap = new Map<string, string>();
    if (cleaning.variantMerges) {
      for (const rule of cleaning.variantMerges) {
        if (rule.enabled) {
          mergeMap.set(`${rule.columnKey}:::${rule.variantValue}`, rule.targetCanonicalValue);
        }
      }
    }

    for (let r = 0; r < extractedRows.length; r++) {
      const rowArr = extractedRows[r];
      const record: Record<string, any> = {};

      for (let c = 0; c < columns.length; c++) {
        const col = columns[c];
        const rawCell = rowArr[c];
        const { value: coercedVal, isError } = coerceCellValue(rawCell, col, col.dateFormatChoice);

        if (isError) {
          colExcelErrors[col.key]++;
        }

        let finalVal = coercedVal;

        // Cleaning: trim and text casing on strings
        if (typeof finalVal === 'string') {
          if (cleaning.autoTrim) {
            finalVal = finalVal.trim().replace(/\s+/g, ' ');
          }
          if (cleaning.textCase === 'upper') {
            finalVal = finalVal.toUpperCase();
          } else if (cleaning.textCase === 'lower') {
            finalVal = finalVal.toLowerCase();
          } else if (cleaning.textCase === 'title') {
            finalVal = toTitleCase(finalVal);
          }

          // Apply variant merger rule if matched
          const mergeKey = `${col.key}:::${finalVal}`;
          if (mergeMap.has(mergeKey)) {
            finalVal = mergeMap.get(mergeKey);
          }

          if (colVariantSamples[col.key] && colVariantSamples[col.key].length < 1000) {
            colVariantSamples[col.key].push(finalVal);
          }
        }

        record[col.key] = finalVal;
      }

      initialRecords.push(record);
    }

    // 3. Unpivot (Wide to Long) transformation if enabled
    let finalRecords: Record<string, any>[] = initialRecords;
    let finalColumns: ColumnSetting[] = [...columns];

    if (unpivot.enabled && unpivot.unpivotColumnKeys.length > 0) {
      const attrKey = 'unpivot_attr';
      const valKey = 'unpivot_val';

      finalRecords = executeUnpivot(
        initialRecords,
        unpivot.fixedColumnKeys,
        unpivot.unpivotColumnKeys,
        attrKey,
        unpivot.attributeColumnName || 'Période',
        valKey,
        unpivot.valueColumnName || 'Valeur',
        unpivot.attributeIsDate
      );

      // Rebuild column settings after unpivot
      const fixedCols = columns.filter((c) => unpivot.fixedColumnKeys.includes(c.key));
      const attrCol: ColumnSetting = {
        key: attrKey,
        originalHeader: unpivot.attributeColumnName || 'Période',
        label: unpivot.attributeColumnName || 'Période',
        type: unpivot.attributeIsDate ? 'date' : 'string',
        role: unpivot.attributeIsDate ? 'date' : 'dimension',
        isUnnamed: false,
        sampleValues: [],
        nullCount: 0,
        distinctCount: 0,
        excelErrorsCount: 0,
      };
      const valCol: ColumnSetting = {
        key: valKey,
        originalHeader: unpivot.valueColumnName || 'Valeur',
        label: unpivot.valueColumnName || 'Valeur',
        type: 'number',
        role: 'measure',
        isUnnamed: false,
        sampleValues: [],
        nullCount: 0,
        distinctCount: 0,
        excelErrorsCount: 0,
      };
      finalColumns = [...fixedCols, attrCol, valCol];
    }

    // 4. Calculate Column Statistics & Checksums
    const totalRowsCount = finalRecords.length;
    const columnStats: ColumnStatSummary[] = [];
    const checksums: ChecksumItem[] = [];

    for (const col of finalColumns) {
      let nullCount = 0;
      let sum = 0;
      let hasNumbers = false;
      let minVal: any = null;
      let maxVal: any = null;
      const distinctSet = new Set<any>();
      const samples: any[] = [];

      for (let r = 0; r < finalRecords.length; r++) {
        const val = finalRecords[r][col.key];
        if (val === null || val === undefined || val === '') {
          nullCount++;
        } else {
          distinctSet.add(val);
          if (samples.length < 5) samples.push(val);

          if (col.type === 'number' && typeof val === 'number' && isFinite(val)) {
            sum += val;
            hasNumbers = true;
            if (minVal === null || val < minVal) minVal = val;
            if (maxVal === null || val > maxVal) maxVal = val;
          } else if (col.type === 'date' && typeof val === 'string') {
            if (minVal === null || val < minVal) minVal = val;
            if (maxVal === null || val > maxVal) maxVal = val;
          }
        }
      }

      col.sampleValues = samples;
      col.nullCount = nullCount;
      col.distinctCount = distinctSet.size;

      const stat: ColumnStatSummary = {
        key: col.key,
        label: col.label,
        type: col.type,
        role: col.role,
        nullCount,
        nullPercentage: totalRowsCount > 0 ? Math.round((nullCount / totalRowsCount) * 1000) / 10 : 0,
        distinctCount: distinctSet.size,
        sampleValues: samples,
      };

      if (hasNumbers) {
        stat.sum = Math.round(sum * 100) / 100;
        stat.min = minVal;
        stat.max = maxVal;
        checksums.push({
          column: col.key,
          label: col.label,
          sum: stat.sum,
          min: minVal,
          max: maxVal,
        });
      } else if (col.type === 'date' && minVal !== null) {
        stat.min = minVal;
        stat.max = maxVal;
        checksums.push({
          column: col.key,
          label: col.label,
          min: minVal,
          max: maxVal,
        });
      }

      columnStats.push(stat);

      // Issues checks
      if (nullCount === totalRowsCount && totalRowsCount > 0) {
        issues.push({
          id: `empty-col-${col.key}`,
          type: 'mostly_empty_column',
          severity: 'warning',
          title: `Colonne 100% vide : "${col.label}"`,
          description: `Toutes les ${totalRowsCount} valeurs de la colonne "${col.label}" sont vides ou nulles.`,
          count: nullCount,
          columnKey: col.key,
          columnName: col.label,
        });
      } else if (stat.nullPercentage > 60 && totalRowsCount > 10) {
        issues.push({
          id: `mostly-empty-col-${col.key}`,
          type: 'mostly_empty_column',
          severity: 'info',
          title: `Colonne majoritairement vide (${stat.nullPercentage}%) : "${col.label}"`,
          description: `${nullCount} cellules sur ${totalRowsCount} sont vides dans la colonne "${col.label}".`,
          count: nullCount,
          columnKey: col.key,
          columnName: col.label,
        });
      }
    }

    // Check Excel errors issues
    for (const [colKey, errCount] of Object.entries(colExcelErrors)) {
      if (errCount > 0) {
        const colDef = columns.find((c) => c.key === colKey);
        issues.push({
          id: `excel-err-${colKey}`,
          type: 'inconsistent_type',
          severity: 'warning',
          title: `Erreurs Excel (#N/A, #DIV/0!) converties en NULL`,
          description: `${errCount} cellule(s) de la colonne "${colDef?.label || colKey}" contenaient des erreurs de calcul Excel et ont été converties en valeur NULL.`,
          count: errCount,
          columnKey: colKey,
        });
      }
    }

    // 5. Detect variants for Step 5
    const detectedVariants: VariantMergeRule[] = [];
    for (const [colKey, sampleList] of Object.entries(colVariantSamples)) {
      const colDef = columns.find((c) => c.key === colKey);
      if (colDef && (colDef.role === 'dimension' || colDef.type === 'string')) {
        const rules = detectColumnVariants(colKey, colDef.label, sampleList);
        detectedVariants.push(...rules);
      }
    }

    const qualityReport: QualitySummary = {
      errors: issues.filter((i) => i.severity === 'error').length,
      warnings: issues.filter((i) => i.severity === 'warning').length,
      infos: issues.filter((i) => i.severity === 'info').length,
      issues,
    };

    return {
      transformedRows: finalRecords,
      previewRows: finalRecords.slice(0, 50),
      totalRowCount: finalRecords.length,
      finalColumns,
      columnStats,
      checksums,
      qualityReport,
      detectedVariants,
    };
  }

  throw new Error(`Action inconnue: ${action}`);
}

// In standard Web Worker context:
if (typeof self !== 'undefined' && typeof (self as any).postMessage === 'function') {
  self.onmessage = async (e: MessageEvent) => {
    const { id, action, payload } = e.data;
    try {
      const result = processWorkerAction(action, payload);
      (self as any).postMessage({ id, success: true, result });
    } catch (err: any) {
      (self as any).postMessage({ id, success: false, error: err?.message || String(err) });
    }
  };
}
