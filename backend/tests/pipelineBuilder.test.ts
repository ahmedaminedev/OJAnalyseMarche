import { describe, it, expect } from 'vitest';
import { ObjectId } from 'mongodb';
import { DatasetDocument, DatasetColumn } from '../types/dataset';
import {
  buildQueryPipeline,
  buildFacetsPipeline,
  escapeRegex,
  QueryValidationError,
  filterOutColumnConditions,
} from '../utils/pipelineBuilder';
import { QueryRequest, FilterGroup } from '../types/query';

const mockDataset: DatasetDocument = {
  _id: new ObjectId('650000000000000000000001'),
  name: 'Ventes 2026',
  fileName: 'ventes_2026.xlsx',
  fileHash: 'a1b2c3d4e5f6',
  fileSizeBytes: 102400,
  sheetName: 'Données',
  importedAt: new Date('2026-01-01T00:00:00.000Z'),
  importedBy: 'user@example.com',
  status: 'SUCCESS',
  rowCount: 5000,
  columns: [
    {
      key: 'marque',
      label: 'Marque',
      type: 'string',
      role: 'dimension',
      nullCount: 0,
      distinctCount: 20,
    },
    {
      key: 'modele',
      label: 'Modèle',
      type: 'string',
      role: 'dimension',
      nullCount: 10,
      distinctCount: 150,
    },
    {
      key: 'ventes',
      label: 'Ventes (Unités)',
      type: 'number',
      role: 'measure',
      nullCount: 0,
      distinctCount: 500,
      min: 0,
      max: 1200,
    },
    {
      key: 'prix',
      label: 'Prix Moyen',
      type: 'number',
      role: 'measure',
      nullCount: 25,
      distinctCount: 300,
      min: 25000,
      max: 180000,
    },
    {
      key: 'date_vente',
      label: 'Date de Vente',
      type: 'date',
      role: 'date',
      nullCount: 0,
      distinctCount: 365,
    },
    {
      key: 'est_hybride',
      label: 'Véhicule Hybride',
      type: 'boolean',
      role: 'dimension',
      nullCount: 0,
      distinctCount: 2,
    },
  ],
};

