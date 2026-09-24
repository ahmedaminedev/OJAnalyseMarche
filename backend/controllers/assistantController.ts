import { Request, Response } from 'express';
import { GoogleGenAI, Type } from '@google/genai';
import { getTargetImportedFile } from '../data/importsStore';
import {
  profileDatasetColumns,
  executeDynamicAnalysis,
  parseNumber,
  ColumnSemanticProfile,
  AnalysisPlan,
} from '../utils/semanticSchemaEngine';

export interface AssistantCalculation {
  label: string;
  value: string;
  type?: 'highlight' | 'default' | 'success' | 'warning';
}

export interface AssistantTableData {
  title: string;
  description?: string;
  headers: string[];
  rows: string[][];
  totalSummary?: string;
}

export interface DynamicGrounding {
  hasData: boolean;
  datasetName: string | null;
  datasetId: string | null;
  totalRows: number;
  totalMarketSales: number;
  totalPhevSales: number;
  leaderBrand: string;
  leaderSales: number;
  lowestBrand: string;
  lowestSales: number;
  allBrands: Array<{
    name: string;
    sales: number;
    phevSales: number;
    marketShare: number;
  }>;
  profiles: ColumnSemanticProfile[];
  plan: AnalysisPlan;
  temporalData: Array<{ month: string; value1: number; value2?: number }>;
  segmentsData: Array<{ name: string; count: number; percentage: number }>;
  topModels: Array<{ rank: number; name: string; brand: string; segment: string; salesCount: number }>;
  sampleModelRows: any[];
  availablePeriods: string[];
}

async function getTargetDataset(importId?: string): Promise<any | null> {
  return await getTargetImportedFile(importId);
}

function computeDynamicGrounding(dataset: any | null): DynamicGrounding {
  if (!dataset || !dataset.previewData?.rows || dataset.previewData.rows.length === 0) {
    return {
      hasData: false,
      datasetName: null,
      datasetId: null,
      totalRows: 0,
      totalMarketSales: 0,
      totalPhevSales: 0,
      leaderBrand: '',
      leaderSales: 0,
      lowestBrand: '',
      lowestSales: 0,
      allBrands: [],
      profiles: [],
      plan: {
        primaryDimensionCol: '',
        primaryMetricCol: '',
        temporalMetricCols: [],
        isWideTemporalFormat: false,
        dimensionRoleExplanation: '',
        metricRoleExplanation: '',
      },
      temporalData: [],
      segmentsData: [],
      topModels: [],
      sampleModelRows: [],
      availablePeriods: [],
    };
  }

  const analysis = executeDynamicAnalysis(dataset);
  if (!analysis) {
    return {
      hasData: false,
      datasetName: dataset.fileName,
      datasetId: dataset.id,
      totalRows: 0,
      totalMarketSales: 0,
      totalPhevSales: 0,
      leaderBrand: '',
      leaderSales: 0,
      lowestBrand: '',
      lowestSales: 0,
      allBrands: [],
      profiles: [],
      plan: {
        primaryDimensionCol: '',
        primaryMetricCol: '',
        temporalMetricCols: [],
        isWideTemporalFormat: false,
        dimensionRoleExplanation: '',
        metricRoleExplanation: '',
      },
      temporalData: [],
      segmentsData: [],
      topModels: [],
      sampleModelRows: [],
      availablePeriods: [],
    };
  }

  const allBrands = analysis.brandsRanking.map((b) => ({
    name: b.brand,
    sales: b.sales,
    phevSales: b.phevSales,
    marketShare: b.marketShare,
  }));

  // Build clean cell-level model rows for ALL rows in dataset so every cell can be queried
  const rawRows: any[] = dataset.previewData.rows;
  const brandCol = analysis.plan.primaryDimensionCol;
  const modelCol = analysis.plan.subDimensionCol;
  const segCol = analysis.plan.segmentCol;
  const tCols = analysis.plan.temporalMetricCols;

  const sampleModelRows = rawRows.map((r) => {
    const rowObj: any = {
      marque: String(r[brandCol] ?? '').trim(),
      modele: modelCol ? String(r[modelCol] ?? '').trim() : undefined,
      segment: segCol ? String(r[segCol] ?? '').trim() : undefined,
    };
    if (tCols && tCols.length > 0) {
      rowObj.periodes = {};
      for (const tc of tCols) {
        const header = analysis.profiles.find((p) => p.columnKey === tc)?.originalHeader || tc;
        rowObj.periodes[header] = parseNumber(r[tc]) || 0;
      }
    } else {
      rowObj.ventes = parseNumber(r[analysis.plan.primaryMetricCol]) || 0;
    }
    return rowObj;
  });

  return {
    hasData: true,
    datasetName: dataset.fileName,
    datasetId: dataset.id,
    totalRows: dataset.totalRows || dataset.previewData.rows.length,
    totalMarketSales: analysis.kpis.totalMarketSales,
    totalPhevSales: analysis.kpis.totalPhevSales,
    leaderBrand: analysis.kpis.leader.brand,
    leaderSales: analysis.kpis.leader.sales,
    lowestBrand: analysis.kpis.lowest.brand,
    lowestSales: analysis.kpis.lowest.sales,
    allBrands,
    profiles: analysis.profiles,
    plan: analysis.plan,
    temporalData: analysis.timeEvolution,
    segmentsData: analysis.segmentsBreakdown,
    topModels: analysis.topModels,
    sampleModelRows,
    availablePeriods: analysis.availablePeriods,
  };
}

