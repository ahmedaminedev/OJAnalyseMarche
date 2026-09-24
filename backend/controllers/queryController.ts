import { Request, Response } from 'express';
import { ObjectId } from 'mongodb';
import * as XLSX from 'xlsx';
import {
  getDb,
  getDatasetsCollection,
  getRowsCollection,
  isMongoConnected,
} from '../config/db';
import { DatasetDocument, DatasetColumn } from '../types/dataset';
import {
  QueryRequest,
  QueryResult,
  FacetsResponse,
  DimensionFacet,
  RangeFacet,
  MultiDatasetQueryRequest,
  MultiDatasetQueryResult,
  FilterGroup,
} from '../types/query';
import {
  buildQueryPipeline,
  buildFacetsPipeline,
  validateFieldName,
  escapeRegex,
  QueryValidationError,
  MAX_LIMIT,
} from '../utils/pipelineBuilder';

function checkDatabaseAvailable(res: Response): boolean {
  if (!isMongoConnected()) {
    res.status(503).json({
      error: 'Service temporairement indisponible : la base de données MongoDB est déconnectée ou injoignable.',
      code: 'DATABASE_OFFLINE',
    });
    return false;
  }
  return true;
}

/**
 * Helper to retrieve a single dataset by ID or send 404
 */
async function findDataset(id: string, res: Response): Promise<DatasetDocument | null> {
  if (!id || !ObjectId.isValid(id)) {
    res.status(400).json({
      error: `Identifiant de jeu de données invalide : '${id}'.`,
      code: 'INVALID_ID',
    });
    return null;
  }

  const datasetsCol = getDatasetsCollection();
  const dataset = await datasetsCol.findOne({ _id: new ObjectId(id) });

  if (!dataset) {
    res.status(404).json({
      error: `Jeu de données introuvable (ID: ${id}).`,
      code: 'DATASET_NOT_FOUND',
    });
    return null;
  }

  return dataset;
}

/**
 * Calculates share (percentage of total / market share)
 */
function applyShareCalculation(
  data: Record<string, any>[],
  shareConfig: { of: string; within?: string[] }
): void {
  if (!data || data.length === 0) return;

  const targetField = shareConfig.of;
  const shareAlias = `${targetField}_share`;

  if (!shareConfig.within || shareConfig.within.length === 0) {
    // Grand total percentage
    const grandTotal = data.reduce((acc, row) => acc + (Number(row[targetField]) || 0), 0);
    for (const row of data) {
      const val = Number(row[targetField]) || 0;
      row[shareAlias] = grandTotal > 0 ? Number(((val / grandTotal) * 100).toFixed(2)) : 0;
    }
  } else {
    // Partitioned percentage (within specific fields)
    const partitionTotals = new Map<string, number>();

    for (const row of data) {
      const partitionKey = shareConfig.within.map((w) => String(row[w] ?? '')).join(':::');
      const val = Number(row[targetField]) || 0;
      partitionTotals.set(partitionKey, (partitionTotals.get(partitionKey) || 0) + val);
    }

    for (const row of data) {
      const partitionKey = shareConfig.within.map((w) => String(row[w] ?? '')).join(':::');
      const partitionTotal = partitionTotals.get(partitionKey) || 0;
      const val = Number(row[targetField]) || 0;
      row[shareAlias] =
        partitionTotal > 0 ? Number(((val / partitionTotal) * 100).toFixed(2)) : 0;
    }
  }
}

/**
 * Calculates period-over-period differences (compare option)
 */
function applyCompareCalculation(
  data: Record<string, any>[],
  measures: Array<{ field: string; agg: string; alias?: string }>
): void {
  if (!data || data.length < 2) return;

  for (const m of measures) {
    const alias = m.alias || `${m.agg}_${m.field}`;
    const diffAlias = `${alias}_diff`;
    const pctDiffAlias = `${alias}_pctDiff`;

    for (let i = 0; i < data.length; i++) {
      if (i === 0) {
        data[i][diffAlias] = null;
        data[i][pctDiffAlias] = null;
      } else {
        const currentVal = Number(data[i][alias]) || 0;
        const previousVal = Number(data[i - 1][alias]) || 0;
        const diff = currentVal - previousVal;
        const pctDiff =
          previousVal !== 0
            ? Number(((diff / Math.abs(previousVal)) * 100).toFixed(2))
            : null;

        data[i][diffAlias] = diff;
        data[i][pctDiffAlias] = pctDiff;
      }
    }
  }
}

/**
 * POST /api/datasets/:id/query
 * Generic analytics engine: executes validated aggregation pipeline on rows collection
 */
