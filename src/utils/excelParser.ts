import * as XLSX from 'xlsx';
import {
  ExcelParseResult,
  SheetAnalysis,
  ColumnInfo,
  ValidationIssue,
  DetectedDataType,
} from '../types/import';

/**
 * Checks if a string represents a number stored as text
 */
function isNumericString(val: string): boolean {
  if (!val || typeof val !== 'string') return false;
  const trimmed = val.trim();
  if (trimmed === '') return false;
  return !isNaN(Number(trimmed.replace(',', '.')));
}

/**
 * Checks if a value is a date
 */
function isValidDate(val: unknown): boolean {
  if (val instanceof Date) {
    return !isNaN(val.getTime());
  }
  if (typeof val === 'string') {
    const trimmed = val.trim();
    // French date format DD/MM/YYYY or DD-MM-YYYY
    const frenchDateRegex = /^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/;
    if (frenchDateRegex.test(trimmed)) {
      return true;
    }
    // ISO format or standard date
    const parsed = Date.parse(trimmed);
    return !isNaN(parsed) && trimmed.length >= 8 && /\d/.test(trimmed);
  }
  return false;
}

/**
 * Fixes worksheet bounding box (!ref) to ensure SheetJS reads all rows and columns,
 * even when the Excel file generator produced an incomplete or truncated range header.
 */
function fixWorksheetRange(worksheet: XLSX.WorkSheet): void {
  if (!worksheet) return;
  let minR = 0;
  let minC = 0;
  let maxR = 0;
  let maxC = 0;
  let hasCells = false;

  if (worksheet['!ref']) {
    try {
      const decoded = XLSX.utils.decode_range(worksheet['!ref']);
      minR = decoded.s.r;
      minC = decoded.s.c;
      maxR = decoded.e.r;
      maxC = decoded.e.c;
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
        minR = decoded.r;
        minC = decoded.c;
        maxR = decoded.r;
        maxC = decoded.c;
        hasCells = true;
      } else {
        if (decoded.r < minR) minR = decoded.r;
        if (decoded.c < minC) minC = decoded.c;
        if (decoded.r > maxR) maxR = decoded.r;
        if (decoded.c > maxC) maxC = decoded.c;
      }
    } catch {
      // ignore non-cell properties
    }
  }

  if (hasCells) {
    worksheet['!ref'] = XLSX.utils.encode_range({
      s: { r: minR, c: minC },
      e: { r: maxR, c: maxC },
    });
  }
}

/**
 * Robust, generic Excel parser that detects structure without any hardcoded column assumptions
 */
export async function parseExcelFile(
  file: File,
  onProgress?: (percent: number, status: string) => void
): Promise<ExcelParseResult> {
  onProgress?.(10, 'Lecture binaire du fichier...');

  const arrayBuffer = await file.arrayBuffer();

  onProgress?.(30, 'Analyse du classeur Excel...');

  // Parse using SheetJS with date recognition
  const workbook = XLSX.read(arrayBuffer, {
    type: 'array',
    cellDates: true,
    cellNF: false,
    cellText: false,
  });

  const sheetNames = workbook.SheetNames;
  if (!sheetNames || sheetNames.length === 0) {
    throw new Error('Le classeur Excel ne contient aucune feuille de calcul.');
  }

  const sheets: Record<string, SheetAnalysis> = {};
  const totalSheets = sheetNames.length;

  for (let sIdx = 0; sIdx < sheetNames.length; sIdx++) {
    const sheetName = sheetNames[sIdx];
    const progressPercent = Math.round(30 + ((sIdx + 1) / totalSheets) * 60);
    onProgress?.(progressPercent, `Traitement de la feuille : ${sheetName}`);

    const worksheet = workbook.Sheets[sheetName];
    // Ensure SheetJS does not truncate rows if !ref is incomplete
    fixWorksheetRange(worksheet);

    const rawData: unknown[][] = XLSX.utils.sheet_to_json(worksheet, {
      header: 1,
      defval: null,
      blankrows: true,
    });

    const analysis = analyzeSheet(sheetName, rawData);
    sheets[sheetName] = analysis;
  }

  onProgress?.(100, 'Analyse terminée avec succès');

  return {
    fileName: file.name,
    fileSize: file.size,
    sheetNames,
    sheets,
    parsedAt: new Date().toISOString(),
  };
}

/**
 * Analyzes a single sheet matrix without assuming column headers or types
 */
