import { Request, Response, NextFunction } from 'express';

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
const ALLOWED_EXTENSIONS = ['.xlsx', '.xls'];

/**
 * Server-side validation middleware for Excel imports.
 * Re-validates file extension, payload size, and structure.
 */
export function validateImportPayload(req: Request, res: Response, next: NextFunction): void {
  const { fileName, fileSizeBytes, totalRows, totalColumns } = req.body;

  if (!fileName || typeof fileName !== 'string') {
    res.status(400).json({ error: 'Nom de fichier manquant ou invalide.' });
    return;
  }

  const lowerName = fileName.toLowerCase();
  const hasValidExtension = ALLOWED_EXTENSIONS.some((ext) => lowerName.endsWith(ext));
  if (!hasValidExtension) {
    res.status(400).json({
      error: 'Format de fichier non supporté. Seuls les classeurs .xlsx et .xls sont autorisés.',
    });
    return;
  }

  if (fileSizeBytes && (typeof fileSizeBytes !== 'number' || fileSizeBytes > MAX_FILE_SIZE)) {
    res.status(400).json({
      error: `Taille du fichier excessive. Limite maximale autorisée : 50 Mo.`,
    });
    return;
  }

  if (typeof totalRows !== 'number' || typeof totalColumns !== 'number') {
    res.status(400).json({
      error: 'Métadonnées de structure de tableau (lignes/colonnes) manquantes.',
    });
    return;
  }

  next();
}

/**
 * Sanitizes any cell value against formula injection attacks (=, +, -, @).
 */
export function sanitizeBackendValue(val: unknown): unknown {
  if (typeof val === 'string') {
    const trimmed = val.trim();
    if (['=', '+', '-', '@', '\t', '\r'].some((char) => trimmed.startsWith(char))) {
      return `'${trimmed}`;
    }
  }
  return val;
}
