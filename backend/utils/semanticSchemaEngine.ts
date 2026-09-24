/**
 * Intelligent Semantic Schema Engine
 * Deeply inspects database records from imported Excel sheets,
 * automatically detects column types, semantics, distributions,
 * supports cross-tab monthly period columns (e.g. 2026-01, 2026-02...),
 * and provides dynamic bi-directional cell-level filtering & autocomplete.
 */

export type SemanticRole =
  | 'brand'
  | 'model'
  | 'segment'
  | 'temporal_metric' // Cross-tab monthly sales (e.g. header is "2026-01", "2026-02")
  | 'metric_sales'    // Single sales/volume column (e.g. "Ventes", "Total")
  | 'metric_phev'     // PHEV / Hybrid sales
  | 'metric_ev'       // 100% BEV sales
  | 'metric_revenue'  // Revenue / Price
  | 'temporal'        // Temporal dimension column (e.g. "Date", "Mois", "Année")
  | 'geographic'      // Region / Country
  | 'energy_type'     // Energy / Fuel
  | 'category'        // General categorical attribute
  | 'identifier'      // ID / Serial
  | 'unknown';

export interface ColumnSemanticProfile {
  columnKey: string;
  originalHeader: string;
  detectedDataType: 'string' | 'number' | 'date' | 'boolean' | 'empty';
  semanticRole: SemanticRole;
  confidence: number;
  explanation: string;
  uniqueCount: number;
  nullCount: number;
  sampleValues: any[];
  numericStats?: {
    sum: number;
    min: number;
    max: number;
    avg: number;
  };
  topCategories?: Array<{
    value: string;
    count: number;
    sharePercent: number;
  }>;
}

export interface AnalysisPlan {
  primaryDimensionCol: string; // brand/category
  subDimensionCol?: string;    // model/version
  segmentCol?: string;         // segment/category
  primaryMetricCol: string;    // sales/volume
  temporalMetricCols: string[]; // wide date columns: 2026-01, 2026-02...
  isWideTemporalFormat: boolean; // true if file has multiple monthly columns
  phevMetricCol?: string;      // phev
  energyCol?: string;          // energy
  temporalCol?: string;        // date/period column in long format
  geographicCol?: string;      // region/origin
  priceCol?: string;           // price/revenue
  dimensionRoleExplanation: string;
  metricRoleExplanation: string;
}

export interface DynamicCellFilter {
  [colKeyOrHeader: string]: string[];
}

export interface CellSuggestion {
  type: 'column' | 'cell_value';
  columnKey: string;
  columnHeader: string;
  value: string;
  label: string;
  subLabel?: string;
  count?: number;
}

const COMMON_AUTO_BRANDS = [
  'omoda', 'jaecoo', 'chery', 'toyota', 'volkswagen', 'vw', 'peugeot', 'renault',
  'hyundai', 'kia', 'fiat', 'citroen', 'dacia', 'suzuki', 'nissan', 'bmw',
  'mercedes', 'audi', 'skoda', 'seat', 'ford', 'byd', 'geely', 'mg', 'haval',
  'great wall', 'dfsk', 'dongfeng', 'mahindra', 'tata', 'isuzu', 'mitsubishi',
  'jeep', 'land rover', 'porsche', 'cupra', 'ds', 'changan', 'baic', 'jac'
];

const TUNISIA_REGIONS = [
  'tunis', 'ariana', 'ben arous', 'manouba', 'nabeul', 'zaghouan', 'bizerte',
  'beja', 'jendouba', 'kef', 'siliana', 'sousse', 'monastir', 'mahdia',
  'sfax', 'kairouan', 'kasserine', 'sidi bouzid', 'gabes', 'medenine',
  'tataouine', 'gafsa', 'tozeur', 'kebili', 'nord', 'sud', 'centre', 'sahel'
];

const ENERGY_KEYWORDS = [
  'essence', 'diesel', 'hybride', 'phev', 'mhev', 'bev', 'electrique',
  'électrique', 'gpl', 'gnv', 'plug-in', 'thermique', 'gazole'
];

function cleanStr(val: any): string {
  if (val === null || val === undefined) return '';
  return String(val).trim().toLowerCase();
}

