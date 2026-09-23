import { Request, Response } from 'express';
import { getTargetImportedFile } from '../data/importsStore';

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
 * Smart column locator from Excel columns
 */
function findColumnKey(columns: any[], regexPatterns: RegExp[], preferredType?: string): string | null {
  // First attempt: match column name or originalHeader by regex
  for (const regex of regexPatterns) {
    const matched = columns.find((c) => {
      const header = (c.name || c.originalHeader || c.id || '').toLowerCase();
      const typeMatches = !preferredType || c.detectedType === preferredType || c.type === preferredType;
      return regex.test(header) && typeMatches;
    });
    if (matched) return matched.id || matched.name;
  }

  // Second attempt: match without strict type requirement
  for (const regex of regexPatterns) {
    const matched = columns.find((c) => {
      const header = (c.name || c.originalHeader || c.id || '').toLowerCase();
      return regex.test(header);
    });
    if (matched) return matched.id || matched.name;
  }

  return null;
}

/**
 * GET /api/market-stats
 * 100% dynamic analytics calculated exclusively from imported Excel files
 */
export async function getMarketStats(req: Request, res: Response): Promise<void> {
  try {
    const { importId, brand, originFilter, minSales } = req.query;
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
        timeEvolution: [],
        modelDistribution: [],
        topModels: [],
        regionalData: [],
      });
      return;
    }

    const rows: any[] = dataset.previewData.rows;
    const cols: any[] = dataset.previewData.columns || [];

    // Dynamically identify columns from the uploaded Excel file
    const brandColKey =
      findColumnKey(cols, [/marque/i, /brand/i, /constructeur/i, /nom/i, /produit/i, /categorie/i, /designation/i]) ||
      cols.find((c) => c.detectedType === 'text' || c.type === 'string')?.id ||
      Object.keys(rows[0] || {})[0];

    const salesColKey =
      findColumnKey(cols, [/vente/i, /sales/i, /volume/i, /immat/i, /quantit/i, /total/i, /nombre/i, /valeur/i, /ca\b/i], 'number') ||
      cols.find((c) => (c.detectedType === 'number' || c.type === 'number') && c.id !== brandColKey)?.id ||
      Object.keys(rows[0] || {})[1];

    const phevColKey = findColumnKey(cols, [/phev/i, /hybride/i, /rechargeable/i, /electrique/i, /ev\b/i], 'number');
    const originColKey = findColumnKey(cols, [/origine/i, /pays/i, /nation/i, /country/i]);
    const modelColKey = findColumnKey(cols, [/modele/i, /model/i, /version/i, /gamme/i, /type/i]);
    const dateColKey = findColumnKey(cols, [/date/i, /mois/i, /annee/i, /year/i, /periode/i, /trimestre/i]);
    const regionColKey = findColumnKey(cols, [/region/i, /gouvernorat/i, /ville/i, /zone/i, /secteur/i]);

    // Aggregate by Brand / Category from the rows
    const brandMap: Record<
      string,
      {
        sales: number;
        phevSales: number;
        origin: string;
        models: Record<string, number>;
      }
    > = {};

    const regionMap: Record<string, number> = {};
    const dateMap: Record<string, number> = {};

    rows.forEach((r) => {
      const rawBrand = r[brandColKey];
      const brandName = rawBrand !== undefined && rawBrand !== null && String(rawBrand).trim() !== ''
        ? String(rawBrand).trim()
        : 'Autres';

      let rawSales = r[salesColKey];
      if (typeof rawSales === 'string') {
        rawSales = Number(rawSales.replace(/\s+/g, '').replace(',', '.'));
      }
      const sales = !isNaN(Number(rawSales)) ? Number(rawSales) : 1;

      let rawPhev = phevColKey ? r[phevColKey] : 0;
      if (typeof rawPhev === 'string') {
        rawPhev = Number(rawPhev.replace(/\s+/g, '').replace(',', '.'));
      }
      const phevSales = !isNaN(Number(rawPhev)) ? Number(rawPhev) : 0;

      const origin = originColKey && r[originColKey] ? String(r[originColKey]).trim() : 'Autre';
      const model = modelColKey && r[modelColKey] ? String(r[modelColKey]).trim() : 'Modèle Standard';

      if (!brandMap[brandName]) {
        brandMap[brandName] = {
          sales: 0,
          phevSales: 0,
          origin,
          models: {},
        };
      }

      brandMap[brandName].sales += sales;
      brandMap[brandName].phevSales += phevSales;
      brandMap[brandName].models[model] = (brandMap[brandName].models[model] || 0) + sales;

      // Aggregate region if present
      if (regionColKey && r[regionColKey]) {
        const reg = String(r[regionColKey]).trim();
        regionMap[reg] = (regionMap[reg] || 0) + sales;
      }

      // Aggregate date if present
      if (dateColKey && r[dateColKey]) {
        const d = String(r[dateColKey]).trim();
        dateMap[d] = (dateMap[d] || 0) + sales;
      }
    });

    // Format brand list
    let brandList = Object.keys(brandMap).map((brandName, idx) => {
      const item = brandMap[brandName];
      const isOmoda = /omoda|jaecoo/i.test(brandName);
      return {
        brand: brandName,
        sales: item.sales,
        phevSales: item.phevSales,
        origin: item.origin,
        color: isOmoda ? '#ff284d' : PALETTE[idx % PALETTE.length],
        isOmoda,
      };
    });

    // Optional filters from query params
    if (originFilter && originFilter !== 'all') {
      brandList = brandList.filter((b) =>
        b.origin.toLowerCase().includes(String(originFilter).toLowerCase())
      );
    }
    if (minSales) {
      const min = Number(minSales);
      if (!isNaN(min) && min > 0) {
        brandList = brandList.filter((b) => b.sales >= min);
      }
    }

    // Sort descending by volume
    brandList.sort((a, b) => b.sales - a.sales);

    // Compute market metrics
    const totalMarketSales = brandList.reduce((acc, curr) => acc + curr.sales, 0) || 1;
    const totalPhevSales = brandList.reduce((acc, curr) => acc + curr.phevSales, 0);

    const brandsWithShare = brandList.map((b, idx) => ({
      ...b,
      rank: idx + 1,
      marketShare: Number(((b.sales / totalMarketSales) * 100).toFixed(2)),
      phevShare: totalPhevSales > 0 ? Number(((b.phevSales / totalPhevSales) * 100).toFixed(2)) : 0,
    }));

    // PHEV Ranking from file
    const phevRanking = brandsWithShare
      .filter((b) => b.phevSales > 0)
      .map((b) => ({
        brand: b.brand,
        count: b.phevSales,
        color: b.isOmoda ? '#ff284d' : '#3b82f6',
        isHighlight: b.isOmoda,
      }))
      .sort((a, b) => b.count - a.count);

    // Target brand for model breakdown
    const defaultBrand = brandsWithShare[0]?.brand || '';
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
        .slice(0, 10);
    }

    // Leader & Lowest from actual Excel file
    const leaderItem = brandsWithShare[0] || { brand: 'Aucun', sales: 0, marketShare: 0 };
    const lowestItem = brandsWithShare[brandsWithShare.length - 1] || leaderItem;

    // Omoda & Jaecoo stats from Excel file (or top item if not present)
    const omodaItem = brandsWithShare.find((b) => b.isOmoda) || {
      brand: leaderItem.brand,
      sales: leaderItem.sales,
      phevSales: leaderItem.phevSales,
      marketShare: leaderItem.marketShare,
      rank: leaderItem.rank,
      phevRank: 1,
      phevShare: 100,
    };

    // Chinese brands share if origins are present
    const chineseBrands = brandsWithShare.filter((b) =>
      /chine|chery|byd|geely|omoda|jaecoo|dfsk|dongfeng|gwm|mg|lynk/i.test(b.origin + b.brand)
    );
    const chineseTotalSales = chineseBrands.reduce((a, b) => a + b.sales, 0);
    const chineseMarketShare = Number(((chineseTotalSales / totalMarketSales) * 100).toFixed(2));

    // Time Evolution data from Excel
    let timeEvolution: Array<{ month: string; value1: number; value2?: number }> = [];
    if (Object.keys(dateMap).length > 1) {
      timeEvolution = Object.entries(dateMap)
        .slice(0, 12)
        .map(([dateKey, totalVal]) => ({
          month: dateKey,
          value1: totalVal,
        }));
    } else {
      // Dynamic progression from top entries
      const topItems = brandsWithShare.slice(0, 6);
      timeEvolution = topItems.map((b) => ({
        month: b.brand,
        value1: b.sales,
        value2: b.phevSales > 0 ? b.phevSales : undefined,
      }));
    }

    // Model Distribution slices (Top 4 + Autres)
    const topSlices = brandsWithShare.slice(0, 4);
    const otherSales = brandsWithShare.slice(4).reduce((acc, curr) => acc + curr.sales, 0);
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
        percentage: Math.round((otherSales / totalMarketSales) * 100),
        color: '#475569',
      });
    }

    // Top 5 entries
    const topModels = brandsWithShare.slice(0, 5).map((b, idx) => ({
      rank: idx + 1,
      name: b.brand,
      salesCount: b.sales,
      share: `${b.marketShare}%`,
    }));

    // Regional data from file
    let regionalData: Array<{ region: string; sales: number; percentage: number }> = [];
    if (Object.keys(regionMap).length > 0) {
      regionalData = Object.entries(regionMap)
        .map(([regName, regSales]) => ({
          region: regName,
          sales: regSales,
          percentage: Number(((regSales / totalMarketSales) * 100).toFixed(1)),
        }))
        .sort((a, b) => b.sales - a.sales);
    } else {
      regionalData = brandsWithShare.slice(0, 5).map((b) => ({
        region: b.brand,
        sales: b.sales,
        percentage: Number(b.marketShare),
      }));
    }

    res.json({
      hasData: true,
      datasetId: dataset.id,
      datasetName: dataset.fileName,
      updatedAt: dataset.importedAt,
      totalRows: dataset.totalRows,
      totalColumns: dataset.totalColumns,
      activeSheetName: dataset.activeSheetName,
      availableSheets: dataset.availableSheets || [],
      kpis: {
        totalMarketSales,
        totalPhevSales,
        totalBrands: brandsWithShare.length,
        leader: leaderItem,
        lowest: lowestItem,
        omodaJaecoo: omodaItem,
        chineseMarketShare,
      },
      brandsRanking: brandsWithShare,
      phevRanking,
      selectedBrand: targetBrand,
      modelsBreakdown: modelBreakdown,
      availableBrands: brandsWithShare.map((b) => b.brand),
      timeEvolution,
      modelDistribution,
      topModels,
      regionalData,
    });
  } catch (error: any) {
    console.error('Erreur getMarketStats:', error);
    res.status(500).json({ error: error?.message || 'Erreur lors du calcul des statistiques.' });
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

    res.json({
      summary: `Analyse dynamique du fichier "${dataset.fileName}" (${dataset.totalRows} lignes réelles traitées).`,
      keyTakeaways: [
        `Données consolidées depuis le fichier importé "${dataset.fileName}".`,
        `Nombre total d'enregistrements traités : ${dataset.totalRows} lignes.`,
      ],
      smartFilterSuggestions: [],
    });
  } catch (err: any) {
    res.status(500).json({ error: err?.message || 'Erreur analyse insights' });
  }
}

