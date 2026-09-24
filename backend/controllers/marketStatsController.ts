import { Request, Response } from 'express';
import { getTargetImportedFile } from '../data/importsStore';
import {
  profileDatasetColumns,
  executeDynamicAnalysis,
  getDatasetSuggestions,
  ColumnSemanticProfile,
  AnalysisPlan,
} from '../utils/semanticSchemaEngine';

const PALETTE = [
  '#ff284d', // Omoda red
  '#3b82f6', // blue
  '#10b981', // emerald
  '#f59e0b', // amber
  '#8b5cf6', // purple
  '#06b6d4', // cyan
  '#ec4899', // pink
  '#64748b', // slate
  '#94a3b8',
  '#cbd5e1',
];

/**
 * Dynamically retrieves target dataset strictly from user-imported files
 */
async function getTargetDataset(importId?: string): Promise<any | null> {
  return await getTargetImportedFile(importId);
}

/**
 * GET /api/market-stats
 * 100% dynamic analytics calculated exclusively from imported Excel files
 * using intelligent semantic schema understanding & bi-directional cell filters
 */
export async function getMarketStats(req: Request, res: Response): Promise<void> {
  try {
    const { importId, brand, searchQuery, cellFilters, selectedPeriod } = req.query;
    const dataset = await getTargetDataset(importId as string);

    // If no imported file exists, return clean empty state
    if (!dataset || !dataset.previewData?.rows || dataset.previewData.rows.length === 0) {
      res.json({
        hasData: false,
        message: "Aucun fichier Excel n'a été importé. Veuillez importer un fichier pour générer les graphiques.",
        datasetName: null,
        datasetId: null,
        totalRows: 0,
        totalColumns: 0,
        semanticSchema: null,
        analysisPlan: null,
        kpis: {
          totalMarketSales: 0,
          totalPhevSales: 0,
          totalBrands: 0,
          leader: { brand: 'Aucun', sales: 0, marketShare: 0 },
          lowest: { brand: 'Aucun', sales: 0, marketShare: 0 },
          omodaJaecoo: { brand: 'Omoda & Jaecoo', sales: 0, marketShare: 0, rank: 0, phevSales: 0, phevShare: 0 },
          chineseMarketShare: 0,
        },
        brandsRanking: [],
        phevRanking: [],
        availableBrands: [],
        selectedBrand: '',
        modelsBreakdown: [],
        segmentsBreakdown: [],
        timeEvolution: [],
        modelDistribution: [],
        topModels: [],
        regionalData: [],
        availableFilterOptions: {},
        availablePeriods: [],
      });
      return;
    }

    // Parse cellFilters if passed as JSON string
    let parsedCellFilters: Record<string, string[]> = {};
    if (typeof cellFilters === 'string') {
      try {
        parsedCellFilters = JSON.parse(cellFilters);
      } catch {
        parsedCellFilters = {};
      }
    } else if (cellFilters && typeof cellFilters === 'object') {
      parsedCellFilters = cellFilters as Record<string, string[]>;
    }

    // Run deep semantic analysis of columns and execute computations with filters
    const dynamicAnalysis = executeDynamicAnalysis(dataset, {
      searchQuery: typeof searchQuery === 'string' ? searchQuery : undefined,
      cellFilters: parsedCellFilters,
      selectedPeriod: typeof selectedPeriod === 'string' ? selectedPeriod : undefined,
      brand: typeof brand === 'string' ? brand : undefined,
    });

    if (!dynamicAnalysis) {
      res.status(500).json({ error: "Impossible d'analyser le schéma du fichier." });
      return;
    }

    const {
      profiles,
      plan,
      kpis,
      brandsRanking,
      brandMap,
      timeEvolution,
      segmentsBreakdown,
      topModels: calculatedTopModels,
      availableFilterOptions,
      availablePeriods,
      totalFilteredRows,
      totalRawRows,
    } = dynamicAnalysis;

    // Apply color palette to brands
    const formattedBrands = brandsRanking.map((b, idx) => ({
      ...b,
      origin: 'Base de données',
      color: b.isOmoda ? '#ff284d' : PALETTE[idx % PALETTE.length],
    }));

    // PHEV Ranking
    const phevRanking = formattedBrands
      .filter((b) => b.phevSales > 0)
      .map((b) => ({
        brand: b.brand,
        count: b.phevSales,
        color: b.isOmoda ? '#ff284d' : '#3b82f6',
        isHighlight: b.isOmoda,
      }))
      .sort((a, b) => b.count - a.count);

    // Target brand for model breakdown
    const defaultBrand = formattedBrands[0]?.brand || '';
    const targetBrand = (brand as string) || defaultBrand;

    let modelBreakdown: Array<{ model: string; sales: number; isHighlight?: boolean }> = [];
    if (brandMap[targetBrand]?.models) {
      modelBreakdown = Object.entries(brandMap[targetBrand].models)
        .map(([mName, mSales], mIdx) => ({
          model: mName,
          sales: mSales,
          isHighlight: mIdx === 0,
        }))
        .sort((a, b) => b.sales - a.sales)
        .slice(0, 15);
    }

    // Model Distribution slices (Top 4 + Autres)
    const topSlices = formattedBrands.slice(0, 4);
    const otherSales = formattedBrands.slice(4).reduce((acc, curr) => acc + curr.sales, 0);
    const modelDistribution = topSlices.map((b, idx) => ({
      name: b.brand,
      count: b.sales,
      percentage: Math.round(b.marketShare),
      color: b.color || PALETTE[idx % PALETTE.length],
    }));

    if (otherSales > 0) {
      modelDistribution.push({
        name: 'Autres',
        count: otherSales,
        percentage: Math.round((otherSales / (kpis.totalMarketSales || 1)) * 100),
        color: '#475569',
      });
    }

    // Chinese brands market share
    const chineseBrands = formattedBrands.filter((b) =>
      /chine|chery|byd|geely|omoda|jaecoo|dfsk|dongfeng|gwm|mg|lynk|haval/i.test(b.brand)
    );
    const chineseTotalSales = chineseBrands.reduce((a, b) => a + b.sales, 0);
    const chineseMarketShare = kpis.totalMarketSales > 0
      ? Number(((chineseTotalSales / kpis.totalMarketSales) * 100).toFixed(2))
      : 0;

    res.json({
      hasData: true,
      datasetId: dataset.id,
      datasetName: dataset.fileName,
      updatedAt: dataset.importedAt,
      totalRows: totalRawRows,
      totalFilteredRows,
      totalColumns: dataset.totalColumns,
      activeSheetName: dataset.activeSheetName,
      availableSheets: dataset.availableSheets || [],
      semanticSchema: {
        profiles,
        plan,
      },
      kpis: {
        ...kpis,
        chineseMarketShare,
      },
      brandsRanking: formattedBrands,
      phevRanking,
      selectedBrand: targetBrand,
      modelsBreakdown: modelBreakdown,
      segmentsBreakdown: segmentsBreakdown || [],
      availableBrands: formattedBrands.map((b) => b.brand),
      timeEvolution,
      modelDistribution,
      topModels: calculatedTopModels,
      regionalData: [],
      availableFilterOptions,
      availablePeriods,
    });
  } catch (error: any) {
    console.error('Erreur getMarketStats:', error);
    res.status(500).json({ error: error?.message || 'Erreur lors du calcul des statistiques.' });
  }
}

