/**
 * Security and sanitization utilities for file upload and cell display
 */

export const ALLOWED_EXTENSIONS = ['.xlsx', '.xls'];

export const ALLOWED_MIME_TYPES = [
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel',
  'application/wps-office.xlsx',
  'application/x-excel',
  'application/excel',
];

export const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024; // 50 Megabytes

export interface FileValidationResult {
  isValid: boolean;
  error?: string;
  extension: string;
}

export function validateExcelFile(file: File): FileValidationResult {
  const name = file.name.toLowerCase();
  const matchedExt = ALLOWED_EXTENSIONS.find((ext) => name.endsWith(ext));

  if (!matchedExt) {
    return {
      isValid: false,
      error: `Format non supporté. Veuillez importer un fichier au format .xlsx ou .xls (reçu : ${file.name.split('.').pop() || 'inconnu'}).`,
      extension: '',
    };
  }

  // If MIME type is provided by browser, check it
  if (file.type && !ALLOWED_MIME_TYPES.includes(file.type) && file.type !== 'application/octet-stream') {
    // Note: Some Windows systems report application/octet-stream for xlsx, which is acceptable
    // Only fail if it's explicitly an executable or incompatible media type
    if (file.type.startsWith('image/') || file.type.startsWith('video/') || file.type.includes('pdf')) {
      return {
        isValid: false,
        error: `Type MIME non valide : ${file.type}. Veuillez fournir une feuille de calcul Excel.`,
        extension: matchedExt,
      };
    }
  }

  if (file.size > MAX_FILE_SIZE_BYTES) {
    return {
      isValid: false,
      error: `Fichier trop volumineux (${(file.size / (1024 * 1024)).toFixed(1)} Mo). La taille maximale autorisée est de 50 Mo.`,
      extension: matchedExt,
    };
  }

  if (file.size === 0) {
    return {
      isValid: false,
      error: 'Le fichier sélectionné est vide (0 octet).',
      extension: matchedExt,
    };
  }

  return {
    isValid: true,
    extension: matchedExt,
  };
}

/**
 * Format file size into readable format (Ko, Mo, Go)
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} Ko`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(2)} Mo`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} Go`;
}

/**
 * Sanitize cell values for display to prevent formula injection / XSS
 * Symbols like =, +, -, @ at the beginning of a cell can trigger formulas in exports
 */
export function sanitizeCellValue(val: unknown): string {
  if (val === null || val === undefined) return '';
  if (val instanceof Date) {
    return isNaN(val.getTime()) ? 'Date invalide' : val.toLocaleDateString('fr-FR');
  }
  const str = String(val);
  return str.trim();
}