export function parseNumber(val: any): number | null {
  if (val === null || val === undefined) return null;
  if (typeof val === 'number') return isNaN(val) ? null : val;
  if (typeof val === 'string') {
    const cleaned = val.replace(/\s+/g, '').replace(',', '.');
    const n = Number(cleaned);
    return isNaN(n) ? null : n;
  }
  return null;
}

/**
 * Checks if a column header represents a date/period (e.g. "2026-01", "2026/02", "01/2026", "Janvier", "2026")
 */
export function isPeriodHeader(header: string): boolean {
  if (!header) return false;
  const trimmed = header.trim();
  // YYYY-MM or YYYY/MM or YYYY.MM
  if (/^(\d{4})[-/.](0?[1-9]|1[0-2])$/.test(trimmed)) return true;
  // MM-YYYY or MM/YYYY
  if (/^(0?[1-9]|1[0-2])[-/.](\d{4})$/.test(trimmed)) return true;
  // YYYY only
  if (/^(19|20)\d{2}$/.test(trimmed)) return true;
  // Month name (French or English)
  if (
    /^(janv|févr|fevr|mars|avril|mai|juin|juill|juil|août|aout|sept|oct|nov|déc|dec|jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)/i.test(
      trimmed
    )
  ) {
    return true;
  }
  return false;
}

/**
 * Deep semantic profiling of all columns in a dataset
 */
