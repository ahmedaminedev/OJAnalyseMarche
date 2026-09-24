import { ObjectId } from 'mongodb';
import {
  DatasetDocument,
  DatasetColumn,
  ColumnType,
} from '../types/dataset';
import {
  QueryRequest,
  FilterGroup,
  FilterCondition,
  FilterOperator,
  GroupByField,
  MeasureField,
  SortField,
  DateGranularity,
} from '../types/query';

export class QueryValidationError extends Error {
  public statusCode: number;

  constructor(message: string, statusCode: number = 400) {
    super(message);
    this.name = 'QueryValidationError';
    this.statusCode = statusCode;
  }
}

export const ALLOWED_OPERATORS_BY_TYPE: Record<ColumnType, Set<FilterOperator>> = {
  string: new Set([
    'in',
    'nin',
    'eq',
    'neq',
    'contains',
    'startsWith',
    'endsWith',
    'isEmpty',
    'isNotEmpty',
  ]),
  number: new Set([
    'eq',
    'neq',
    'gt',
    'gte',
    'lt',
    'lte',
    'between',
    'isEmpty',
    'isNotEmpty',
  ]),
  date: new Set([
    'eq',
    'before',
    'after',
    'between',
    'isEmpty',
    'isNotEmpty',
  ]),
  boolean: new Set(['eq']),
};

export const MAX_FILTER_DEPTH = 5;
export const MAX_FILTER_CONDITIONS = 50;
export const MAX_LIMIT = 10000;
export const DEFAULT_LIMIT = 1000;

/**
 * Escapes characters with special meaning in Regular Expressions
 */