/**
 * GET /api/market-stats/suggestions
 * Instant autocomplete suggestions across column headers and all database cells
 */
export async function getSearchSuggestions(req: Request, res: Response): Promise<void> {
  try {
    const { importId, q } = req.query;
    if (!q || typeof q !== 'string' || q.trim().length === 0) {
      res.json([]);
      return;
    }

    const dataset = await getTargetDataset(importId as string);
    if (!dataset || !dataset.previewData?.rows || dataset.previewData.rows.length === 0) {
      res.json([]);
      return;
    }

    const { profiles } = profileDatasetColumns(
      dataset.previewData.rows,
      dataset.previewData.columns
    );

    const suggestions = getDatasetSuggestions(
      dataset.previewData.rows,
      profiles,
      q,
      12
    );

    res.json(suggestions);
  } catch (err: any) {
    console.error('Erreur getSearchSuggestions:', err);
    res.status(500).json({ error: err?.message || 'Erreur recherche suggestions' });
  }
}

/**
 * GET /api/market-stats/schema-analysis
 * Direct inspection of column semantics and types understood from database
 */
export async function getSchemaAnalysis(req: Request, res: Response): Promise<void> {
  try {
    const { importId } = req.query;
    const dataset = await getTargetDataset(importId as string);

    if (!dataset || !dataset.previewData?.rows || dataset.previewData.rows.length === 0) {
      res.json({
        hasData: false,
        message: 'Aucun jeu de données disponible dans la base.',
        profiles: [],
        plan: null,
      });
      return;
    }

    const { profiles, plan } = profileDatasetColumns(
      dataset.previewData.rows,
      dataset.previewData.columns
    );

    res.json({
      hasData: true,
      datasetId: dataset.id,
      datasetName: dataset.fileName,
      totalRows: dataset.totalRows,
      totalColumns: dataset.totalColumns,
      profiles,
      plan,
    });
  } catch (err: any) {
    console.error('Erreur getSchemaAnalysis:', err);
    res.status(500).json({ error: err?.message || "Erreur lors de l'analyse sémantique du schéma." });
  }
}

/**
 * POST /api/market-stats/insights
 * AI Insights generated strictly from active imported file
 */
export async function generateMarketInsights(req: Request, res: Response): Promise<void> {
  try {
    const { datasetId } = req.body;
    const dataset = await getTargetDataset(datasetId);

    if (!dataset || !dataset.previewData?.rows || dataset.previewData.rows.length === 0) {
      res.json({
        summary: "Aucun fichier Excel n'est importé. Importez un fichier pour générer des synthèses d'intelligence marché.",
        keyTakeaways: [],
        smartFilterSuggestions: [],
      });
      return;
    }

    const { plan, profiles } = profileDatasetColumns(
      dataset.previewData.rows,
      dataset.previewData.columns
    );

    res.json({
      summary: `Analyse dynamique du fichier "${dataset.fileName}" (${dataset.totalRows} lignes réelles). Schéma compris : ${profiles.length} colonnes cartographiées automatiquement.`,
      keyTakeaways: [
        `Données consolidées depuis le fichier importé "${dataset.fileName}".`,
        plan.dimensionRoleExplanation,
        plan.metricRoleExplanation,
        `Nombre total d'enregistrements traités : ${dataset.totalRows} lignes.`,
      ],
      smartFilterSuggestions: [],
    });
  } catch (err: any) {
    res.status(500).json({ error: err?.message || 'Erreur analyse insights' });
  }
}