export function profileDatasetColumns(
  rows: any[],
  columns: any[]
): { profiles: ColumnSemanticProfile[]; plan: AnalysisPlan } {
  if (!rows || rows.length === 0) {
    return { profiles: [], plan: getDefaultPlan() };
  }

  const sampleLimit = Math.min(rows.length, 1000);
  const sampleRows = rows.slice(0, sampleLimit);

  // Normalize column list
  const colKeys = columns && columns.length > 0
    ? columns.map((c, idx) => ({
        key: c.id || c.key || `col_${idx}`,
        header: c.name || c.originalHeader || c.key || `Colonne ${idx + 1}`,
        rawType: c.detectedType || c.type || 'string',
      }))
    : Object.keys(rows[0] || {}).map((k) => ({
        key: k,
        header: k,
        rawType: 'string',
      }));

  const profiles: ColumnSemanticProfile[] = [];

  for (const col of colKeys) {
    const rawHeader = col.header;
    const headerLower = cleanStr(rawHeader);
    const key = col.key;

    // Collect values for this column
    const colValues = sampleRows.map((r) => r[key]);
    const nonNullValues = colValues.filter((v) => v !== null && v !== undefined && String(v).trim() !== '');
    const nullCount = colValues.length - nonNullValues.length;

    const valueMap: Record<string, number> = {};
    let numericCount = 0;
    let numericSum = 0;
    let numericMin = Infinity;
    let numericMax = -Infinity;

    let brandMatchCount = 0;
    let regionMatchCount = 0;
    let energyMatchCount = 0;
    let datePatternCount = 0;

    for (const val of nonNullValues) {
      const sVal = String(val).trim();
      const sLower = sVal.toLowerCase();
      valueMap[sVal] = (valueMap[sVal] || 0) + 1;

      // Numeric check
      const num = parseNumber(val);
      if (num !== null) {
        numericCount++;
        numericSum += num;
        if (num < numericMin) numericMin = num;
        if (num > numericMax) numericMax = num;
      }

      // Semantic content checks
      if (COMMON_AUTO_BRANDS.some((b) => sLower.includes(b))) {
        brandMatchCount++;
      }
      if (TUNISIA_REGIONS.some((reg) => sLower.includes(reg))) {
        regionMatchCount++;
      }
      if (ENERGY_KEYWORDS.some((e) => sLower.includes(e))) {
        energyMatchCount++;
      }
      if (
        /^(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})|(\d{4}[/-]\d{1,2}[/-]\d{1,2})|(\d{4})|janv|févr|mars|avril|mai|juin|juill|août|sept|oct|nov|déc/i.test(
          sVal
        )
      ) {
        datePatternCount++;
      }
    }

    const uniqueCount = Object.keys(valueMap).length;
    const isMostlyNumeric = nonNullValues.length > 0 && numericCount / nonNullValues.length >= 0.7;
    const isMostlyDate = nonNullValues.length > 0 && datePatternCount / nonNullValues.length >= 0.6;
    const headerIsPeriod = isPeriodHeader(rawHeader);

    let detectedDataType: 'string' | 'number' | 'date' | 'boolean' | 'empty' = 'string';
    if (nonNullValues.length === 0) {
      detectedDataType = 'empty';
    } else if (isMostlyNumeric) {
      detectedDataType = 'number';
    } else if (isMostlyDate) {
      detectedDataType = 'date';
    }

    let semanticRole: SemanticRole = 'unknown';
    let confidence = 0.5;
    let explanation = `Colonne détectée de type ${detectedDataType}.`;

    // 1. Cross-tab monthly period metric column (e.g. header is "2026-01", "2026-02", "2026-03" and values are numbers)
    if (headerIsPeriod && isMostlyNumeric) {
      semanticRole = 'temporal_metric';
      confidence = 0.99;
      explanation = `Métrique mensuelle de la période "${rawHeader}" (Somme calculée : ${Math.round(numericSum).toLocaleString('fr-FR')}).`;
    }
    // 2. Brand / Constructeur
    else if (
      /marque|brand|constructeur|oem|fabricant|libelle_marque/i.test(headerLower) ||
      brandMatchCount / Math.max(nonNullValues.length, 1) >= 0.35
    ) {
      semanticRole = 'brand';
      confidence = /marque|brand|constructeur/i.test(headerLower) ? 0.98 : 0.85;
      explanation = `Identifié comme Marque / Constructeur automobile (${uniqueCount} entités distinctes).`;
    }
    // 3. Model / Version
    else if (
      /modele|modèle|model|version|gamme|designation|finition|libelle_modele/i.test(headerLower) &&
      !isMostlyNumeric
    ) {
      semanticRole = 'model';
      confidence = 0.96;
      explanation = `Identifié comme Modèle ou Version (${uniqueCount} modèles distincts).`;
    }
    // 4. Vehicle Segment (e.g. SEGMENTS in the screenshot)
    else if (/segment|categorie|catégorie|type.*vehicule|silhouette|carrosserie/i.test(headerLower)) {
      semanticRole = 'segment';
      confidence = 0.95;
      explanation = `Classification de segment automobile (${uniqueCount} segments distincts).`;
    }
    // 5. PHEV / Hybrid Sales
    else if (
      isMostlyNumeric &&
      /phev|hybride.*rechargeable|plug[- ]?in|electrif/i.test(headerLower)
    ) {
      semanticRole = 'metric_phev';
      confidence = 0.96;
      explanation = `Métrique de ventes PHEV / Hybrides rechargeables.`;
    }
    // 6. 100% BEV
    else if (
      isMostlyNumeric &&
      /\bev\b|electrique|100%|bev/i.test(headerLower) &&
      !/phev/i.test(headerLower)
    ) {
      semanticRole = 'metric_ev';
      confidence = 0.94;
      explanation = `Métrique de ventes 100% Électriques (BEV).`;
    }
    // 7. General Sales / Volume metric (e.g. "Ventes", "Volume", "Total")
    else if (
      isMostlyNumeric &&
      /vente|sales|volume|immat|immatriculation|quantit|nombre|total|unite|livraison/i.test(headerLower)
    ) {
      semanticRole = 'metric_sales';
      confidence = 0.98;
      explanation = `Métrique globale de volume de ventes (Somme : ${Math.round(numericSum).toLocaleString('fr-FR')}).`;
    }
    // 8. Price / Revenue
    else if (
      isMostlyNumeric &&
      /prix|tarif|montant|valeur|chiffre.*affaire|ca\b|tnd|dt\b|eur/i.test(headerLower)
    ) {
      semanticRole = 'metric_revenue';
      confidence = 0.95;
      explanation = `Métrique financière (Prix unitaire ou Chiffre d'Affaires).`;
    }
    // 9. Temporal dimension column (e.g. "Date", "Mois", "Année")
    else if (
      isMostlyDate ||
      /date|mois|month|annee|année|year|periode|période|trimestre|semestre|jour/i.test(headerLower)
    ) {
      semanticRole = 'temporal';
      confidence = isMostlyDate ? 0.98 : 0.9;
      explanation = `Dimension temporelle (Périodes, dates ou mois d'enregistrement).`;
    }
    // 10. Geographic
    else if (
      /region|région|gouvernorat|ville|pays|origine|delegation|zone|secteur|district/i.test(headerLower) ||
      regionMatchCount / Math.max(nonNullValues.length, 1) >= 0.4
    ) {
      semanticRole = 'geographic';
      confidence = 0.92;
      explanation = `Dimension géographique (${regionMatchCount} régions ou origines détectées).`;
    }
    // 11. Energy / Fuel
    else if (
      /energie|énergie|carburant|motorisation|fuel/i.test(headerLower) ||
      energyMatchCount / Math.max(nonNullValues.length, 1) >= 0.4
    ) {
      semanticRole = 'energy_type';
      confidence = 0.95;
      explanation = `Type d'énergie ou motorisation.`;
    }
    // 12. Identifier
    else if (/^id$|_id$|matricule|chassis|vin\b|code\b|numero|numéro/i.test(headerLower)) {
      semanticRole = 'identifier';
      confidence = 0.95;
      explanation = `Identifiant technique ou numéro de série.`;
    }
    // 13. General categorical
    else if (!isMostlyNumeric) {
      semanticRole = 'category';
      confidence = 0.75;
      explanation = `Attribut catégoriel textuel (${uniqueCount} valeurs distinctes).`;
    }
    // 14. Fallback numeric
    else if (isMostlyNumeric) {
      semanticRole = 'metric_sales';
      confidence = 0.7;
      explanation = `Colonne numérique agrégée.`;
    }

    const topCategories = !isMostlyNumeric
      ? Object.entries(valueMap)
          .map(([value, count]) => ({
            value,
            count,
            sharePercent: Number(((count / Math.max(nonNullValues.length, 1)) * 100).toFixed(1)),
          }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 15)
      : undefined;

    profiles.push({
      columnKey: key,
      originalHeader: rawHeader,
      detectedDataType,
      semanticRole,
      confidence,
      explanation,
      uniqueCount,
      nullCount,
      sampleValues: nonNullValues.slice(0, 8),
      numericStats: isMostlyNumeric
        ? {
            sum: numericSum,
            min: numericMin === Infinity ? 0 : numericMin,
            max: numericMax === -Infinity ? 0 : numericMax,
            avg: numericCount > 0 ? numericSum / numericCount : 0,
          }
        : undefined,
      topCategories,
    });
  }

  const plan = deriveAnalysisPlan(profiles, colKeys);
  return { profiles, plan };
}