export function escapeRegex(str: string): string {
  if (typeof str !== 'string') return '';
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Validates a field name for injection vulnerabilities and whitelists against dataset columns
 */
export function validateFieldName(
  field: string,
  columnsMap: Map<string, DatasetColumn>,
  context: string = 'requête'
): DatasetColumn {
  if (!field || typeof field !== 'string') {
    throw new QueryValidationError(`Nom de champ invalide dans le contexte '${context}'.`);
  }

  // Prevent MongoDB injection operators or nested path traversal
  if (field.startsWith('$') || field.includes('.') || /[\0\r\n\t]/.test(field)) {
    throw new QueryValidationError(
      `Caractères non autorisés détectés dans le champ '${field}'.`
    );
  }

  const column = columnsMap.get(field);
  if (!column) {
    throw new QueryValidationError(
      `La colonne '${field}' n'existe pas dans le jeu de données.`
    );
  }

  return column;
}

/**
 * Recursively validates and counts filter conditions and verifies depth
 */
function validateFilterGroup(
  group: FilterGroup,
  columnsMap: Map<string, DatasetColumn>,
  currentDepth: number = 1
): number {
  if (currentDepth > MAX_FILTER_DEPTH) {
    throw new QueryValidationError(
      `Profondeur maximale de filtres dépassée (maximum ${MAX_FILTER_DEPTH} niveaux autorisés).`
    );
  }

  if (!group || typeof group !== 'object') {
    throw new QueryValidationError('Structure de groupe de filtres invalide.');
  }

  if (group.logic !== 'AND' && group.logic !== 'OR') {
    throw new QueryValidationError(
      `Logique de filtre invalide '${(group as any).logic}'. Valeurs autorisées: 'AND', 'OR'.`
    );
  }

  if (!Array.isArray(group.conditions)) {
    throw new QueryValidationError('La liste de conditions du filtre doit être un tableau.');
  }

  let conditionsCount = 0;

  for (const item of group.conditions) {
    if (!item || typeof item !== 'object') {
      throw new QueryValidationError('Condition de filtre invalide.');
    }

    if ('logic' in item) {
      // Nested FilterGroup
      conditionsCount += validateFilterGroup(item as FilterGroup, columnsMap, currentDepth + 1);
    } else {
      // FilterCondition
      const cond = item as FilterCondition;
      const column = validateFieldName(cond.field, columnsMap, 'filtre');

      const allowedOps = ALLOWED_OPERATORS_BY_TYPE[column.type];
      if (!allowedOps || !allowedOps.has(cond.op)) {
        throw new QueryValidationError(
          `L'opérateur '${cond.op}' n'est pas autorisé pour la colonne '${cond.field}' de type '${column.type}'.`
        );
      }

      // Value validation per operator
      if (cond.op === 'in' || cond.op === 'nin') {
        if (!Array.isArray(cond.value)) {
          throw new QueryValidationError(
            `La valeur de l'opérateur '${cond.op}' sur le champ '${cond.field}' doit être un tableau.`
          );
        }
      } else if (cond.op === 'between') {
        if (
          !Array.isArray(cond.value) ||
          cond.value.length < 2 ||
          cond.value[0] === undefined ||
          cond.value[1] === undefined
        ) {
          throw new QueryValidationError(
            `La valeur de l'opérateur 'between' sur le champ '${cond.field}' doit être un tableau de 2 éléments [min, max].`
          );
        }
      }

      conditionsCount += 1;
    }
  }

  return conditionsCount;
}

/**
 * Translates a single filter condition into a MongoDB filter object
 */
export function translateConditionToMongo(
  cond: FilterCondition,
  column: DatasetColumn
): Record<string, any> {
  const fieldPath = `data.${column.key}`;
  const op = cond.op;
  const val = cond.value;

  // STRING operators
  if (column.type === 'string') {
    switch (op) {
      case 'in':
        return {
          [fieldPath]: {
            $in: Array.isArray(val) ? val.map((v) => (v != null ? String(v) : null)) : [String(val)],
          },
        };
      case 'nin':
        return {
          [fieldPath]: {
            $nin: Array.isArray(val) ? val.map((v) => (v != null ? String(v) : null)) : [String(val)],
          },
        };
      case 'eq':
        return { [fieldPath]: { $eq: val != null ? String(val) : null } };
      case 'neq':
        return { [fieldPath]: { $ne: val != null ? String(val) : null } };
      case 'contains':
        return { [fieldPath]: { $regex: escapeRegex(String(val ?? '')), $options: 'i' } };
      case 'startsWith':
        return { [fieldPath]: { $regex: `^${escapeRegex(String(val ?? ''))}`, $options: 'i' } };
      case 'endsWith':
        return { [fieldPath]: { $regex: `${escapeRegex(String(val ?? ''))}$`, $options: 'i' } };
      case 'isEmpty':
        return {
          $or: [{ [fieldPath]: null }, { [fieldPath]: '' }, { [fieldPath]: { $exists: false } }],
        };
      case 'isNotEmpty':
        return {
          $and: [{ [fieldPath]: { $ne: null } }, { [fieldPath]: { $ne: '' } }],
        };
      default:
        throw new QueryValidationError(`Opérateur '${op}' non supporté pour les chaînes.`);
    }
  }

  // NUMBER operators
  if (column.type === 'number') {
    switch (op) {
      case 'eq':
        return { [fieldPath]: { $eq: Number(val) } };
      case 'neq':
        return { [fieldPath]: { $ne: Number(val) } };
      case 'gt':
        return { [fieldPath]: { $gt: Number(val) } };
      case 'gte':
        return { [fieldPath]: { $gte: Number(val) } };
      case 'lt':
        return { [fieldPath]: { $lt: Number(val) } };
      case 'lte':
        return { [fieldPath]: { $lte: Number(val) } };
      case 'between': {
        const minVal = Number(Array.isArray(val) ? val[0] : (val as any)?.min);
        const maxVal = Number(Array.isArray(val) ? val[1] : (val as any)?.max);
        return { [fieldPath]: { $gte: minVal, $lte: maxVal } };
      }
      case 'isEmpty':
        return {
          $or: [{ [fieldPath]: null }, { [fieldPath]: { $exists: false } }],
        };
      case 'isNotEmpty':
        return { [fieldPath]: { $ne: null } };
      default:
        throw new QueryValidationError(`Opérateur '${op}' non supporté pour les nombres.`);
    }
  }

  // DATE operators
  if (column.type === 'date') {
    switch (op) {
      case 'eq': {
        const rawDate = val instanceof Date ? val : new Date(val);
        if (isNaN(rawDate.getTime())) {
          throw new QueryValidationError(`Date invalide '${val}' pour le filtre 'eq'.`);
        }
        // Match 24-hour UTC window for date equality
        const start = new Date(rawDate);
        start.setUTCHours(0, 0, 0, 0);
        const end = new Date(rawDate);
        end.setUTCHours(23, 59, 59, 999);
        return { [fieldPath]: { $gte: start, $lte: end } };
      }
      case 'before': {
        const d = val instanceof Date ? val : new Date(val);
        if (isNaN(d.getTime())) {
          throw new QueryValidationError(`Date invalide '${val}' pour le filtre 'before'.`);
        }
        return { [fieldPath]: { $lt: d } };
      }
      case 'after': {
        const d = val instanceof Date ? val : new Date(val);
        if (isNaN(d.getTime())) {
          throw new QueryValidationError(`Date invalide '${val}' pour le filtre 'after'.`);
        }
        return { [fieldPath]: { $gt: d } };
      }
      case 'between': {
        const minD = new Date(Array.isArray(val) ? val[0] : (val as any)?.start);
        const maxD = new Date(Array.isArray(val) ? val[1] : (val as any)?.end);
        if (isNaN(minD.getTime()) || isNaN(maxD.getTime())) {
          throw new QueryValidationError(`Dates invalides pour le filtre 'between'.`);
        }
        return { [fieldPath]: { $gte: minD, $lte: maxD } };
      }
      case 'isEmpty':
        return {
          $or: [{ [fieldPath]: null }, { [fieldPath]: { $exists: false } }],
        };
      case 'isNotEmpty':
        return { [fieldPath]: { $ne: null } };
      default:
        throw new QueryValidationError(`Opérateur '${op}' non supporté pour les dates.`);
    }
  }

  // BOOLEAN operators
  if (column.type === 'boolean') {
    if (op === 'eq') {
      const boolVal = val === true || val === 'true' || val === 1;
      return { [fieldPath]: { $eq: boolVal } };
    }
    throw new QueryValidationError(`Opérateur '${op}' non supporté pour les booléens.`);
  }

  throw new QueryValidationError(`Type de colonne '${column.type}' non reconnu.`);
}

/**
 * Recursively converts a FilterGroup tree into a MongoDB query expression
 */
export function translateFilterGroupToMongo(
  group: FilterGroup,
  columnsMap: Map<string, DatasetColumn>
): Record<string, any> | null {
  if (!group || !Array.isArray(group.conditions) || group.conditions.length === 0) {
    return null;
  }

  const subQueries: Record<string, any>[] = [];

  for (const item of group.conditions) {
    if ('logic' in item) {
      const nested = translateFilterGroupToMongo(item as FilterGroup, columnsMap);
      if (nested && Object.keys(nested).length > 0) {
        subQueries.push(nested);
      }
    } else {
      const cond = item as FilterCondition;
      const col = columnsMap.get(cond.field);
      if (col) {
        const mongoCond = translateConditionToMongo(cond, col);
        subQueries.push(mongoCond);
      }
    }
  }

  if (subQueries.length === 0) return null;
  if (subQueries.length === 1) return subQueries[0];

  const logicKey = group.logic === 'OR' ? '$or' : '$and';
  return { [logicKey]: subQueries };
}

/**
 * Removes conditions targeting a specific column key from a FilterGroup
 * (Used for cascading facets where the facet should not filter out its own values)
 */
export function filterOutColumnConditions(
  group: FilterGroup | undefined,
  targetColumnKey: string
): FilterGroup | undefined {
  if (!group || !Array.isArray(group.conditions) || group.conditions.length === 0) {
    return undefined;
  }

  const newConditions: Array<FilterCondition | FilterGroup> = [];

  for (const item of group.conditions) {
    if ('logic' in item) {
      const cleanedSub = filterOutColumnConditions(item as FilterGroup, targetColumnKey);
      if (cleanedSub && cleanedSub.conditions.length > 0) {
        newConditions.push(cleanedSub);
      }
    } else {
      const cond = item as FilterCondition;
      if (cond.field !== targetColumnKey) {
        newConditions.push(cond);
      }
    }
  }

  if (newConditions.length === 0) return undefined;
  return { logic: group.logic, conditions: newConditions };
}

/**
 * Helper to build Date granularity aggregation expressions
 */
export function buildDateGranularityExpression(
  fieldPath: string,
  granularity: DateGranularity
): Record<string, any> {
  switch (granularity) {
    case 'year':
      return { $dateToString: { format: '%Y', date: fieldPath } };
    case 'quarter':
      return {
        $concat: [
          { $dateToString: { format: '%Y', date: fieldPath } },
          '-Q',
          {
            $toString: {
              $ceil: { $divide: [{ $month: fieldPath }, 3] },
            },
          },
        ],
      };
    case 'month':
      return { $dateToString: { format: '%Y-%m', date: fieldPath } };
    case 'week':
      return { $dateToString: { format: '%Y-W%V', date: fieldPath } };
    case 'day':
      return { $dateToString: { format: '%Y-%m-%d', date: fieldPath } };
    default:
      return { $dateToString: { format: '%Y-%m-%d', date: fieldPath } };
  }
}

/**
 * Builds the complete, secure MongoDB aggregation pipeline for a dataset query
 */
export function buildQueryPipeline(
  dataset: DatasetDocument,
  request: QueryRequest
): { pipeline: any[]; normalizedRequest: QueryRequest } {
  const columnsMap = new Map<string, DatasetColumn>();
  for (const col of dataset.columns) {
    columnsMap.set(col.key, col);
  }

  // 1. Validate Filters
  if (request.filters) {
    const totalConditions = validateFilterGroup(request.filters, columnsMap, 1);
    if (totalConditions > MAX_FILTER_CONDITIONS) {
      throw new QueryValidationError(
        `Nombre maximum de conditions de filtre dépassé (${totalConditions} > max ${MAX_FILTER_CONDITIONS}).`
      );
    }
  }

  // 2. Validate GroupBy
  const groupByFields: GroupByField[] = [];
  if (Array.isArray(request.groupBy)) {
    for (const gb of request.groupBy) {
      const column = validateFieldName(gb.field, columnsMap, 'groupBy');
      if (gb.granularity) {
        if (column.type !== 'date') {
          throw new QueryValidationError(
            `La granularité temporelle '${gb.granularity}' n'est applicable que sur une colonne de type 'date' (reçu: '${column.type}' pour '${gb.field}').`
          );
        }
        const validGranularities = ['day', 'week', 'month', 'quarter', 'year'];
        if (!validGranularities.includes(gb.granularity)) {
          throw new QueryValidationError(
            `Granularité invalide '${gb.granularity}'. Valeurs autorisées: ${validGranularities.join(', ')}.`
          );
        }
      }
      groupByFields.push({ field: gb.field, granularity: gb.granularity });
    }
  }

  // 3. Validate Measures
  const measuresList: MeasureField[] = [];
  const definedAliases = new Set<string>();

  if (Array.isArray(request.measures)) {
    for (const m of request.measures) {
      const column = validateFieldName(m.field, columnsMap, 'measures');
      const validAggs = ['sum', 'avg', 'min', 'max', 'count', 'countDistinct'];
      if (!validAggs.includes(m.agg)) {
        throw new QueryValidationError(
          `Fonction d'agrégation invalide '${m.agg}'. Valeurs autorisées: ${validAggs.join(', ')}.`
        );
      }

      // Statistical sums and averages require number type
      if ((m.agg === 'sum' || m.agg === 'avg') && column.type !== 'number') {
        throw new QueryValidationError(
          `L'agrégation '${m.agg}' nécessite une colonne numérique (reçu '${column.type}' pour '${m.field}').`
        );
      }

      const alias = m.alias?.trim() || `${m.agg}_${m.field}`;
      if (definedAliases.has(alias)) {
        throw new QueryValidationError(`L'alias de mesure '${alias}' est dupliqué.`);
      }
      definedAliases.add(alias);

      measuresList.push({ field: m.field, agg: m.agg, alias });
    }
  }

  // If no measures and no groupBy are provided, default to count(*)
  if (measuresList.length === 0 && groupByFields.length === 0) {
    measuresList.push({ field: dataset.columns[0]?.key || '_id', agg: 'count', alias: 'total_count' });
    definedAliases.add('total_count');
  }

  // 4. Validate Sort
  const sortFields: SortField[] = [];
  if (Array.isArray(request.sort)) {
    for (const s of request.sort) {
      const dir = s.dir === 'desc' ? 'desc' : 'asc';
      // Field must exist either in dataset.columns OR in measure aliases OR in groupBy fields
      const isColumn = columnsMap.has(s.field);
      const isAlias = definedAliases.has(s.field);
      const isGroupBy = groupByFields.some((g) => g.field === s.field);

      if (!isColumn && !isAlias && !isGroupBy) {
        throw new QueryValidationError(
          `Le champ de tri '${s.field}' n'existe ni dans les colonnes ni dans les alias de mesures.`
        );
      }
      sortFields.push({ field: s.field, dir });
    }
  }

  // 5. Validate Share & Compare
  if (request.share) {
    if (!request.share.of) {
      throw new QueryValidationError(`Le paramètre share.of est obligatoire.`);
    }
    const targetMeasure = measuresList.find((m) => m.alias === request.share!.of || m.field === request.share!.of);
    if (!targetMeasure) {
      throw new QueryValidationError(
        `La mesure '${request.share.of}' demandée dans 'share' n'est pas présente dans les mesures de la requête.`
      );
    }
    if (request.share.within) {
      for (const w of request.share.within) {
        validateFieldName(w, columnsMap, 'share.within');
      }
    }
  }

  // 6. Validate Limit
  const limit = Math.min(
    Math.max(1, typeof request.limit === 'number' && !isNaN(request.limit) ? request.limit : DEFAULT_LIMIT),
    MAX_LIMIT
  );

  // BUILD PIPELINE
  const pipeline: any[] = [];

  // STAGE 1: Match by datasetId first (CRITICAL rule #5) + User Filters
  const datasetObjectId =
    dataset._id instanceof ObjectId ? dataset._id : new ObjectId(String(dataset._id));
  const baseMatch: Record<string, any> = {
    datasetId: datasetObjectId,
  };

  if (request.filters) {
    const filterMongo = translateFilterGroupToMongo(request.filters, columnsMap);
    if (filterMongo) {
      Object.assign(baseMatch, filterMongo);
    }
  }

  pipeline.push({ $match: baseMatch });

  // STAGE 2: Grouping & Aggregating
  const groupStage: Record<string, any> = {};

  if (groupByFields.length > 0) {
    const groupKeyObj: Record<string, any> = {};
    for (const gb of groupByFields) {
      const fieldPath = `$data.${gb.field}`;
      if (gb.granularity) {
        groupKeyObj[gb.field] = buildDateGranularityExpression(fieldPath, gb.granularity);
      } else {
        groupKeyObj[gb.field] = fieldPath;
      }
    }
    groupStage._id = groupKeyObj;
  } else {
    groupStage._id = null;
  }

  const hasCountDistinct = measuresList.some((m) => m.agg === 'countDistinct');

  for (const m of measuresList) {
    const alias = m.alias!;
    const fieldPath = `$data.${m.field}`;

    switch (m.agg) {
      case 'sum':
        groupStage[alias] = { $sum: fieldPath };
        break;
      case 'avg':
        groupStage[alias] = { $avg: fieldPath };
        break;
      case 'min':
        groupStage[alias] = { $min: fieldPath };
        break;
      case 'max':
        groupStage[alias] = { $max: fieldPath };
        break;
      case 'count':
        groupStage[alias] = {
          $sum: { $cond: [{ $ifNull: [fieldPath, false] }, 1, 0] },
        };
        break;
      case 'countDistinct':
        groupStage[`${alias}_set`] = { $addToSet: fieldPath };
        break;
    }
  }

  pipeline.push({ $group: groupStage });

  // STAGE 3: Project to flatten group keys and calculate countDistinct sizes
  const projectStage: Record<string, any> = { _id: 0 };

  if (groupByFields.length > 0) {
    for (const gb of groupByFields) {
      projectStage[gb.field] = `$_id.${gb.field}`;
    }
  }

  for (const m of measuresList) {
    const alias = m.alias!;
    if (m.agg === 'countDistinct') {
      projectStage[alias] = {
        $size: {
          $filter: {
            input: `$${alias}_set`,
            as: 'val',
            cond: { $ne: ['$$val', null] },
          },
        },
      };
    } else {
      projectStage[alias] = 1;
    }
  }

  pipeline.push({ $project: projectStage });

  // STAGE 4: Sort
  if (sortFields.length > 0) {
    const sortStage: Record<string, 1 | -1> = {};
    for (const s of sortFields) {
      sortStage[s.field] = s.dir === 'desc' ? -1 : 1;
    }
    pipeline.push({ $sort: sortStage });
  }

  // STAGE 5: Limit
  pipeline.push({ $limit: limit });

  const normalizedRequest: QueryRequest = {
    filters: request.filters,
    groupBy: groupByFields,
    measures: measuresList,
    sort: sortFields,
    limit,
    compare: request.compare,
    share: request.share,
  };

  return { pipeline, normalizedRequest };
}

/**
 * Builds dynamic $facet pipeline for cascading dimension facets and min/max ranges
 */
export function buildFacetsPipeline(
  dataset: DatasetDocument,
  activeFilters?: FilterGroup
): any[] {
  const columnsMap = new Map<string, DatasetColumn>();
  for (const col of dataset.columns) {
    columnsMap.set(col.key, col);
  }

  const datasetObjectId =
    dataset._id instanceof ObjectId ? dataset._id : new ObjectId(String(dataset._id));

  const facetObj: Record<string, any[]> = {};

  for (const col of dataset.columns) {
    if (col.role === 'ignored') continue;

    // Filter cascade: remove conditions targeting this column
    const cascadeFilters = filterOutColumnConditions(activeFilters, col.key);
    const subMatch: Record<string, any> = { datasetId: datasetObjectId };

    if (cascadeFilters) {
      const mongoFilter = translateFilterGroupToMongo(cascadeFilters, columnsMap);
      if (mongoFilter) {
        Object.assign(subMatch, mongoFilter);
      }
    }

    if (col.type === 'string' || col.type === 'boolean' || col.role === 'dimension') {
      facetObj[col.key] = [
        { $match: subMatch },
        { $match: { [`data.${col.key}`]: { $ne: null } } },
        {
          $group: {
            _id: `$data.${col.key}`,
            count: { $sum: 1 },
          },
        },
        { $sort: { count: -1, _id: 1 } },
        { $limit: 100 },
        {
          $project: {
            _id: 0,
            value: '$_id',
            count: 1,
          },
        },
      ];
    } else if (col.type === 'number' || col.type === 'date' || col.role === 'measure') {
      facetObj[`${col.key}_range`] = [
        { $match: subMatch },
        {
          $group: {
            _id: null,
            min: { $min: `$data.${col.key}` },
            max: { $max: `$data.${col.key}` },
            nullCount: {
              $sum: { $cond: [{ $eq: [`$data.${col.key}`, null] }, 1, 0] },
            },
          },
        },
        {
          $project: {
            _id: 0,
            min: 1,
            max: 1,
            nullCount: 1,
          },
        },
      ];
    }
  }

  return [
    { $match: { datasetId: datasetObjectId } },
    { $facet: facetObj },
  ];
}