function analyzeSheet(sheetName: string, rawMatrix: unknown[][]): SheetAnalysis {
  const issues: ValidationIssue[] = [];

  if (!rawMatrix || rawMatrix.length === 0) {
    issues.push({
      id: `empty-sheet-${sheetName}`,
      type: 'empty_sheet',
      severity: 'error',
      title: 'Feuille vide',
      description: `La feuille "${sheetName}" ne contient aucune donnée.`,
      count: 0,
    });

    return {
      sheetName,
      rowCount: 0,
      columnCount: 0,
      columns: [],
      previewRows: [],
      totalEmptyCells: 0,
      completelyEmptyRows: 0,
      duplicateRowsCount: 0,
      issues,
    };
  }

  // 1. Identify header row (first row with non-empty values)
  let headerRowIndex = 0;
  while (
    headerRowIndex < rawMatrix.length &&
    (!rawMatrix[headerRowIndex] ||
      rawMatrix[headerRowIndex].every((c) => c === null || c === undefined || String(c).trim() === ''))
  ) {
    headerRowIndex++;
  }

  if (headerRowIndex >= rawMatrix.length) {
    issues.push({
      id: `all-empty-${sheetName}`,
      type: 'empty_sheet',
      severity: 'error',
      title: 'Feuille entièrement vide',
      description: `Toutes les cellules de la feuille "${sheetName}" sont vides.`,
      count: rawMatrix.length,
    });

    return {
      sheetName,
      rowCount: 0,
      columnCount: 0,
      columns: [],
      previewRows: [],
      totalEmptyCells: 0,
      completelyEmptyRows: rawMatrix.length,
      duplicateRowsCount: 0,
      issues,
    };
  }

  const rawHeader = rawMatrix[headerRowIndex] || [];
  const rawDataRows = rawMatrix.slice(headerRowIndex + 1);

  // Determine maximum column count across all rows
  let maxCols = rawHeader.length;
  for (const r of rawDataRows) {
    if (r && r.length > maxCols) {
      maxCols = r.length;
    }
  }

  // 2. Build Column Definitions
  const columns: ColumnInfo[] = [];
  let unnamedCount = 0;

  for (let c = 0; c < maxCols; c++) {
    const rawVal = rawHeader[c];
    const isUnnamed = rawVal === null || rawVal === undefined || String(rawVal).trim() === '';
    const key = `col_${c}`;
    const name = isUnnamed ? `[Colonne ${c + 1}]` : String(rawVal).trim();

    if (isUnnamed) {
      unnamedCount++;
    }

    columns.push({
      index: c,
      key,
      name,
      detectedType: 'empty',
      totalCount: 0,
      emptyCount: 0,
      uniqueCount: 0,
      invalidCount: 0,
      isUnnamed,
      mostlyEmpty: false,
      sampleValues: [],
    });
  }

  if (unnamedCount > 0) {
    issues.push({
      id: `unnamed-cols-${sheetName}`,
      type: 'unnamed_column',
      severity: 'warning',
      title: 'Colonnes sans nom détectées',
      description: `${unnamedCount} colonne(s) n'ont pas d'en-tête défini dans la première ligne. Des noms par défaut ([Colonne X]) leur ont été attribués.`,
      count: unnamedCount,
    });
  }

  // 3. Process Data Rows
  let totalEmptyCells = 0;
  let completelyEmptyRows = 0;
  const rowSignatures = new Set<string>();
  let duplicateRowsCount = 0;

  // Track type statistics per column
  const colTypeCounters = columns.map(() => ({
    numberCount: 0,
    numberAsTextCount: 0,
    dateCount: 0,
    invalidDateCount: 0,
    booleanCount: 0,
    textCount: 0,
    emptyCount: 0,
    uniqueValues: new Set<string>(),
    samples: [] as (string | number | boolean)[],
  }));

  const formattedRows: Record<string, unknown>[] = [];
  const totalRowsCount = rawDataRows.length;

  for (let rIdx = 0; rIdx < rawDataRows.length; rIdx++) {
    const row = rawDataRows[rIdx] || [];
    let isRowCompletelyEmpty = true;
    const rowObj: Record<string, unknown> = { __rowIndex: rIdx + 1 };
    const signatureParts: string[] = [];

    for (let cIdx = 0; cIdx < maxCols; cIdx++) {
      const cellVal = row[cIdx];
      const colKey = columns[cIdx].key;
      const counter = colTypeCounters[cIdx];

      if (cellVal === null || cellVal === undefined || String(cellVal).trim() === '') {
        rowObj[colKey] = null;
        counter.emptyCount++;
        totalEmptyCells++;
        signatureParts.push('~null~');
      } else {
        isRowCompletelyEmpty = false;
        rowObj[colKey] = cellVal;
        const strVal = String(cellVal).trim();
        counter.uniqueValues.add(strVal);

        if (counter.samples.length < 5 && (typeof cellVal === 'string' || typeof cellVal === 'number' || typeof cellVal === 'boolean')) {
          counter.samples.push(cellVal);
        }

        signatureParts.push(strVal);

        // Detect cell type
        if (cellVal instanceof Date) {
          if (isNaN(cellVal.getTime())) {
            counter.invalidDateCount++;
          } else {
            counter.dateCount++;
          }
        } else if (typeof cellVal === 'number') {
          counter.numberCount++;
        } else if (typeof cellVal === 'boolean') {
          counter.booleanCount++;
        } else if (typeof cellVal === 'string') {
          if (cellVal.toLowerCase() === 'true' || cellVal.toLowerCase() === 'false' || cellVal.toLowerCase() === 'oui' || cellVal.toLowerCase() === 'non') {
            counter.booleanCount++;
          } else if (isNumericString(cellVal)) {
            counter.numberAsTextCount++;
          } else if (isValidDate(cellVal)) {
            counter.dateCount++;
          } else {
            counter.textCount++;
          }
        }
      }
    }

    if (isRowCompletelyEmpty) {
      completelyEmptyRows++;
    } else {
      // Check for row duplicates
      const signature = signatureParts.join('|#|');
      if (rowSignatures.has(signature)) {
        duplicateRowsCount++;
      } else {
        rowSignatures.add(signature);
      }
    }

    // Preserve all rows for full professional pagination (up to 50,000 rows)
    if (rIdx < 50000) {
      formattedRows.push(rowObj);
    }
  }

  // 4. Determine column types and flag column-specific issues
  let totalNumbersAsText = 0;
  let totalInvalidDates = 0;
  let mostlyEmptyColumnsCount = 0;

  columns.forEach((col, idx) => {
    const counter = colTypeCounters[idx];
    const totalCells = totalRowsCount;
    const nonEmptyCells = totalCells - counter.emptyCount;

    col.totalCount = totalCells;
    col.emptyCount = counter.emptyCount;
    col.uniqueCount = counter.uniqueValues.size;
    col.sampleValues = counter.samples;

    if (nonEmptyCells === 0) {
      col.detectedType = 'empty';
      col.mostlyEmpty = true;
      mostlyEmptyColumnsCount++;
      return;
    }

    // Check if mostly empty (>80% empty cells)
    if (counter.emptyCount / totalCells > 0.8 && totalCells > 10) {
      col.mostlyEmpty = true;
      mostlyEmptyColumnsCount++;
    }

    // Type classification based on majority of non-empty cells
    const dateRatio = counter.dateCount / nonEmptyCells;
    const numRatio = (counter.numberCount + counter.numberAsTextCount) / nonEmptyCells;
    const boolRatio = counter.booleanCount / nonEmptyCells;

    let detected: DetectedDataType = 'text';

    if (dateRatio >= 0.7) {
      detected = 'date';
    } else if (numRatio >= 0.7) {
      detected = 'number';
    } else if (boolRatio >= 0.7) {
      detected = 'boolean';
    } else if (counter.textCount > 0 && (counter.numberCount > 0 || counter.dateCount > 0)) {
      detected = 'mixed';
    }

    col.detectedType = detected;

    if (counter.numberAsTextCount > 0) {
      totalNumbersAsText += counter.numberAsTextCount;
    }
    if (counter.invalidDateCount > 0) {
      totalInvalidDates += counter.invalidDateCount;
    }
  });

  // 5. Consolidate Validation Issues
  if (completelyEmptyRows > 0) {
    issues.push({
      id: `empty-rows-${sheetName}`,
      type: 'empty_row',
      severity: 'info',
      title: 'Lignes complètement vides',
      description: `${completelyEmptyRows} ligne(s) entièrement vide(s) ont été détectées et seront ignorées lors de l'intégration.`,
      count: completelyEmptyRows,
    });
  }

  if (totalEmptyCells > 0) {
    issues.push({
      id: `empty-cells-${sheetName}`,
      type: 'empty_cells',
      severity: 'warning',
      title: 'Cellules vides détectées',
      description: `${totalEmptyCells.toLocaleString('fr-FR')} cellule(s) vide(s) identifiée(s) dans la feuille.`,
      count: totalEmptyCells,
    });
  }

  if (totalNumbersAsText > 0) {
    issues.push({
      id: `num-as-text-${sheetName}`,
      type: 'number_as_text',
      severity: 'info',
      title: 'Nombres formatés en texte',
      description: `${totalNumbersAsText} valeur(s) numérique(s) sont encodées sous forme de chaîne de caractères dans Excel.`,
      count: totalNumbersAsText,
    });
  }

  if (totalInvalidDates > 0) {
    issues.push({
      id: `invalid-dates-${sheetName}`,
      type: 'invalid_date',
      severity: 'warning',
      title: 'Dates invalides détectées',
      description: `${totalInvalidDates} cellule(s) date n'ont pas pu être converties correctement.`,
      count: totalInvalidDates,
    });
  }

  if (duplicateRowsCount > 0) {
    issues.push({
      id: `duplicates-${sheetName}`,
      type: 'potential_duplicates',
      severity: 'info',
      title: 'Lignes en doublon potentielles',
      description: `${duplicateRowsCount} ligne(s) possèdent un contenu identique à une ligne précédente.`,
      count: duplicateRowsCount,
    });
  }

  if (mostlyEmptyColumnsCount > 0) {
    issues.push({
      id: `mostly-empty-cols-${sheetName}`,
      type: 'mostly_empty_column',
      severity: 'info',
      title: 'Colonnes quasiment vides',
      description: `${mostlyEmptyColumnsCount} colonne(s) contiennent plus de 80% de cellules vides.`,
      count: mostlyEmptyColumnsCount,
    });
  }

  return {
    sheetName,
    rowCount: totalRowsCount,
    columnCount: columns.length,
    columns,
    previewRows: formattedRows,
    totalEmptyCells,
    completelyEmptyRows,
    duplicateRowsCount,
    issues,
  };
}