function getDefaultPlan(): AnalysisPlan {
  return {
    primaryDimensionCol: 'col_0',
    primaryMetricCol: 'col_1',
    temporalMetricCols: [],
    isWideTemporalFormat: false,
    dimensionRoleExplanation: 'Dimension par défaut',
    metricRoleExplanation: 'Métrique par défaut',
  };
}

/**
 * Derives optimal analysis plan, detecting whether the table is in wide monthly format
 * (e.g. 2026-01, 2026-02, 2026-03...) or long format.
 */
function deriveAnalysisPlan(
  profiles: ColumnSemanticProfile[],
  fallbackCols: Array<{ key: string; header: string }>
): AnalysisPlan {
  // Brand column
  let brandProfile = profiles.find((p) => p.semanticRole === 'brand');
  if (!brandProfile) {
    brandProfile = profiles.find(
      (p) => p.semanticRole === 'category' || p.detectedDataType === 'string'
    );
  }
  const primaryDimensionCol = brandProfile?.columnKey || fallbackCols[0]?.key || 'col_0';

  // Model column
  const modelProfile = profiles.find((p) => p.semanticRole === 'model');
  const subDimensionCol = modelProfile?.columnKey;

  // Segment column
  const segmentProfile = profiles.find((p) => p.semanticRole === 'segment');
  const segmentCol = segmentProfile?.columnKey;

  // Wide temporal metric columns (e.g. 2026-01, 2026-02, ...)
  const temporalMetricProfiles = profiles.filter((p) => p.semanticRole === 'temporal_metric');
  const temporalMetricCols = temporalMetricProfiles.map((p) => p.columnKey);
  const isWideTemporalFormat = temporalMetricCols.length >= 2;

  // Single metric column (if not wide format, or explicit total)
  let salesProfile = profiles.find(
    (p) => p.semanticRole === 'metric_sales' && /total|cumul|vente|volume/i.test(p.originalHeader)
  );
  if (!salesProfile && !isWideTemporalFormat) {
    salesProfile = profiles.find((p) => p.semanticRole === 'metric_sales');
    if (!salesProfile) {
      const numCols = profiles.filter((p) => p.detectedDataType === 'number' && p.columnKey !== primaryDimensionCol);
      if (numCols.length > 0) {
        numCols.sort((a, b) => (b.numericStats?.sum || 0) - (a.numericStats?.sum || 0));
        salesProfile = numCols[0];
      }
    }
  }
  const primaryMetricCol = salesProfile?.columnKey || temporalMetricCols[0] || fallbackCols[1]?.key || 'col_1';

  const phevProfile = profiles.find((p) => p.semanticRole === 'metric_phev');
  const energyProfile = profiles.find((p) => p.semanticRole === 'energy_type');
  const temporalProfile = profiles.find((p) => p.semanticRole === 'temporal');
  const geoProfile = profiles.find((p) => p.semanticRole === 'geographic');
  const priceProfile = profiles.find((p) => p.semanticRole === 'metric_revenue');

  const dimensionExplanation = `Regroupement principal par "${brandProfile?.originalHeader || primaryDimensionCol}" (${brandProfile?.explanation || 'Dimension catégorielle'})`;
  const metricExplanation = isWideTemporalFormat
    ? `Agrégation mensuelle multi-périodes (${temporalMetricCols.length} mois : ${temporalMetricProfiles.map((p) => p.originalHeader).join(', ')})`
    : `Agrégation de volume par "${salesProfile?.originalHeader || primaryMetricCol}" (${salesProfile?.explanation || 'Métrique de volume'})`;

  return {
    primaryDimensionCol,
    subDimensionCol,
    segmentCol,
    primaryMetricCol,
    temporalMetricCols,
    isWideTemporalFormat,
    phevMetricCol: phevProfile?.columnKey,
    energyCol: energyProfile?.columnKey,
    temporalCol: temporalProfile?.columnKey,
    geographicCol: geoProfile?.columnKey,
    priceCol: priceProfile?.columnKey,
    dimensionRoleExplanation: dimensionExplanation,
    metricRoleExplanation: metricExplanation,
  };
}