export async function executeDatasetQuery(req: Request, res: Response): Promise<void> {
  const startTime = Date.now();

  try {
    if (!checkDatabaseAvailable(res)) return;

    const dataset = await findDataset(req.params.id, res);
    if (!dataset) return;

    const queryRequest: QueryRequest = req.body || {};

    // 1. Build and validate pipeline
    const { pipeline, normalizedRequest } = buildQueryPipeline(dataset, queryRequest);

    // 2. Execute pipeline with safety bounds
    const rowsCol = getRowsCollection();
    const data = await rowsCol
      .aggregate(pipeline, {
        maxTimeMS: 30000,
        allowDiskUse: true,
      })
      .toArray();

    // 3. Post-process share (market share) if requested
    if (normalizedRequest.share) {
      applyShareCalculation(data, normalizedRequest.share);
    }

    // 4. Post-process compare (period-over-period variation) if requested
    if (normalizedRequest.compare && normalizedRequest.measures) {
      applyCompareCalculation(data, normalizedRequest.measures);
    }

    const executionTimeMs = Date.now() - startTime;

    const result: QueryResult = {
      data,
      meta: {
        executionTimeMs,
        rowCount: data.length,
        normalizedQuery: normalizedRequest,
      },
    };

    res.json(result);
  } catch (error: any) {
    if (error instanceof QueryValidationError) {
      res.status(error.statusCode).json({
        error: error.message,
        code: 'QUERY_VALIDATION_ERROR',
      });
      return;
    }

    console.error('Erreur exécution requête analytique:', error);
    res.status(500).json({
      error: error?.message || "Erreur interne lors de l'exécution de la requête.",
      code: 'QUERY_EXECUTION_ERROR',
    });
  }
}

/**
 * GET /api/datasets/:id/facets
 * Computes cascading dimension facets and min/max ranges under active filters
 */
export async function getDatasetFacets(req: Request, res: Response): Promise<void> {
  try {
    if (!checkDatabaseAvailable(res)) return;

    const dataset = await findDataset(req.params.id, res);
    if (!dataset) return;

    // Support filters passed via query string JSON or request body
    let activeFilters: FilterGroup | undefined = undefined;
    if (req.query.filters && typeof req.query.filters === 'string') {
      try {
        activeFilters = JSON.parse(req.query.filters);
      } catch {
        res.status(400).json({
          error: "Format de filtres JSON invalide dans le paramètre 'filters'.",
          code: 'INVALID_FILTERS_JSON',
        });
        return;
      }
    } else if (req.body && req.body.filters) {
      activeFilters = req.body.filters;
    }

    const pipeline = buildFacetsPipeline(dataset, activeFilters);
    const rowsCol = getRowsCollection();

    const aggResult = await rowsCol
      .aggregate(pipeline, {
        maxTimeMS: 30000,
        allowDiskUse: true,
      })
      .toArray();

    const rawFacets = aggResult[0] || {};
    const dimensions: Record<string, DimensionFacet> = {};
    const ranges: Record<string, RangeFacet> = {};

    for (const col of dataset.columns) {
      if (col.role === 'ignored') continue;

      if (col.type === 'string' || col.type === 'boolean' || col.role === 'dimension') {
        const rawValues = (rawFacets[col.key] as any[]) || [];
        dimensions[col.key] = {
          field: col.key,
          label: col.label,
          type: col.type === 'boolean' ? 'boolean' : 'string',
          values: rawValues.map((item) => ({
            value: item.value,
            count: item.count,
          })),
          totalDistinct: rawValues.length,
        };
      } else if (col.type === 'number' || col.type === 'date' || col.role === 'measure') {
        const rawRange = (rawFacets[`${col.key}_range`] as any[])?.[0];
        ranges[col.key] = {
          field: col.key,
          label: col.label,
          type: col.type === 'date' ? 'date' : 'number',
          min: rawRange ? rawRange.min : null,
          max: rawRange ? rawRange.max : null,
          nullCount: rawRange ? rawRange.nullCount : 0,
        };
      }
    }

    const response: FacetsResponse = {
      dimensions,
      ranges,
      activeFiltersCount: activeFilters?.conditions?.length || 0,
    };

    res.json(response);
  } catch (error: any) {
    if (error instanceof QueryValidationError) {
      res.status(error.statusCode).json({
        error: error.message,
        code: 'QUERY_VALIDATION_ERROR',
      });
      return;
    }

    console.error('Erreur récupération des facettes:', error);
    res.status(500).json({
      error: error?.message || 'Erreur interne lors du calcul des facettes.',
      code: 'FACETS_ERROR',
    });
  }
}

/**
 * GET /api/datasets/:id/columns/:key/values?q=&limit=50
 * Autocomplete for high cardinality columns
 */