function cleanUserQuery(raw: string): string {
  if (!raw) return '';
  let cleaned = raw.trim();
  cleaned = cleaned.replace(/\s*([+*])\s*$/g, '');
  cleaned = cleaned.replace(/\s+/g, ' ');
  return cleaned;
}

/**
 * Normalize and remove accents / diacritics for ultra-tolerant matching
 */
function normalizeText(str: string): string {
  if (!str) return '';
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

/**
 * Intelligent period resolver
 * Resolves natural language expressions like:
 * - "janv", "janvier", "01-2026", "2026-01", "premier mois 2026", "janv 2026" -> "2026-01"
 * - "fev", "fevrier", "02-2026", "2026-02" -> "2026-02"
 * - "aout", "août", "08-2026", "2026-08" -> "2026-08"
 */
function resolvePeriodFromText(text: string, availablePeriods: string[]): string | null {
  const norm = normalizeText(text);

  // Direct check against available periods (e.g. "2026-01")
  for (const p of availablePeriods) {
    if (norm.includes(normalizeText(p))) {
      return p;
    }
  }

  // Check reverse format (e.g. user types "01-2026" or "01/2026" for "2026-01")
  const revMatch = norm.match(/\b(0[1-9]|1[0-2])[-/](20\d\d)\b/);
  if (revMatch) {
    const month = revMatch[1];
    const year = revMatch[2];
    const candidate = `${year}-${month}`;
    const found = availablePeriods.find((p) => p === candidate);
    if (found) return found;
  }

  // Month mapping table
  const monthsMap: Array<{ regex: RegExp; monthNum: string }> = [
    { regex: /\b(janv|janvier|1er mois|premier mois)\b/, monthNum: '01' },
    { regex: /\b(fev|fevr|fevrier|deuxieme mois|2eme mois|2nd mois)\b/, monthNum: '02' },
    { regex: /\b(mar|mars|troisieme mois|3eme mois)\b/, monthNum: '03' },
    { regex: /\b(avr|avril|quatrieme mois|4eme mois)\b/, monthNum: '04' },
    { regex: /\b(mai|cinquieme mois|5eme mois)\b/, monthNum: '05' },
    { regex: /\b(juin|sixieme mois|6eme mois)\b/, monthNum: '06' },
    { regex: /\b(juil|juill|juillet|septieme mois|7eme mois)\b/, monthNum: '07' },
    { regex: /\b(aout|huitieme mois|8eme mois)\b/, monthNum: '08' },
    { regex: /\b(sep|sept|septembre|neuvieme mois|9eme mois)\b/, monthNum: '09' },
    { regex: /\b(oct|octo|octobre|dixieme mois|10eme mois)\b/, monthNum: '10' },
    { regex: /\b(nov|novembre|onzieme mois|11eme mois)\b/, monthNum: '11' },
    { regex: /\b(dec|decembre|douzieme mois|12eme mois)\b/, monthNum: '12' },
  ];

  // Extract optional year from query (defaults to first period's year or 2026)
  const yearMatch = norm.match(/\b(20\d\d)\b/);
  const targetYear = yearMatch ? yearMatch[1] : (availablePeriods[0]?.split('-')[0] || '2026');

  for (const m of monthsMap) {
    if (m.regex.test(norm)) {
      const candidate = `${targetYear}-${m.monthNum}`;
      const found = availablePeriods.find((p) => p === candidate);
      if (found) return found;
      // If no exact match with year, check if any period has this month
      const partialFound = availablePeriods.find((p) => p.endsWith(`-${m.monthNum}`));
      if (partialFound) return partialFound;
    }
  }

  return null;
}

/**
 * Deterministic multi-format engine with STRICT format discipline,
 * natural language aliases tolerance, conversational fluency, and ChatGPT-grade precision.
 */
function buildDeterministicResponse(query: string, grounding: DynamicGrounding) {
  if (!grounding.hasData) {
    return {
      reply:
        "Aucun fichier Excel n'est actuellement importé dans la plateforme. Veuillez importer un fichier (.xlsx ou .xls) dans la section 'Données & Imports' pour que le système analyse automatiquement la base.",
      calculations: [],
      chart: null,
      table: null,
      schemaInsight: null,
      missingDataNotice: 'Aucun fichier actif dans la base de données.',
      suggestedFollowUps: ['Comment importer un fichier Excel ?'],
    };
  }

  const rawQ = query.trim();
  const qNorm = normalizeText(query);

  // 0. CONVERSATIONAL GREETINGS & CASUAL INTERACTION (Natural language like ChatGPT)
  const isGreeting = /^(bonjour|salut|hello|hi|hey|coucou|bonsoir|salam|bjr|bonjour!|salut!|hello!)\b/i.test(rawQ);
  const isIdentity = /qui es[- ]tu|t'es qui|ton role|tu fais quoi|presente[- ]toi|aide[- ]moi/i.test(qNorm);

  if ((isGreeting || isIdentity) && rawQ.split(' ').length <= 4) {
    return {
      reply: `Bonjour ! Je suis votre **Assistant IA d'Analyse Automobile** connecté en temps réel aux données de votre fichier actif **"${grounding.datasetName}"** (${grounding.totalRows.toLocaleString('fr-FR')} lignes réelles).\n\nQue souhaitez-vous savoir ? Vous pouvez me demander par exemple :\n- Un **chiffre précis** (ex: *"ventes de D-Max en janv 2026"* ou *"volume de Hyundai"*)\n- Un **classement ou stats** (ex: *"qui est le leader ?"* ou *"les 5 meilleurs"*)\n- Une **courbe temporelle** (ex: *"courbe d'évolution"*)\n- Un **tableau comparatif** (ex: *"donne un tableau des ventes"*)\n- Un **camembert** (ex: *"parts de marché en camembert"*)`,
      calculations: [
        { label: 'Fichier Actif', value: grounding.datasetName || 'Fichier Excel', type: 'highlight' },
        { label: 'Lignes en Base', value: `${grounding.totalRows} lignes`, type: 'default' },
        { label: 'Leader Actuel', value: `${grounding.leaderBrand} (${grounding.leaderSales.toLocaleString('fr-FR')} unités)`, type: 'success' },
      ],
      chart: null,
      table: null,
      schemaInsight: `Connecté à la base (${grounding.profiles.length} colonnes cartographiées automatiquement).`,
      suggestedFollowUps: [
        'Qui est le leader du marché ?',
        'Donne-moi un tableau complet des ventes',
        'Affiche la courbe des volumes',
        'Parts de marché en camembert',
      ],
    };
  }

  // Explicit format intent detection
  const wantsTable = /tableau|table\b|tab\b|grille|liste|matrice/i.test(qNorm);
  const wantsCurve = /courbe|courb|line|evolution|évolution|tendance|progression|chronolog/i.test(qNorm);
  const wantsPie = /camembert|pie|repartition|répartition|part de marche|pdm|pourcent/i.test(qNorm);
  const wantsBar = /barre|histogramme|classement|ranking|top\b|podium|meilleur|pire|plus bas|plus faible/i.test(qNorm);
  const wantsValue = /valeur|chiffre|combien|total|somme|volume/i.test(qNorm) || (!wantsTable && !wantsCurve && !wantsPie && !wantsBar);

  // Column aliases matching (e.g. "marq" -> brand column, "annee" -> period, "modele" -> model)
  const askingAboutBrandColumn = /\b(marq|marque|marques|constructeur|constructeurs)\b/i.test(qNorm);
  const askingAboutYearPeriod = /\b(anne|annee|annees|period|periode|periodes|mois)\b/i.test(qNorm);
  const askingAboutSegmentColumn = /\b(seg|segment|segments|categorie|categories)\b/i.test(qNorm);

  // Intelligent date / period resolution from natural language (e.g. "janv", "janv 2026", "01-2026")
  const resolvedPeriod = resolvePeriodFromText(query, grounding.availablePeriods);

  // Specific model lookup across ALL dataset rows
  // Sort rows by model name length descending to match longest specific model first
  let matchedModelRow: any = null;
  const modelsPool = [...grounding.sampleModelRows].sort((a, b) => (b.modele?.length || 0) - (a.modele?.length || 0));

  for (const r of modelsPool) {
    if (r.modele && r.modele.trim().length > 1) {
      const modelNorm = normalizeText(r.modele);
      if (qNorm.includes(modelNorm)) {
        matchedModelRow = r;
        break;
      }
    }
  }

  // Specific brand lookup
  let matchedBrand: typeof grounding.allBrands[0] | undefined = undefined;
  for (const b of grounding.allBrands) {
    const brandNorm = normalizeText(b.name);
    if (qNorm.includes(brandNorm) && brandNorm.length > 2) {
      matchedBrand = b;
      break;
    }
  }

  // Special case: User asks about the column "MARQUE" itself (e.g. "marq", "quelles sont les marques ?")
  if (askingAboutBrandColumn && !matchedBrand && !matchedModelRow && !wantsCurve && !wantsPie) {
    const topBrandsList = grounding.allBrands.slice(0, 10).map((b) => `**${b.name}** (${b.sales.toLocaleString('fr-FR')} u.)`).join(', ');
    return {
      reply: `La colonne **"MARQUE"** répertorie **${grounding.allBrands.length} constructeurs distincts** sur les **${grounding.totalRows} lignes** de la base.\n\nLe leader est **${grounding.leaderBrand}** avec **${grounding.leaderSales.toLocaleString('fr-FR')} unités** (${grounding.allBrands[0]?.marketShare}% de part).\n\nPrincipales marques disponibles : ${topBrandsList}...`,
      calculations: [
        { label: 'Nombre de Marques', value: `${grounding.allBrands.length}`, type: 'highlight' },
        { label: 'Leader', value: `${grounding.leaderBrand} (${grounding.leaderSales.toLocaleString('fr-FR')})`, type: 'success' },
        { label: 'Total Lignes en Base', value: `${grounding.totalRows}`, type: 'default' },
      ],
      chart: wantsBar ? {
        type: 'bar',
        title: 'Top 8 Marques par Volume',
        data: grounding.allBrands.slice(0, 8).map((b) => ({ name: b.name, value: b.sales, share: `${b.marketShare}%` })),
      } : null,
      table: wantsTable ? buildDefaultTable(grounding) : null,
      schemaInsight: `Colonne "MARQUE" profilée avec succès comme dimension primaire constructeur.`,
    };
  }

  // Special case: User asks about periods / "année" / "mois" (e.g. "annee", "quelles sont les annees / mois ?")
  if (askingAboutYearPeriod && !matchedModelRow && !matchedBrand && !resolvedPeriod && !wantsCurve) {
    return {
      reply: `La base de données comporte **${grounding.availablePeriods.length} périodes mensuelles consolidées** :\n${grounding.availablePeriods.map((p) => `- **${p}**`).join('\n')}\n\nLe volume cumulé sur toutes ces périodes est de **${grounding.totalMarketSales.toLocaleString('fr-FR')} unités**.`,
      calculations: [
        { label: 'Périodes Mensuelles', value: `${grounding.availablePeriods.length} mois`, type: 'highlight' },
        { label: 'Première Période', value: grounding.availablePeriods[0] || 'N/A', type: 'default' },
        { label: 'Dernière Période', value: grounding.availablePeriods[grounding.availablePeriods.length - 1] || 'N/A', type: 'default' },
      ],
      chart: null,
      table: null,
      schemaInsight: `Structure temporelle large détectée avec ${grounding.availablePeriods.length} colonnes de ventes mensuelles.`,
    };
  }

  // 1. SPECIFIC VALUE / CELL QUERY (USER ASKS FOR A NUMBER / VALUE)
  if ((wantsValue || /combien|valeur|quel/i.test(qNorm)) && !wantsTable && !wantsCurve && !wantsPie) {
    // Case A: Specific model + period (e.g. "combien de D-Max Double Cabine en janv 2026 ?" ou "en 01-2026")
    if (matchedModelRow && resolvedPeriod && matchedModelRow.periodes) {
      const val = matchedModelRow.periodes[resolvedPeriod] ?? 0;
      const totalModel: number = Object.values(matchedModelRow.periodes).reduce((a: number, b: any) => a + Number(b), 0);
      return {
        reply: `D'après la base de données du fichier **"${grounding.datasetName}"**, le modèle **${matchedModelRow.modele}** (${matchedModelRow.marque}, segment *${matchedModelRow.segment || 'N/A'}*) a enregistré exactement **${val.toLocaleString('fr-FR')} ventes** sur la période **${resolvedPeriod}** (sur un cumul de **${totalModel.toLocaleString('fr-FR')} unités** sur l'ensemble de l'année/périodes).`,
        calculations: [
          { label: `${matchedModelRow.modele} (${resolvedPeriod})`, value: `${val.toLocaleString('fr-FR')} unités`, type: 'highlight' },
          { label: `Cumul global du modèle`, value: `${totalModel.toLocaleString('fr-FR')} unités`, type: 'default' },
          { label: `Marque Constructeur`, value: matchedModelRow.marque, type: 'default' },
        ],
        chart: null,
        table: null,
        schemaInsight: `Cellule exacte issue de la colonne "${resolvedPeriod}" pour la ligne "${matchedModelRow.modele}".`,
      };
    }

    // Case B: Specific model overall
    if (matchedModelRow) {
      const totalModel = matchedModelRow.periodes
        ? Object.values(matchedModelRow.periodes).reduce((a: any, b: any) => a + Number(b), 0)
        : matchedModelRow.ventes || 0;
      return {
        reply: `Selon les enregistrements de la base (**${grounding.datasetName}**), le volume total pour **${matchedModelRow.modele}** (${matchedModelRow.marque}) est de **${totalModel.toLocaleString('fr-FR')} unités**.`,
        calculations: [
          { label: `Modèle ${matchedModelRow.modele}`, value: `${totalModel.toLocaleString('fr-FR')} unités`, type: 'highlight' },
          { label: `Marque`, value: matchedModelRow.marque, type: 'default' },
          { label: `Segment`, value: matchedModelRow.segment || 'N/A', type: 'default' },
        ],
        chart: null,
        table: null,
        schemaInsight: `Agrégation calculée à partir des lignes du modèle "${matchedModelRow.modele}".`,
      };
    }

    // Case C: Specific Brand + period (e.g. "ventes Hyundai en janv 2026")
    if (matchedBrand && resolvedPeriod) {
      // Sum sales for this brand in that specific period across all models
      let brandPeriodSales = 0;
      for (const r of grounding.sampleModelRows) {
        if (normalizeText(r.marque) === normalizeText(matchedBrand.name) && r.periodes) {
          brandPeriodSales += Number(r.periodes[resolvedPeriod] || 0);
        }
      }
      return {
        reply: `D'après les données de la base, la marque **${matchedBrand.name}** a réalisé **${brandPeriodSales.toLocaleString('fr-FR')} ventes** sur la période **${resolvedPeriod}** (sur un total de **${matchedBrand.sales.toLocaleString('fr-FR')} unités** tous mois confondus).`,
        calculations: [
          { label: `${matchedBrand.name} (${resolvedPeriod})`, value: `${brandPeriodSales.toLocaleString('fr-FR')} unités`, type: 'highlight' },
          { label: `Cumul global de la marque`, value: `${matchedBrand.sales.toLocaleString('fr-FR')} unités`, type: 'default' },
          { label: `Part de marché annuelle`, value: `${matchedBrand.marketShare}%`, type: 'success' },
        ],
        chart: null,
        table: null,
        schemaInsight: `Somme consolidée des cellules de la colonne "${resolvedPeriod}" pour la marque "${matchedBrand.name}".`,
      };
    }

    // Case D: Specific Brand overall
    if (matchedBrand) {
      return {
        reply: `Selon la base de données, la marque **${matchedBrand.name}** enregistre un volume total de **${matchedBrand.sales.toLocaleString('fr-FR')} unités**, soit une part de marché de **${matchedBrand.marketShare}%** du marché total analysé (${grounding.totalMarketSales.toLocaleString('fr-FR')} unités).`,
        calculations: [
          { label: `Ventes ${matchedBrand.name}`, value: `${matchedBrand.sales.toLocaleString('fr-FR')} unités`, type: 'highlight' },
          { label: `Part de marché`, value: `${matchedBrand.marketShare}%`, type: 'success' },
          { label: `Ventes PHEV`, value: `${matchedBrand.phevSales.toLocaleString('fr-FR')}`, type: 'default' },
        ],
        chart: null,
        table: null,
        schemaInsight: `Totalisation issue de la dimension primaire "${grounding.plan.primaryDimensionCol}".`,
      };
    }

    // Case E: Leader or lowest query (e.g. "qui est le meilleur et qui est le plus bas ?")
    if (/meilleur|leader|premier|plus grand|plus fort|top 1|pire|plus bas|dernier|plus faible/i.test(qNorm)) {
      return {
        reply: `D'après l'analyse rigoureuse des ${grounding.totalRows} lignes du fichier **"${grounding.datasetName}"** :\n- 🥇 **Meilleure performance (Leader)** : **${grounding.leaderBrand}** avec **${grounding.leaderSales.toLocaleString('fr-FR')} unités** (${grounding.allBrands[0]?.marketShare}% de part).\n- 🔻 **Performance la plus basse** : **${grounding.lowestBrand}** avec **${grounding.lowestSales.toLocaleString('fr-FR')} unités**.`,
        calculations: [
          { label: `Leader (${grounding.leaderBrand})`, value: `${grounding.leaderSales.toLocaleString('fr-FR')} unités`, type: 'success' },
          { label: `Plus bas (${grounding.lowestBrand})`, value: `${grounding.lowestSales.toLocaleString('fr-FR')} unités`, type: 'warning' },
          { label: 'Volume Global Marché', value: `${grounding.totalMarketSales.toLocaleString('fr-FR')} unités`, type: 'highlight' },
        ],
        chart: null,
        table: null,
        schemaInsight: `Comparaison directe issue du classement consolidé des ${grounding.allBrands.length} marques.`,
      };
    }

    // Case F: General Market Totals
    return {
      reply: `Voici les valeurs consolidées de la base pour **"${grounding.datasetName}"** :\n- **Volume total du marché** : **${grounding.totalMarketSales.toLocaleString('fr-FR')} unités**.\n- **Leader du marché** : **${grounding.leaderBrand}** avec **${grounding.leaderSales.toLocaleString('fr-FR')} unités** (${grounding.allBrands[0]?.marketShare}% de part).\n- **Nombre de marques** : **${grounding.allBrands.length} entités** sur **${grounding.totalRows} lignes**.`,
      calculations: [
        { label: 'Volume Global Marché', value: `${grounding.totalMarketSales.toLocaleString('fr-FR')} unités`, type: 'highlight' },
        { label: `Leader (${grounding.leaderBrand})`, value: `${grounding.leaderSales.toLocaleString('fr-FR')} unités`, type: 'success' },
        { label: 'Total Lignes en Base', value: `${grounding.totalRows}`, type: 'default' },
      ],
      chart: null,
      table: null,
      schemaInsight: `Données exactes agrégées depuis la base (${grounding.profiles.length} colonnes cartographiées).`,
    };
  }

  // 2. USER EXPLICITLY ASKS FOR A CURVE (LINE CHART)
  if (wantsCurve) {
    const chartData = {
      type: 'line',
      title: `Évolution des Volumes - ${grounding.datasetName}`,
      description: `Courbe chronologique issue des colonnes temporelles de la base`,
      xAxisLabel: 'Période',
      yAxisLabel: 'Unités',
      data: grounding.temporalData.map((d) => ({
        name: d.month,
        value: d.value1,
        secondaryValue: d.value2,
      })),
    };

    return {
      reply: `Voici la courbe d'évolution générée à partir des colonnes temporelles du fichier **"${grounding.datasetName}"**.`,
      calculations: [
        { label: 'Périodes analysées', value: `${grounding.temporalData.length}`, type: 'highlight' },
        { label: 'Pic de volume', value: `${Math.max(...grounding.temporalData.map((d) => d.value1), 0).toLocaleString('fr-FR')} unités`, type: 'default' },
      ],
      chart: chartData,
      table: wantsTable ? buildDefaultTable(grounding) : null,
      schemaInsight: `Courbe générée d'après ${grounding.plan.temporalMetricCols.length > 0 ? `${grounding.plan.temporalMetricCols.length} colonnes mensuelles` : 'la dimension temporelle'}.`,
    };
  }

  // 3. USER EXPLICITLY ASKS FOR A PIE CHART (RÉPARTITION / CAMEMBERT)
  if (wantsPie) {
    const top4 = grounding.allBrands.slice(0, 4);
    const otherSum = grounding.allBrands.slice(4).reduce((a, b) => a + b.sales, 0);
    const pieData = top4.map((b) => ({
      name: b.name,
      value: b.sales,
      share: `${b.marketShare}%`,
    }));
    if (otherSum > 0) {
      pieData.push({
        name: 'Autres',
        value: otherSum,
        share: `${grounding.totalMarketSales > 0 ? ((otherSum / grounding.totalMarketSales) * 100).toFixed(1) : 0}%`,
      });
    }

    return {
      reply: `Voici la répartition des parts de marché sous forme de camembert pour le fichier **"${grounding.datasetName}"**.`,
      calculations: [
        { label: `Part ${grounding.leaderBrand} (Leader)`, value: `${grounding.allBrands[0]?.marketShare || 0}%`, type: 'highlight' },
        { label: 'Volume Marché Total', value: `${grounding.totalMarketSales.toLocaleString('fr-FR')} unités`, type: 'default' },
      ],
      chart: {
        type: 'pie',
        title: `Parts de Marché par Marque - ${grounding.datasetName}`,
        data: pieData,
      },
      table: wantsTable ? buildDefaultTable(grounding) : null,
    };
  }

  // 4. USER EXPLICITLY ASKS FOR A BAR CHART / RANKING
  if (wantsBar) {
    const barData = grounding.allBrands.slice(0, 8).map((b) => ({
      name: b.name,
      value: b.sales,
      share: `${b.marketShare}%`,
      highlight: /omoda|jaecoo/i.test(b.name),
    }));

    return {
      reply: `Voici le classement par barres des principales marques issues de la base de données.`,
      calculations: [
        { label: '1ère Place', value: `${grounding.leaderBrand} (${grounding.leaderSales.toLocaleString('fr-FR')})`, type: 'success' },
      ],
      chart: {
        type: 'bar',
        title: `Classement des Volumes par Marque`,
        data: barData,
      },
      table: wantsTable ? buildDefaultTable(grounding) : null,
    };
  }

  // 5. USER EXPLICITLY ASKS FOR A TABLE
  if (wantsTable) {
    return {
      reply: `Voici le tableau des données consolidées issu du fichier **"${grounding.datasetName}"** (${grounding.totalRows} lignes réelles).`,
      calculations: [
        { label: 'Total Enregistrements', value: `${grounding.totalRows} lignes`, type: 'highlight' },
        { label: 'Total Ventes', value: `${grounding.totalMarketSales.toLocaleString('fr-FR')} unités`, type: 'default' },
      ],
      chart: null,
      table: buildDefaultTable(grounding),
    };
  }

  // Default fallback: clear value summary without unsolicited charts or tables
  return {
    reply: `D'après l'analyse sémantique de votre base pour **"${grounding.datasetName}"** (${grounding.totalRows} lignes) :\n- **Total des volumes** : **${grounding.totalMarketSales.toLocaleString('fr-FR')} unités**.\n- **Leader** : **${grounding.leaderBrand}** avec **${grounding.leaderSales.toLocaleString('fr-FR')} unités** (${grounding.allBrands[0]?.marketShare || 0}% de part).\n\nVous pouvez me demander un chiffre précis, une cellule en particulier, un tableau complet, une courbe d'évolution ou un camembert.`,
    calculations: [
      { label: 'Volume Global', value: `${grounding.totalMarketSales.toLocaleString('fr-FR')} unités`, type: 'highlight' },
      { label: 'Leader', value: grounding.leaderBrand, type: 'success' },
    ],
    chart: null,
    table: null,
  };
}

function buildDefaultTable(grounding: DynamicGrounding): AssistantTableData {
  const tableBrands = grounding.allBrands.slice(0, 15);
  return {
    title: `Tableau des Ventes et Parts de Marché - ${grounding.datasetName}`,
    description: `Données exactes consolidées depuis la base (${grounding.totalRows} lignes réelles)`,
    headers: ['Rang', 'Marque / Constructeur', 'Ventes (Unités)', 'Part de Marché', 'Ventes PHEV'],
    rows: tableBrands.map((b, idx) => [
      `#${idx + 1}`,
      b.name,
      b.sales.toLocaleString('fr-FR'),
      `${b.marketShare}%`,
      b.phevSales > 0 ? b.phevSales.toLocaleString('fr-FR') : '-',
    ]),
    totalSummary: `Volume Total : ${grounding.totalMarketSales.toLocaleString('fr-FR')} unités (${grounding.allBrands.length} marques au total)`,
  };
}

/**
 * POST /api/assistant/chat
 * High-precision assistant with strict format compliance (value vs table vs curve vs chart)
 */
export async function chatWithAssistant(req: Request, res: Response): Promise<void> {
  try {
    const { query, message, importId } = req.body;
    const cleanQuery = cleanUserQuery(query || message || '');

    if (!cleanQuery) {
      res.status(400).json({ error: 'Message vide.' });
      return;
    }

    const dataset = await getTargetDataset(importId);
    const grounding = computeDynamicGrounding(dataset);

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      res.json(buildDeterministicResponse(cleanQuery, grounding));
      return;
    }

    const candidateModels = ['gemini-3.8-flash', 'gemini-flash-latest', 'gemini-3.1-flash-lite'];
    let parsedResult: any = null;

    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });

    const prompt = `Tu es l'Assistant IA Expert en Analyse de Données Automobile de l'application OMODA & JAECOO, doté d'une intelligence conversationnelle avancée (qualité ChatGPT / Claude).

COMPRÉHENSION DU LANGAGE NATUREL ET FLEXIBILITÉ :
- Tu dois comprendre les salutations amicales ("bonjour", "salut", "hello") et répondre poliment en te présentant et en proposant des pistes d'analyse pertinentes.
- Tu dois comprendre TOUTES les formulations temporelles en français : "janv", "janvier", "01-2026", "2026-01", "le premier mois 2026", "août", "aout", "08-2026", "fin d'année", etc., et les faire correspondre aux périodes disponibles : ${grounding.availablePeriods.join(', ') || 'N/A'}.
- Tu dois comprendre les abréviations et fautes de frappe de l'utilisateur : "marq" = Marque, "annéé" / "annee" = Période / Année, "seg" = Segment, "mod" = Modèle.
- Exécute STRICTEMENT la tâche demandée par l'utilisateur sans la remplacer par une autre.

CONTEXTE DE COMPRÉHENSION SÉMANTIQUE DE LA BASE DE DONNÉES :
Fichier analysé : "${grounding.datasetName}" (${grounding.totalRows} lignes en base).
Colonnes identifiées par le système :
${grounding.profiles.map((p) => `- "${p.originalHeader}" : ${p.explanation} (Type: ${p.detectedDataType}, Rôle: ${p.semanticRole})`).join('\n')}

Plan d'analyse déduit :
- Dimension : ${grounding.plan.dimensionRoleExplanation}
- Métrique : ${grounding.plan.metricRoleExplanation}
- Périodes temporelles : ${grounding.availablePeriods.join(', ') || 'N/A'}

CHIFFRES RÉELS DE LA BASE :
- Ventes Totales : ${grounding.totalMarketSales} unités
- Leader : ${grounding.leaderBrand} (${grounding.leaderSales} unités)
- Marques disponibles : ${grounding.allBrands.map((b) => `${b.name} (${b.sales} unités, ${b.marketShare}%)`).slice(0, 15).join(', ')}
${grounding.segmentsData.length > 0 ? `- Segments : ${grounding.segmentsData.map((s) => `${s.name}: ${s.count}`).join(', ')}` : ''}
${grounding.sampleModelRows.length > 0 ? `\nÉCHANTILLON DE LIGNES MODÈLES AVEC LEURS VALEURS EXACTES PAR PÉRIODE :\n${JSON.stringify(grounding.sampleModelRows.slice(0, 40), null, 2)}` : ''}

RÈGLES ABSOLUES DE FORMAT ET DE DISCIPLINE PROFESSIONNELLE :
1. RESPECT STRICT DU FORMAT DEMANDÉ PAR L'UTILISATEUR (PAS DE HORS-SUJET) :
   - Si l'utilisateur demande une VALEUR, un CHIFFRE ou pose une question comme "combien", "quel est le nombre", "donne la valeur de X" :
     -> Réponds UNIQUEMENT avec la valeur précise et des fiches "calculations".
     -> Tu dois impérativement mettre chart = null et table = null ! Il est strictement interdit d'afficher un graphique ou un tableau quand l'utilisateur ne demande qu'une valeur.
   - Si l'utilisateur demande une COURBE ou une ÉVOLUTION :
     -> Génère chart avec type="line". table = null (sauf si demandé).
   - Si l'utilisateur demande un TABLEAU ou une LISTE :
     -> Génère table. chart = null (sauf si demandé).
   - Si l'utilisateur demande un CAMEMBERT ou une RÉPARTITION :
     -> Génère chart avec type="pie".
   - Si l'utilisateur demande un CLASSEMENT ou des BARRES :
     -> Génère chart avec type="bar".
   - Si l'utilisateur demande explicitement plusieurs formats (ex: "tableau et courbe"), génère les deux.
2. RIGUEUR MATHÉMATIQUE :
   - Fais des calculs 100% exacts à partir des chiffres réels fournis ci-dessus.
   - Si l'utilisateur demande la valeur d'un modèle et d'un mois précis (ex: 2026-01 ou "janv 2026"), trouve la valeur exacte dans la ligne correspondante.
3. Données absentes : Si l'utilisateur demande un élément non présent dans le fichier (ex: prix en Dinars, crash-test), indique-le via missingDataNotice.`;

    const responseSchema = {
      type: Type.OBJECT,
      properties: {
        reply: { type: Type.STRING },
        schemaInsight: {
          type: Type.STRING,
          description: "Explication concise de la compréhension de la colonne ou cellule en base",
        },
        calculations: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              label: { type: Type.STRING },
              value: { type: Type.STRING },
              type: { type: Type.STRING, enum: ['highlight', 'default', 'success', 'warning'] },
            },
            required: ['label', 'value'],
          },
        },
        chart: {
          type: Type.OBJECT,
          properties: {
            type: { type: Type.STRING, enum: ['bar', 'pie', 'line', 'comparison'] },
            title: { type: Type.STRING },
            description: { type: Type.STRING },
            data: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING },
                  value: { type: Type.NUMBER },
                  secondaryValue: { type: Type.NUMBER },
                  highlight: { type: Type.BOOLEAN },
                  share: { type: Type.STRING },
                },
                required: ['name', 'value'],
              },
            },
            xAxisLabel: { type: Type.STRING },
            yAxisLabel: { type: Type.STRING },
          },
        },
        table: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            description: { type: Type.STRING },
            headers: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
            rows: {
              type: Type.ARRAY,
              items: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
              },
            },
            totalSummary: { type: Type.STRING },
          },
        },
        missingDataNotice: { type: Type.STRING },
        suggestedFollowUps: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
        },
      },
      required: ['reply'],
    };

    for (const model of candidateModels) {
      try {
        const response = await ai.models.generateContent({
          model,
          contents: [
            { role: 'user', parts: [{ text: `${prompt}\n\nDemande de l'utilisateur : "${cleanQuery}"` }] },
          ],
          config: {
            responseMimeType: 'application/json',
            responseSchema,
          },
        });

        if (response.text) {
          const parsed = JSON.parse(response.text);
          if (parsed && typeof parsed.reply === 'string') {
            parsedResult = parsed;
            break;
          }
        }
      } catch (err: any) {
        const errStr = String(err?.message || err || '');
        const isTransient =
          errStr.includes('503') ||
          errStr.includes('high demand') ||
          errStr.includes('UNAVAILABLE') ||
          errStr.includes('429');

        if (!isTransient) {
          break;
        }
      }
    }

    if (parsedResult) {
      res.json(parsedResult);
      return;
    }

    res.json(buildDeterministicResponse(cleanQuery, grounding));
  } catch (error: any) {
    res.status(500).json({ error: error?.message || "Erreur de l'assistant." });
  }
}
