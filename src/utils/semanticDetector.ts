import { ColumnSetting, SemanticMappingConfig } from '../types/wizard';

/**
 * Suggests potential semantic roles (Brand, Model, Energy, Region, Date, Volume)
 * based purely on heuristic matching of column names and sample values.
 * This is ONLY A SUGGESTION for the user, never enforced or assumed by the code.
 */
export function suggestSemanticMapping(columns: ColumnSetting[]): SemanticMappingConfig {
  const mapping: SemanticMappingConfig = {};

  const brandKeywords = ['marque', 'brand', 'make', 'constructeur', 'oem'];
  const modelKeywords = ['modele', 'modèle', 'model', 'version', 'gamme', 'silhouette', 'carline'];
  const energyKeywords = ['energie', 'énergie', 'fuel', 'motorisation', 'carburant', 'propulsion', 'hybrid'];
  const regionKeywords = ['region', 'région', 'departement', 'département', 'pays', 'territoire', 'zone', 'ville', 'market', 'country'];
  const dateKeywords = ['date', 'periode', 'période', 'mois', 'annee', 'année', 'year', 'month', 'semaine', 'trimestre'];
  const volumeKeywords = ['volume', 'ventes', 'sales', 'immatriculations', 'quantite', 'quantité', 'total', 'livraisons', 'valeur'];

  const normalize = (str: string) =>
    str.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();

  for (const col of columns) {
    if (col.role === 'ignored') continue;
    const nameNorm = normalize(col.label || col.originalHeader);

    // 1. Date
    if (!mapping.date && (col.type === 'date' || dateKeywords.some((k) => nameNorm.includes(k)))) {
      mapping.date = col.key;
      continue;
    }

    // 2. Volume
    if (!mapping.volume && (col.type === 'number' && (volumeKeywords.some((k) => nameNorm.includes(k)) || col.role === 'measure'))) {
      mapping.volume = col.key;
      continue;
    }

    // 3. Brand
    if (!mapping.brand && (col.type === 'string' && brandKeywords.some((k) => nameNorm.includes(k)))) {
      mapping.brand = col.key;
      continue;
    }

    // 4. Model
    if (!mapping.model && (col.type === 'string' && modelKeywords.some((k) => nameNorm.includes(k)))) {
      mapping.model = col.key;
      continue;
    }

    // 5. Energy
    if (!mapping.energy && (col.type === 'string' && energyKeywords.some((k) => nameNorm.includes(k)))) {
      mapping.energy = col.key;
      continue;
    }

    // 6. Region
    if (!mapping.region && (col.type === 'string' && regionKeywords.some((k) => nameNorm.includes(k)))) {
      mapping.region = col.key;
      continue;
    }
  }

  return mapping;
}