export async function getColumnValues(req: Request, res: Response): Promise<void> {
  try {
    if (!checkDatabaseAvailable(res)) return;

    const dataset = await findDataset(req.params.id, res);
    if (!dataset) return;

    const columnKey = req.params.key;
    const column = dataset.columns.find((c) => c.key === columnKey);

    if (!column) {
      res.status(400).json({
        error: `La colonne '${columnKey}' n'existe pas dans ce jeu de données.`,
        code: 'COLUMN_NOT_FOUND',
      });
      return;
    }

    const searchQuery = typeof req.query.q === 'string' ? req.query.q.trim() : '';
    const limit = Math.min(
      Math.max(1, typeof req.query.limit === 'string' ? parseInt(req.query.limit, 10) || 50 : 50),
      200
    );

    const datasetObjectId =
      dataset._id instanceof ObjectId ? dataset._id : new ObjectId(String(dataset._id));
    const fieldPath = `data.${column.key}`;

    const matchStage: Record<string, any> = {
      datasetId: datasetObjectId,
      [fieldPath]: { $ne: null },
    };

    if (searchQuery) {
      matchStage[fieldPath] = {
        $regex: escapeRegex(searchQuery),
        $options: 'i',
      };
    }

    const pipeline = [
      { $match: matchStage },
      {
        $group: {
          _id: `$${fieldPath}`,
          count: { $sum: 1 },
        },
      },
      { $sort: { count: -1, _id: 1 } },
      { $limit: limit },
      {
        $project: {
          _id: 0,
          value: '$_id',
          count: 1,
        },
      },
    ];

    const rowsCol = getRowsCollection();
    const values = await rowsCol.aggregate(pipeline).toArray();

    res.json({
      column: column.key,
      label: column.label,
      type: column.type,
      values,
      total: values.length,
    });
  } catch (error: any) {
    console.error('Erreur autocomplétion colonne:', error);
    res.status(500).json({
      error: error?.message || "Erreur interne lors de l'autocomplétion.",
      code: 'AUTOCOMPLETE_ERROR',
    });
  }
}

/**
 * POST /api/datasets/:id/export
 * Exports query results as streaming Excel (.xlsx) or CSV
 */