/**
 * Autocomplete suggestions generator across columns and cells
 * Prioritizes prefix matches (e.g. typing "D" shows "DFSK", "D-Max" first)
 * and organizes by semantic relevance (brand, model, segment first).
 */
export function getDatasetSuggestions(
  rows: any[],
  columns: ColumnSemanticProfile[],
  searchQuery: string,
  limit: number = 15
): CellSuggestion[] {
  if (!rows || rows.length === 0 || !searchQuery || searchQuery.trim().length === 0) {
    return [];
  }

  const q = searchQuery.trim().toLowerCase();
  const suggestions: CellSuggestion[] = [];

  // 1. Check matching column headers
  for (const col of columns) {
    const colHeaderLower = col.originalHeader.toLowerCase();
    if (colHeaderLower.includes(q) || (q === 'marque' && col.semanticRole === 'brand') || (q === 'modele' && col.semanticRole === 'model')) {
      const isPrefix = colHeaderLower.startsWith(q);
      suggestions.push({
        type: 'column',
        columnKey: col.columnKey,
        columnHeader: col.originalHeader,
        value: col.originalHeader,
        label: `Colonne : ${col.originalHeader}`,
        subLabel: `${col.uniqueCount} valeurs distinctes (${col.semanticRole})`,
      });
    }
  }

  // 2. Check matching cell values across all columns
  // Prioritize primary dimension (brand), sub-dimension (model), segment
  const sortedColumns = [...columns].sort((a, b) => {
    const priority = (role: string) => {
      if (role === 'brand') return 1;
      if (role === 'model') return 2;
      if (role === 'segment') return 3;
      if (role === 'category') return 4;
      return 5;
    };
    return priority(a.semanticRole) - priority(b.semanticRole);
  });

  const seenValues = new Set<string>();
  const prefixCellMatches: CellSuggestion[] = [];
  const substringCellMatches: CellSuggestion[] = [];

  for (const col of sortedColumns) {
    // Only search in categorical, text or identifier columns
    if (col.detectedDataType === 'number' && col.semanticRole !== 'identifier') {
      continue;
    }

    const valueCountMap: Record<string, number> = {};
    for (const row of rows) {
      const raw = row[col.columnKey];
      if (raw !== null && raw !== undefined && String(raw).trim() !== '') {
        const str = String(raw).trim();
        if (str.toLowerCase().includes(q)) {
          valueCountMap[str] = (valueCountMap[str] || 0) + 1;
        }
      }
    }

    const entries = Object.entries(valueCountMap);
    for (const [val, count] of entries) {
      const key = `${col.columnKey}:${val}`;
      if (!seenValues.has(key)) {
        seenValues.add(key);
        const item: CellSuggestion = {
          type: 'cell_value',
          columnKey: col.columnKey,
          columnHeader: col.originalHeader,
          value: val,
          label: val,
          subLabel: `${col.originalHeader} • ${count} ligne(s)`,
          count,
        };
        if (val.toLowerCase().startsWith(q)) {
          prefixCellMatches.push(item);
        } else {
          substringCellMatches.push(item);
        }
      }
    }
  }

  // Sort prefix matches by count descending, then substring matches by count descending
  prefixCellMatches.sort((a, b) => (b.count || 0) - (a.count || 0));
  substringCellMatches.sort((a, b) => (b.count || 0) - (a.count || 0));

  // Combine: column matches first, then prefix cell matches, then substring cell matches
  const combined = [...suggestions, ...prefixCellMatches, ...substringCellMatches];
  return combined.slice(0, limit);
}