describe('Moteur d’Analyse Générique - Constructeur de Pipeline', () => {
  // Test 1: Requête par défaut sans filtres
  it('1. Construit un pipeline par défaut avec $match par datasetId et comptage', () => {
    const { pipeline, normalizedRequest } = buildQueryPipeline(mockDataset, {});
    expect(pipeline).toHaveLength(4); // $match, $group, $project, $limit
    expect(pipeline[0].$match.datasetId).toEqual(mockDataset._id);
    expect(pipeline[1].$group).toBeDefined();
    expect(pipeline[3].$limit).toBe(1000);
    expect(normalizedRequest.limit).toBe(1000);
  });

  // Test 2: string 'in'
  it('2. Opérateur string "in"', () => {
    const req: QueryRequest = {
      filters: {
        logic: 'AND',
        conditions: [{ field: 'marque', op: 'in', value: ['Toyota', 'Hyundai'] }],
      },
    };
    const { pipeline } = buildQueryPipeline(mockDataset, req);
    expect(pipeline[0].$match['data.marque']).toEqual({ $in: ['Toyota', 'Hyundai'] });
  });

  // Test 3: string 'nin'
  it('3. Opérateur string "nin"', () => {
    const req: QueryRequest = {
      filters: {
        logic: 'AND',
        conditions: [{ field: 'marque', op: 'nin', value: ['Kia'] }],
      },
    };
    const { pipeline } = buildQueryPipeline(mockDataset, req);
    expect(pipeline[0].$match['data.marque']).toEqual({ $nin: ['Kia'] });
  });

  // Test 4: string 'eq'
  it('4. Opérateur string "eq"', () => {
    const req: QueryRequest = {
      filters: {
        logic: 'AND',
        conditions: [{ field: 'marque', op: 'eq', value: 'Omoda' }],
      },
    };
    const { pipeline } = buildQueryPipeline(mockDataset, req);
    expect(pipeline[0].$match['data.marque']).toEqual({ $eq: 'Omoda' });
  });

  // Test 5: string 'neq'
  it('5. Opérateur string "neq"', () => {
    const req: QueryRequest = {
      filters: {
        logic: 'AND',
        conditions: [{ field: 'marque', op: 'neq', value: 'Peugeot' }],
      },
    };
    const { pipeline } = buildQueryPipeline(mockDataset, req);
    expect(pipeline[0].$match['data.marque']).toEqual({ $ne: 'Peugeot' });
  });

  // Test 6: string 'contains' avec échappement regex
  it('6. Opérateur string "contains" avec échappement sécurisé de caractères regex', () => {
    const req: QueryRequest = {
      filters: {
        logic: 'AND',
        conditions: [{ field: 'modele', op: 'contains', value: 'C5 [Pro]+' }],
      },
    };
    const { pipeline } = buildQueryPipeline(mockDataset, req);
    expect(pipeline[0].$match['data.modele'].$regex).toBe('C5 \\[Pro\\]\\+');
    expect(pipeline[0].$match['data.modele'].$options).toBe('i');
  });

  // Test 7: string 'startsWith'
  it('7. Opérateur string "startsWith"', () => {
    const req: QueryRequest = {
      filters: {
        logic: 'AND',
        conditions: [{ field: 'modele', op: 'startsWith', value: 'JAECOO' }],
      },
    };
    const { pipeline } = buildQueryPipeline(mockDataset, req);
    expect(pipeline[0].$match['data.modele'].$regex).toBe('^JAECOO');
  });

  // Test 8: string 'endsWith'
  it('8. Opérateur string "endsWith"', () => {
    const req: QueryRequest = {
      filters: {
        logic: 'AND',
        conditions: [{ field: 'modele', op: 'endsWith', value: 'Pro' }],
      },
    };
    const { pipeline } = buildQueryPipeline(mockDataset, req);
    expect(pipeline[0].$match['data.modele'].$regex).toBe('Pro$');
  });

  // Test 9: string 'isEmpty'
  it('9. Opérateur string "isEmpty" (gère null, chaîne vide, non-défini)', () => {
    const req: QueryRequest = {
      filters: {
        logic: 'AND',
        conditions: [{ field: 'modele', op: 'isEmpty' }],
      },
    };
    const { pipeline } = buildQueryPipeline(mockDataset, req);
    expect(pipeline[0].$match.$or).toBeDefined();
    expect(pipeline[0].$match.$or).toContainEqual({ 'data.modele': null });
    expect(pipeline[0].$match.$or).toContainEqual({ 'data.modele': '' });
  });

  // Test 10: string 'isNotEmpty'
  it('10. Opérateur string "isNotEmpty"', () => {
    const req: QueryRequest = {
      filters: {
        logic: 'AND',
        conditions: [{ field: 'modele', op: 'isNotEmpty' }],
      },
    };
    const { pipeline } = buildQueryPipeline(mockDataset, req);
    expect(pipeline[0].$match.$and).toBeDefined();
    expect(pipeline[0].$match.$and).toContainEqual({ 'data.modele': { $ne: null } });
    expect(pipeline[0].$match.$and).toContainEqual({ 'data.modele': { $ne: '' } });
  });

  // Test 11: number 'eq'
  it('11. Opérateur number "eq"', () => {
    const req: QueryRequest = {
      filters: {
        logic: 'AND',
        conditions: [{ field: 'ventes', op: 'eq', value: 150 }],
      },
    };
    const { pipeline } = buildQueryPipeline(mockDataset, req);
    expect(pipeline[0].$match['data.ventes']).toEqual({ $eq: 150 });
  });

  // Test 12: number 'neq'
  it('12. Opérateur number "neq"', () => {
    const req: QueryRequest = {
      filters: {
        logic: 'AND',
        conditions: [{ field: 'ventes', op: 'neq', value: 0 }],
      },
    };
    const { pipeline } = buildQueryPipeline(mockDataset, req);
    expect(pipeline[0].$match['data.ventes']).toEqual({ $ne: 0 });
  });

  // Test 13: number 'gt'
  it('13. Opérateur number "gt"', () => {
    const req: QueryRequest = {
      filters: {
        logic: 'AND',
        conditions: [{ field: 'ventes', op: 'gt', value: 50 }],
      },
    };
    const { pipeline } = buildQueryPipeline(mockDataset, req);
    expect(pipeline[0].$match['data.ventes']).toEqual({ $gt: 50 });
  });

  // Test 14: number 'gte'
  it('14. Opérateur number "gte"', () => {
    const req: QueryRequest = {
      filters: {
        logic: 'AND',
        conditions: [{ field: 'ventes', op: 'gte', value: 100 }],
      },
    };
    const { pipeline } = buildQueryPipeline(mockDataset, req);
    expect(pipeline[0].$match['data.ventes']).toEqual({ $gte: 100 });
  });

  // Test 15: number 'lt'
  it('15. Opérateur number "lt"', () => {
    const req: QueryRequest = {
      filters: {
        logic: 'AND',
        conditions: [{ field: 'prix', op: 'lt', value: 50000 }],
      },
    };
    const { pipeline } = buildQueryPipeline(mockDataset, req);
    expect(pipeline[0].$match['data.prix']).toEqual({ $lt: 50000 });
  });

  // Test 16: number 'lte'
  it('16. Opérateur number "lte"', () => {
    const req: QueryRequest = {
      filters: {
        logic: 'AND',
        conditions: [{ field: 'prix', op: 'lte', value: 95000 }],
      },
    };
    const { pipeline } = buildQueryPipeline(mockDataset, req);
    expect(pipeline[0].$match['data.prix']).toEqual({ $lte: 95000 });
  });

  // Test 17: number 'between'
  it('17. Opérateur number "between" avec [min, max]', () => {
    const req: QueryRequest = {
      filters: {
        logic: 'AND',
        conditions: [{ field: 'ventes', op: 'between', value: [10, 500] }],
      },
    };
    const { pipeline } = buildQueryPipeline(mockDataset, req);
    expect(pipeline[0].$match['data.ventes']).toEqual({ $gte: 10, $lte: 500 });
  });

  // Test 18: number 'isEmpty'
  it('18. Opérateur number "isEmpty"', () => {
    const req: QueryRequest = {
      filters: {
        logic: 'AND',
        conditions: [{ field: 'prix', op: 'isEmpty' }],
      },
    };
    const { pipeline } = buildQueryPipeline(mockDataset, req);
    expect(pipeline[0].$match.$or).toContainEqual({ 'data.prix': null });
  });

  // Test 19: number 'isNotEmpty'
  it('19. Opérateur number "isNotEmpty"', () => {
    const req: QueryRequest = {
      filters: {
        logic: 'AND',
        conditions: [{ field: 'prix', op: 'isNotEmpty' }],
      },
    };
    const { pipeline } = buildQueryPipeline(mockDataset, req);
    expect(pipeline[0].$match['data.prix']).toEqual({ $ne: null });
  });

  // Test 20: date 'eq'
  it('20. Opérateur date "eq" (fenêtre UTC 24h)', () => {
    const req: QueryRequest = {
      filters: {
        logic: 'AND',
        conditions: [{ field: 'date_vente', op: 'eq', value: '2026-03-15' }],
      },
    };
    const { pipeline } = buildQueryPipeline(mockDataset, req);
    const dateMatch = pipeline[0].$match['data.date_vente'];
    expect(dateMatch.$gte).toBeInstanceOf(Date);
    expect(dateMatch.$lte).toBeInstanceOf(Date);
    expect(dateMatch.$gte.toISOString()).toContain('2026-03-15T00:00:00');
    expect(dateMatch.$lte.toISOString()).toContain('2026-03-15T23:59:59');
  });

  // Test 21: date 'before'
  it('21. Opérateur date "before"', () => {
    const req: QueryRequest = {
      filters: {
        logic: 'AND',
        conditions: [{ field: 'date_vente', op: 'before', value: '2026-06-01' }],
      },
    };
    const { pipeline } = buildQueryPipeline(mockDataset, req);
    expect(pipeline[0].$match['data.date_vente'].$lt).toBeInstanceOf(Date);
  });

  // Test 22: date 'after'
  it('22. Opérateur date "after"', () => {
    const req: QueryRequest = {
      filters: {
        logic: 'AND',
        conditions: [{ field: 'date_vente', op: 'after', value: '2026-01-01' }],
      },
    };
    const { pipeline } = buildQueryPipeline(mockDataset, req);
    expect(pipeline[0].$match['data.date_vente'].$gt).toBeInstanceOf(Date);
  });

  // Test 23: date 'between'
  it('23. Opérateur date "between"', () => {
    const req: QueryRequest = {
      filters: {
        logic: 'AND',
        conditions: [{ field: 'date_vente', op: 'between', value: ['2026-01-01', '2026-12-31'] }],
      },
    };
    const { pipeline } = buildQueryPipeline(mockDataset, req);
    expect(pipeline[0].$match['data.date_vente'].$gte).toBeInstanceOf(Date);
    expect(pipeline[0].$match['data.date_vente'].$lte).toBeInstanceOf(Date);
  });

  // Test 24: date 'isEmpty' et 'isNotEmpty'
  it('24. Opérateurs date "isEmpty" et "isNotEmpty"', () => {
    const reqEmpty: QueryRequest = {
      filters: { logic: 'AND', conditions: [{ field: 'date_vente', op: 'isEmpty' }] },
    };
    const { pipeline: p1 } = buildQueryPipeline(mockDataset, reqEmpty);
    expect(p1[0].$match.$or).toBeDefined();

    const reqNotEmpty: QueryRequest = {
      filters: { logic: 'AND', conditions: [{ field: 'date_vente', op: 'isNotEmpty' }] },
    };
    const { pipeline: p2 } = buildQueryPipeline(mockDataset, reqNotEmpty);
    expect(p2[0].$match['data.date_vente']).toEqual({ $ne: null });
  });

  // Test 25: boolean 'eq'
  it('25. Opérateur boolean "eq"', () => {
    const req: QueryRequest = {
      filters: {
        logic: 'AND',
        conditions: [{ field: 'est_hybride', op: 'eq', value: true }],
      },
    };
    const { pipeline } = buildQueryPipeline(mockDataset, req);
    expect(pipeline[0].$match['data.est_hybride']).toEqual({ $eq: true });
  });

  // Test 26: Groupes AND/OR imbriqués: (A AND B) OR (C AND D)
  it('26. Groupes AND / OR imbriqués', () => {
    const req: QueryRequest = {
      filters: {
        logic: 'OR',
        conditions: [
          {
            logic: 'AND',
            conditions: [
              { field: 'marque', op: 'eq', value: 'Omoda' },
              { field: 'ventes', op: 'gt', value: 100 },
            ],
          },
          {
            logic: 'AND',
            conditions: [
              { field: 'marque', op: 'eq', value: 'Jaecoo' },
              { field: 'est_hybride', op: 'eq', value: true },
            ],
          },
        ],
      },
    };
    const { pipeline } = buildQueryPipeline(mockDataset, req);
    expect(pipeline[0].$match.$or).toBeDefined();
    expect(pipeline[0].$match.$or).toHaveLength(2);
    expect(pipeline[0].$match.$or[0].$and).toBeDefined();
    expect(pipeline[0].$match.$or[1].$and).toBeDefined();
  });

  // Test 27: Rejet de profondeur > 5
  it('27. Sécurité: Rejette une profondeur de filtre > 5', () => {
    let deepFilter: any = { field: 'marque', op: 'eq', value: 'Test' };
    for (let i = 0; i < 6; i++) {
      deepFilter = { logic: 'AND', conditions: [deepFilter] };
    }

    expect(() => {
      buildQueryPipeline(mockDataset, { filters: deepFilter });
    }).toThrow(QueryValidationError);
  });

  // Test 28: Rejet de plus de 50 conditions
  it('28. Sécurité: Rejette plus de 50 conditions', () => {
    const conditions = Array.from({ length: 55 }).map((_, i) => ({
      field: 'ventes',
      op: 'gt' as const,
      value: i,
    }));

    expect(() => {
      buildQueryPipeline(mockDataset, { filters: { logic: 'AND', conditions } });
    }).toThrow(/Nombre maximum de conditions de filtre dépassé/);
  });

  // Test 29: Rejet d’opérateur non autorisé pour le type (ex: gt sur string)
  it('29. Sécurité: Rejette un opérateur incompatible avec le type (gt sur string)', () => {
    expect(() => {
      buildQueryPipeline(mockDataset, {
        filters: {
          logic: 'AND',
          conditions: [{ field: 'marque', op: 'gt', value: 10 }],
        },
      });
    }).toThrow(/n'est pas autorisé pour la colonne 'marque' de type 'string'/);
  });

  // Test 30: Rejet d’opérateur non autorisé pour le type (contains sur number)
  it('30. Sécurité: Rejette contains sur un champ number', () => {
    expect(() => {
      buildQueryPipeline(mockDataset, {
        filters: {
          logic: 'AND',
          conditions: [{ field: 'ventes', op: 'contains', value: '10' }],
        },
      });
    }).toThrow(/n'est pas autorisé pour la colonne 'ventes' de type 'number'/);
  });

  // Test 31: Rejet de champ inconnu (liste blanche)
  it('31. Sécurité: Rejette un champ inconnu non présent dans datasets.columns', () => {
    expect(() => {
      buildQueryPipeline(mockDataset, {
        filters: {
          logic: 'AND',
          conditions: [{ field: 'colonne_fantome', op: 'eq', value: 'xyz' }],
        },
      });
    }).toThrow(/n'existe pas dans le jeu de données/);
  });

  // Test 32: Rejet de tentative d’injection MongoDB ($where, $function, etc.)
  it('32. Sécurité: Bloque les clés injectant des opérateurs MongoDB ($where, $expr, path traversal)', () => {
    expect(() => {
      buildQueryPipeline(mockDataset, {
        filters: {
          logic: 'AND',
          conditions: [{ field: '$where', op: 'eq', value: '1==1' }],
        },
      });
    }).toThrow(QueryValidationError);

    expect(() => {
      buildQueryPipeline(mockDataset, {
        filters: {
          logic: 'AND',
          conditions: [{ field: 'marque.nom', op: 'eq', value: 'test' }],
        },
      });
    }).toThrow(QueryValidationError);
  });

  // Test 33: Échappement complet dans escapeRegex
  it('33. Sécurité: Échappe les métacaractères dans escapeRegex', () => {
    const raw = '.*+?^${}()|[]\\';
    const escaped = escapeRegex(raw);
    expect(escaped).toBe('\\.\\*\\+\\?\\^\\$\\{\\}\\(\\)\\|\\[\\]\\\\');
  });

  // Test 34: GroupBy simple
  it('34. GroupBy simple par marque', () => {
    const req: QueryRequest = {
      groupBy: [{ field: 'marque' }],
      measures: [{ field: 'ventes', agg: 'sum', alias: 'total_ventes' }],
    };
    const { pipeline } = buildQueryPipeline(mockDataset, req);
    expect(pipeline[1].$group._id).toEqual({ marque: '$data.marque' });
    expect(pipeline[1].$group.total_ventes).toEqual({ $sum: '$data.ventes' });
    expect(pipeline[2].$project.marque).toBe('$_id.marque');
    expect(pipeline[2].$project.total_ventes).toBe(1);
  });

  // Test 35: GroupBy avec granularité temporelle (month, year, quarter)
  it('35. GroupBy avec granularité date (month, quarter, year)', () => {
    const req: QueryRequest = {
      groupBy: [{ field: 'date_vente', granularity: 'month' }],
      measures: [{ field: 'ventes', agg: 'sum' }],
    };
    const { pipeline } = buildQueryPipeline(mockDataset, req);
    expect(pipeline[1].$group._id.date_vente.$dateToString.format).toBe('%Y-%m');

    const reqQuarter: QueryRequest = {
      groupBy: [{ field: 'date_vente', granularity: 'quarter' }],
      measures: [{ field: 'ventes', agg: 'sum' }],
    };
    const { pipeline: pQ } = buildQueryPipeline(mockDataset, reqQuarter);
    expect(pQ[1].$group._id.date_vente.$concat).toBeDefined();
  });

  // Test 36: Rejet de granularité sur colonne non-date
  it('36. Rejette la granularité date sur une colonne string ou number', () => {
    expect(() => {
      buildQueryPipeline(mockDataset, {
        groupBy: [{ field: 'marque', granularity: 'month' }],
      });
    }).toThrow(/n'est applicable que sur une colonne de type 'date'/);
  });

  // Test 37: Agrégations (sum, avg, min, max, count, countDistinct)
  it('37. Agrégations de mesures multiples incluant countDistinct', () => {
    const req: QueryRequest = {
      groupBy: [{ field: 'marque' }],
      measures: [
        { field: 'ventes', agg: 'sum', alias: 'sum_v' },
        { field: 'prix', agg: 'avg', alias: 'avg_p' },
        { field: 'ventes', agg: 'min', alias: 'min_v' },
        { field: 'ventes', agg: 'max', alias: 'max_v' },
        { field: 'modele', agg: 'countDistinct', alias: 'distinct_modeles' },
      ],
    };
    const { pipeline } = buildQueryPipeline(mockDataset, req);
    expect(pipeline[1].$group.sum_v).toEqual({ $sum: '$data.ventes' });
    expect(pipeline[1].$group.avg_p).toEqual({ $avg: '$data.prix' });
    expect(pipeline[1].$group.distinct_modeles_set).toEqual({ $addToSet: '$data.modele' });
    expect(pipeline[2].$project.distinct_modeles.$size).toBeDefined();
  });

  // Test 38: Rejet de sum ou avg sur colonne non numérique
  it('38. Rejette sum ou avg sur une colonne non numérique', () => {
    expect(() => {
      buildQueryPipeline(mockDataset, {
        measures: [{ field: 'marque', agg: 'sum' }],
      });
    }).toThrow(/nécessite une colonne numérique/);
  });

  // Test 39: Tri asc et desc sur mesure et dimension
  it('39. Tri ordonné par mesure agrégée et dimension', () => {
    const req: QueryRequest = {
      groupBy: [{ field: 'marque' }],
      measures: [{ field: 'ventes', agg: 'sum', alias: 'total_ventes' }],
      sort: [
        { field: 'total_ventes', dir: 'desc' },
        { field: 'marque', dir: 'asc' },
      ],
    };
    const { pipeline } = buildQueryPipeline(mockDataset, req);
    expect(pipeline[3].$sort).toEqual({ total_ventes: -1, marque: 1 });
  });

  // Test 40: Limite bornée à MAX_LIMIT (10 000)
  it('40. Limite bornée à un maximum strict de 10 000 lignes', () => {
    const req: QueryRequest = { limit: 999999 };
    const { pipeline, normalizedRequest } = buildQueryPipeline(mockDataset, req);
    const limitStage = pipeline.find((stage) => stage.$limit !== undefined);
    expect(limitStage).toBeDefined();
    expect(limitStage.$limit).toBe(10000);
    expect(normalizedRequest.limit).toBe(10000);
  });

  // Test 41: Pipeline de facettes en cascade (buildFacetsPipeline)
  it('41. Génère un pipeline $facet avec cascade éliminant les filtres de la colonne', () => {
    const activeFilters: FilterGroup = {
      logic: 'AND',
      conditions: [
        { field: 'marque', op: 'eq', value: 'Toyota' },
        { field: 'est_hybride', op: 'eq', value: true },
      ],
    };

    const facetsPipeline = buildFacetsPipeline(mockDataset, activeFilters);
    expect(facetsPipeline).toHaveLength(2);
    expect(facetsPipeline[0].$match.datasetId).toEqual(mockDataset._id);
    expect(facetsPipeline[1].$facet).toBeDefined();

    // Pour 'marque', le filtre 'marque' doit être retiré (cascade) mais 'est_hybride' conservé
    const marqueFacetSteps = facetsPipeline[1].$facet.marque;
    expect(marqueFacetSteps).toBeDefined();
    const subMatch = marqueFacetSteps[0].$match;
    expect(subMatch['data.marque']).toBeUndefined();
    expect(subMatch['data.est_hybride']).toBeDefined();

    // Pour les nombres, min/max range est généré
    const ventesFacetSteps = facetsPipeline[1].$facet.ventes_range;
    expect(ventesFacetSteps).toBeDefined();
  });

  // Test 42: Helper filterOutColumnConditions
  it('42. filterOutColumnConditions retire proprement la condition ciblée', () => {
    const group: FilterGroup = {
      logic: 'AND',
      conditions: [
        { field: 'marque', op: 'eq', value: 'Omoda' },
        { field: 'ventes', op: 'gt', value: 10 },
      ],
    };
    const cleaned = filterOutColumnConditions(group, 'marque');
    expect(cleaned).toBeDefined();
    expect(cleaned!.conditions).toHaveLength(1);
    expect((cleaned!.conditions[0] as any).field).toBe('ventes');
  });
});