export async function exportDatasetQuery(req: Request, res: Response): Promise<void> {
  try {
    if (!checkDatabaseAvailable(res)) return;

    const dataset = await findDataset(req.params.id, res);
    if (!dataset) return;

    const { format = 'xlsx', ...queryRequest } = req.body || {};
    const { pipeline, normalizedRequest } = buildQueryPipeline(dataset, queryRequest);

    // Remove the limit or expand it for export (up to MAX_LIMIT)
    const exportPipeline = pipeline.filter((stage) => !stage.$limit);
    exportPipeline.push({ $limit: MAX_LIMIT });

    const rowsCol = getRowsCollection();
    const data = await rowsCol
      .aggregate(exportPipeline, {
        maxTimeMS: 60000,
        allowDiskUse: true,
      })
      .toArray();

    if (normalizedRequest.share) {
      applyShareCalculation(data, normalizedRequest.share);
    }
    if (normalizedRequest.compare && normalizedRequest.measures) {
      applyCompareCalculation(data, normalizedRequest.measures);
    }

    const safeFilename = (dataset.name || dataset.fileName || 'export')
      .replace(/[^a-zA-Z0-9_\u00C0-\u017F-]/g, '_')
      .slice(0, 50);

    if (format === 'csv') {
      // Stream CSV with UTF-8 BOM and French standard semicolon delimiter
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${safeFilename}.csv"`);

      if (data.length === 0) {
        res.write('\uFEFFAucune donnée\n');
        res.end();
        return;
      }

      const headers = Object.keys(data[0]);
      let csvContent = '\uFEFF' + headers.map((h) => `"${h}"`).join(';') + '\n';

      for (const row of data) {
        const line = headers
          .map((h) => {
            const val = row[h];
            if (val === null || val === undefined) return '';
            if (val instanceof Date) return `"${val.toISOString().split('T')[0]}"`;
            const strVal = String(val).replace(/"/g, '""');
            return `"${strVal}"`;
          })
          .join(';');
        csvContent += line + '\n';
      }

      res.send(csvContent);
      return;
    }

    // Default: XLSX format
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Données');

    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader('Content-Disposition', `attachment; filename="${safeFilename}.xlsx"`);
    res.send(buffer);
  } catch (error: any) {
    if (error instanceof QueryValidationError) {
      res.status(error.statusCode).json({
        error: error.message,
        code: 'QUERY_VALIDATION_ERROR',
      });
      return;
    }

    console.error('Erreur export données:', error);
    res.status(500).json({
      error: error?.message || "Erreur interne lors de l'exportation.",
      code: 'EXPORT_ERROR',
    });
  }
}

/**
 * POST /api/query/multi
 * Compares multiple datasets via their confirmed semantic mappings
 */
export async function executeMultiDatasetQuery(req: Request, res: Response): Promise<void> {
  const startTime = Date.now();

  try {
    if (!checkDatabaseAvailable(res)) return;

    const {
      datasetIds,
      semanticFields,
      groupBy,
      measures,
      sort,
      limit,
    }: MultiDatasetQueryRequest = req.body || {};

    if (!Array.isArray(datasetIds) || datasetIds.length === 0) {
      res.status(400).json({
        error: "La liste 'datasetIds' doit contenir au moins un identifiant.",
        code: 'INVALID_DATASET_IDS',
      });
      return;
    }

    if (!Array.isArray(semanticFields) || semanticFields.length === 0) {
      res.status(400).json({
        error: "La liste 'semanticFields' doit contenir au moins un champ sémantique (ex: 'brand', 'volume').",
        code: 'INVALID_SEMANTIC_FIELDS',
      });
      return;
    }

    const datasetsCol = getDatasetsCollection();
    const objectIds = datasetIds.filter((id) => ObjectId.isValid(id)).map((id) => new ObjectId(id));

    if (objectIds.length !== datasetIds.length) {
      res.status(400).json({
        error: 'Un ou plusieurs identifiants de jeux de données sont invalides.',
        code: 'INVALID_ID',
      });
      return;
    }

    const datasets = await datasetsCol.find({ _id: { $in: objectIds } }).toArray();

    if (datasets.length !== datasetIds.length) {
      const foundIds = new Set(datasets.map((d) => d._id.toString()));
      const missing = datasetIds.filter((id) => !foundIds.has(id));
      res.status(404).json({
        error: `Jeux de données introuvables : ${missing.join(', ')}.`,
        code: 'DATASETS_NOT_FOUND',
      });
      return;
    }

    // Verify each dataset has the required semantic fields in dataset.mapping
    for (const d of datasets) {
      const mapping = d.mapping || {};
      for (const sf of semanticFields) {
        if (!mapping[sf]) {
          res.status(400).json({
            error: `Le champ sémantique '${sf}' n'est pas mappé dans le jeu de données '${d.name || d.fileName}'.`,
            code: 'SEMANTIC_FIELD_UNMAPPED',
            datasetId: d._id.toString(),
            semanticField: sf,
          });
          return;
        }
      }
    }

    // Execute query for each dataset by translating semantic fields to technical column keys
    const mergedData: Record<string, any>[] = [];

    for (const d of datasets) {
      const mapping = d.mapping || {};

      // Translate groupBy semantic fields
      const translatedGroupBy = groupBy?.map((gb) => ({
        field: mapping[gb.semanticField] || gb.semanticField,
        granularity: gb.granularity,
      }));

      // Translate measures semantic fields
      const translatedMeasures = measures?.map((m) => ({
        field: mapping[m.semanticField] || m.semanticField,
        agg: m.agg,
        alias: m.alias || `${m.agg}_${m.semanticField}`,
      }));

      const singleQuery: QueryRequest = {
        groupBy: translatedGroupBy,
        measures: translatedMeasures,
        sort,
        limit,
      };

      const { pipeline } = buildQueryPipeline(d, singleQuery);
      const rowsCol = getRowsCollection();

      const datasetRows = await rowsCol
        .aggregate(pipeline, { maxTimeMS: 30000, allowDiskUse: true })
        .toArray();

      for (const r of datasetRows) {
        // Remap technical keys back to requested semantic fields
        const formattedRow: Record<string, any> = {
          _datasetId: d._id.toString(),
          _datasetName: d.name || d.fileName,
        };

        if (groupBy) {
          for (const gb of groupBy) {
            const colKey = mapping[gb.semanticField];
            formattedRow[gb.semanticField] = (colKey && r[colKey] !== undefined) ? r[colKey] : r[gb.semanticField];
          }
        }

        if (measures) {
          for (const m of measures) {
            const alias = m.alias || `${m.agg}_${m.semanticField}`;
            formattedRow[alias] = r[alias];
          }
        }

        mergedData.push(formattedRow);
      }
    }

    const executionTimeMs = Date.now() - startTime;

    const result: MultiDatasetQueryResult = {
      data: mergedData,
      datasets: datasets.map((d) => ({
        id: d._id.toString(),
        name: d.name,
        fileName: d.fileName,
      })),
      meta: {
        executionTimeMs,
        totalDatasets: datasets.length,
        rowCount: mergedData.length,
      },
    };

    res.json(result);
  } catch (error: any) {
    if (error instanceof QueryValidationError) {
      res.status(error.statusCode).json({
        error: error.message,
        code: 'QUERY_VALIDATION_ERROR',
      });
      return;
    }

    console.error('Erreur comparaison multi-datasets:', error);
    res.status(500).json({
      error: error?.message || 'Erreur interne lors de la comparaison multi-datasets.',
      code: 'MULTI_QUERY_ERROR',
    });
  }
}