/**
 * Executes dynamic market analysis with full bi-directional cell filters & omnibar search
 */
export function executeDynamicAnalysis(
  dataset: any,
  options?: {
    searchQuery?: string;
    cellFilters?: Record<string, string[]>;
    selectedPeriod?: string; // e.g. "2026-01" or "all"
    brand?: string;
  }
) {
  if (!dataset || !dataset.previewData?.rows || dataset.previewData.rows.length === 0) {
    return null;
  }

  const rawRows: any[] = dataset.previewData.rows;
  const cols: any[] = dataset.previewData.columns || [];
  const { profiles, plan } = profileDatasetColumns(rawRows, cols);

  const dimKey = plan.primaryDimensionCol;
  const modelKey = plan.subDimensionCol;
  const segmentKey = plan.segmentCol;
  const phevKey = plan.phevMetricCol;
  const dateKey = plan.temporalCol;
  const geoKey = plan.geographicCol;

  // Build header-to-key mapper
  const headerToKeyMap: Record<string, string> = {};
  profiles.forEach((p) => {
    headerToKeyMap[p.originalHeader.toLowerCase()] = p.columnKey;
    headerToKeyMap[p.columnKey] = p.columnKey;
  });

  // Apply bi-directional filtering
  const activeCellFilters = options?.cellFilters || {};
  const query = options?.searchQuery ? cleanStr(options.searchQuery) : '';
  const selectedPeriod = options?.selectedPeriod && options.selectedPeriod !== 'all'
    ? options.selectedPeriod
    : null;

  // Find period column key if selected
  let periodColKey: string | null = null;
  if (selectedPeriod) {
    const matchedPeriodProf = profiles.find(
      (p) => p.originalHeader.toLowerCase() === selectedPeriod.toLowerCase() || p.columnKey === selectedPeriod
    );
    if (matchedPeriodProf) {
      periodColKey = matchedPeriodProf.columnKey;
    }
  }

  const filteredRows = rawRows.filter((r) => {
    // 1. Omnibar search query matching across all cells of the row
    if (query) {
      const matchInAnyCell = Object.values(r).some((cellVal) => {
        if (cellVal === null || cellVal === undefined) return false;
        return String(cellVal).toLowerCase().includes(query);
      });
      if (!matchInAnyCell) return false;
    }

    // 2. Specific brand filter
    if (options?.brand) {
      const rBrand = String(r[dimKey] || '').trim().toLowerCase();
      if (rBrand !== options.brand.trim().toLowerCase()) return false;
    }

    // 3. Dynamic Cell Filters for any column
    for (const [filterColOrHeader, allowedVals] of Object.entries(activeCellFilters)) {
      if (!allowedVals || allowedVals.length === 0) continue;
      const targetColKey = headerToKeyMap[filterColOrHeader.toLowerCase()] || filterColOrHeader;
      const cellVal = String(r[targetColKey] ?? '').trim();
      const match = allowedVals.some((v) => v.toLowerCase() === cellVal.toLowerCase());
      if (!match) return false;
    }

    return true;
  });

  // Collect distinct values for all categorical columns within filtered set (bi-directional linking)
  const availableFilterOptions: Record<
    string,
    {
      columnKey: string;
      columnHeader: string;
      semanticRole: string;
      values: Array<{ value: string; count: number }>;
    }
  > = {};

  profiles.forEach((p) => {
    if (p.detectedDataType === 'string' || p.semanticRole === 'brand' || p.semanticRole === 'model' || p.semanticRole === 'segment') {
      const valCounts: Record<string, number> = {};
      for (const r of filteredRows) {
        const raw = r[p.columnKey];
        if (raw !== null && raw !== undefined && String(raw).trim() !== '') {
          const s = String(raw).trim();
          valCounts[s] = (valCounts[s] || 0) + 1;
        }
      }
      const sortedVals = Object.entries(valCounts)
        .map(([value, count]) => ({ value, count }))
        .sort((a, b) => b.count - a.count);

      availableFilterOptions[p.columnKey] = {
        columnKey: p.columnKey,
        columnHeader: p.originalHeader,
        semanticRole: p.semanticRole,
        values: sortedVals,
      };
    }
  });

  // Aggregation maps
  const brandMap: Record<
    string,
    {
      sales: number;
      phevSales: number;
      models: Record<string, number>;
      segments: Record<string, number>;
      regions: Record<string, number>;
    }
  > = {};

  const temporalMap: Record<string, number> = {};
  const segmentMap: Record<string, number> = {};
  const modelOverallMap: Record<string, { brand: string; sales: number; segment: string }> = {};
  const regionalMap: Record<string, number> = {};

  let totalDatasetSales = 0;
  let totalPhevSales = 0;

  // Process rows
  for (const r of filteredRows) {
    const rawDim = r[dimKey];
    const brandName = rawDim !== null && rawDim !== undefined && String(rawDim).trim() !== ''
      ? String(rawDim).trim()
      : 'Autres';

    // Compute sales:
    // If specific period is selected, only that column is summed
    // If wide format (2026-01, 2026-02...), sum all period columns
    // Else, use primaryMetricCol
    let rowSales = 0;
    if (periodColKey) {
      rowSales = parseNumber(r[periodColKey]) || 0;
    } else if (plan.isWideTemporalFormat && plan.temporalMetricCols.length > 0) {
      for (const tCol of plan.temporalMetricCols) {
        const num = parseNumber(r[tCol]) || 0;
        rowSales += num;
        // Also populate temporalMap directly from column header
        const periodHeader = profiles.find((p) => p.columnKey === tCol)?.originalHeader || tCol;
        temporalMap[periodHeader] = (temporalMap[periodHeader] || 0) + num;
      }
    } else {
      const parsed = parseNumber(r[plan.primaryMetricCol]);
      rowSales = parsed !== null ? parsed : 1;
      if (dateKey && r[dateKey]) {
        const tVal = String(r[dateKey]).trim();
        temporalMap[tVal] = (temporalMap[tVal] || 0) + rowSales;
      }
    }

    let phevSales = 0;
    if (phevKey) {
      phevSales = parseNumber(r[phevKey]) || 0;
    }

    if (!brandMap[brandName]) {
      brandMap[brandName] = {
        sales: 0,
        phevSales: 0,
        models: {},
        segments: {},
        regions: {},
      };
    }

    brandMap[brandName].sales += rowSales;
    brandMap[brandName].phevSales += phevSales;
    totalDatasetSales += rowSales;
    totalPhevSales += phevSales;

    // Model aggregation
    const mName = modelKey && r[modelKey] ? String(r[modelKey]).trim() : '';
    const segName = segmentKey && r[segmentKey] ? String(r[segmentKey]).trim() : '';

    if (mName) {
      brandMap[brandName].models[mName] = (brandMap[brandName].models[mName] || 0) + rowSales;
      if (!modelOverallMap[mName]) {
        modelOverallMap[mName] = { brand: brandName, sales: 0, segment: segName };
      }
      modelOverallMap[mName].sales += rowSales;
    }

    if (segName) {
      brandMap[brandName].segments[segName] = (brandMap[brandName].segments[segName] || 0) + rowSales;
      segmentMap[segName] = (segmentMap[segName] || 0) + rowSales;
    }

    if (geoKey && r[geoKey]) {
      const gVal = String(r[geoKey]).trim();
      brandMap[brandName].regions[gVal] = (brandMap[brandName].regions[gVal] || 0) + rowSales;
      regionalMap[gVal] = (regionalMap[gVal] || 0) + rowSales;
    }
  }

  // Sorted Brands
  const sortedBrands = Object.entries(brandMap)
    .map(([brand, data], idx) => {
      const isOmoda = /omoda|jaecoo/i.test(brand);
      const marketShare = totalDatasetSales > 0 ? Number(((data.sales / totalDatasetSales) * 100).toFixed(2)) : 0;
      const phevShare = totalPhevSales > 0 ? Number(((data.phevSales / totalPhevSales) * 100).toFixed(2)) : 0;

      return {
        brand,
        rank: idx + 1,
        sales: data.sales,
        phevSales: data.phevSales,
        marketShare,
        phevShare,
        isOmoda,
        modelsCount: Object.keys(data.models).length,
      };
    })
    .sort((a, b) => b.sales - a.sales);

  sortedBrands.forEach((b, i) => {
    b.rank = i + 1;
  });

  const leader = sortedBrands[0] || { brand: 'Aucun', sales: 0, marketShare: 0, rank: 1 };
  const lowest = sortedBrands[sortedBrands.length - 1] || leader;
  const omodaItem = sortedBrands.find((b) => b.isOmoda) || {
    brand: leader.brand,
    sales: leader.sales,
    marketShare: leader.marketShare,
    rank: leader.rank,
    phevSales: 0,
    phevShare: 0,
  };

  // Chronological evolution curve
  let timeEvolution: Array<{ month: string; value1: number; value2?: number }> = [];
  if (Object.keys(temporalMap).length > 0) {
    timeEvolution = Object.entries(temporalMap)
      .map(([period, val]) => ({
        month: period,
        value1: val,
      }));
  } else {
    timeEvolution = sortedBrands.slice(0, 7).map((b) => ({
      month: b.brand,
      value1: b.sales,
      value2: b.phevSales > 0 ? b.phevSales : undefined,
    }));
  }

  // Segments breakdown
  const segmentsBreakdown = Object.entries(segmentMap)
    .map(([segment, sales]) => ({
      name: segment,
      count: sales,
      percentage: totalDatasetSales > 0 ? Number(((sales / totalDatasetSales) * 100).toFixed(1)) : 0,
    }))
    .sort((a, b) => b.count - a.count);

  // Top Models
  const topModels = Object.entries(modelOverallMap)
    .map(([model, data], idx) => ({
      rank: idx + 1,
      name: model,
      brand: data.brand,
      segment: data.segment,
      salesCount: data.sales,
      share: totalDatasetSales > 0 ? `${((data.sales / totalDatasetSales) * 100).toFixed(1)}%` : '0%',
    }))
    .sort((a, b) => b.salesCount - a.salesCount)
    .slice(0, 25);

  topModels.forEach((m, idx) => {
    m.rank = idx + 1;
  });

  return {
    profiles,
    plan,
    totalFilteredRows: filteredRows.length,
    totalRawRows: rawRows.length,
    kpis: {
      totalMarketSales: totalDatasetSales,
      totalPhevSales,
      totalBrands: sortedBrands.length,
      leader,
      lowest,
      omodaJaecoo: omodaItem,
    },
    brandsRanking: sortedBrands,
    brandMap,
    timeEvolution,
    segmentsBreakdown,
    topModels,
    availableFilterOptions,
    availablePeriods: plan.temporalMetricCols.map((k) => {
      const prof = profiles.find((p) => p.columnKey === k);
      return prof?.originalHeader || k;
    }),
  };
}
