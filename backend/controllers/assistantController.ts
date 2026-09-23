import { Request, Response } from 'express';
import { GoogleGenAI, Type } from '@google/genai';
import { getTargetImportedFile } from '../data/importsStore';

interface DynamicGrounding {
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
  availableColumns: string[];
}

/**
 * Fetch imported dataset strictly from database or memory
 */
async function getTargetDataset(importId?: string): Promise<any | null> {
  return await getTargetImportedFile(importId);
}

/**
 * Computes exact mathematical grounding from the user's imported Excel file
 */
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
      availableColumns: [],
    };
  }

  const rows: any[] = dataset.previewData.rows;
  const cols: any[] = dataset.previewData.columns || [];

  const availableColumns = cols.map((c: any) => c.name || c.id || c.originalHeader);

  // Dynamic column detection
  const brandCol =
    cols.find((c: any) => /marque|brand|constructeur|nom|produit|categorie/i.test(c.name || c.id))?.id ||
    cols[0]?.id ||
    Object.keys(rows[0] || {})[0];

  const salesCol =
    cols.find((c: any) => /vente|sales|volume|immat|quantit|total|nombre|valeur/i.test(c.name || c.id))?.id ||
    cols.find((c: any) => c.id !== brandCol && (c.detectedType === 'number' || c.type === 'number'))?.id ||
    Object.keys(rows[0] || {})[1];

  const phevCol = cols.find((c: any) => /phev|hybride|rechargeable|electrique/i.test(c.name || c.id))?.id;

  const brandMap: Record<string, { sales: number; phevSales: number }> = {};

  rows.forEach((r) => {
    const rawBrand = r[brandCol];
    const brandName = rawBrand !== undefined && rawBrand !== null && String(rawBrand).trim() !== ''
      ? String(rawBrand).trim()
      : 'Autres';

    let rawSales = r[salesCol];
    if (typeof rawSales === 'string') {
      rawSales = Number(rawSales.replace(/\s+/g, '').replace(',', '.'));
    }
    const sales = !isNaN(Number(rawSales)) ? Number(rawSales) : 1;

    let rawPhev = phevCol ? r[phevCol] : 0;
    if (typeof rawPhev === 'string') {
      rawPhev = Number(rawPhev.replace(/\s+/g, '').replace(',', '.'));
    }
    const phevSales = !isNaN(Number(rawPhev)) ? Number(rawPhev) : 0;

    if (!brandMap[brandName]) {
      brandMap[brandName] = { sales: 0, phevSales: 0 };
    }
    brandMap[brandName].sales += sales;
    brandMap[brandName].phevSales += phevSales;
  });

  const sortedBrands = Object.entries(brandMap)
    .map(([name, data]) => ({
      name,
      sales: data.sales,
      phevSales: data.phevSales,
      marketShare: 0,
    }))
    .sort((a, b) => b.sales - a.sales);

  const totalMarketSales = sortedBrands.reduce((acc, curr) => acc + curr.sales, 0) || 1;
  const totalPhevSales = sortedBrands.reduce((acc, curr) => acc + curr.phevSales, 0);

  sortedBrands.forEach((b) => {
    b.marketShare = Number(((b.sales / totalMarketSales) * 100).toFixed(2));
  });

  const leader = sortedBrands[0] || { name: 'Aucun', sales: 0 };
  const lowest = sortedBrands[sortedBrands.length - 1] || leader;

  return {
    hasData: true,
    datasetName: dataset.fileName,
    datasetId: dataset.id,
    totalRows: dataset.totalRows || rows.length,
    totalMarketSales,
    totalPhevSales,
    leaderBrand: leader.name,
    leaderSales: leader.sales,
    lowestBrand: lowest.name,
    lowestSales: lowest.sales,
    allBrands: sortedBrands,
    availableColumns,
  };
}

/**
 * Normalizes user queries by trimming noise, trailing +, multiple spaces
 */
function cleanUserQuery(raw: string): string {
  if (!raw) return '';
  let cleaned = raw.trim();
  cleaned = cleaned.replace(/\s*([+*])\s*$/g, '');
  cleaned = cleaned.replace(/\s+/g, ' ');
  return cleaned;
}

/**
 * Fallback response engine strictly operating on the imported file
 */
function buildDeterministicResponse(query: string, grounding: DynamicGrounding) {
  if (!grounding.hasData) {
    return {
      reply:
        "Aucun fichier Excel n'est actuellement importé dans la plateforme. Veuillez importer un fichier (.xlsx ou .xls) dans la section 'Données & Imports'. Dès son importation, je pourrai analyser vos données et générer les graphiques correspondants.",
      calculations: [],
      chart: null,
      missingDataNotice: 'Aucun fichier actif. Veuillez importer un fichier Excel.',
      suggestedFollowUps: ['Comment importer un fichier Excel ?', 'Quels formats sont acceptés ?'],
    };
  }

  const q = query.toLowerCase();

  // Price or unlisted metric check
  if (/prix|tarif|combien cout|dinars?|tnd|crashtest|securit/i.test(q)) {
    return {
      reply: `Les données relatives aux prix, tarifs en Dinars (TND) ou crash-tests ne figurent pas dans votre fichier importé **"${grounding.datasetName}"**.\n\nCe fichier contient ${grounding.totalRows} lignes réelles portant sur les colonnes suivantes : ${grounding.availableColumns.join(', ')}.`,
      missingDataNotice: `Donnée absente du fichier importé "${grounding.datasetName}". Le fichier couvre : ${grounding.availableColumns.join(', ')}.`,
      suggestedFollowUps: [
        `Donne-moi le top 5 des ventes du fichier`,
        `Quel est le volume total enregistré ?`,
        `Qui est le premier et le dernier du fichier ?`,
      ],
    };
  }

  // Best / Worst check
  if (/meuilleur|meilleur|top|premier|plus vendu|moin|moins|pire|dernier|bas/i.test(q)) {
    return {
      reply: `D'après votre fichier importé **"${grounding.datasetName}"** (${grounding.totalRows} lignes) :\n\n- **Premier du classement** : **${grounding.leaderBrand}** avec **${grounding.leaderSales.toLocaleString('fr-FR')} unités**.\n- **Dernier du classement** : **${grounding.lowestBrand}** avec **${grounding.lowestSales.toLocaleString('fr-FR')} unités**.\n- **Volume global total** : **${grounding.totalMarketSales.toLocaleString('fr-FR')} unités**.`,
      calculations: [
        { label: 'Premier', value: `${grounding.leaderBrand} (${grounding.leaderSales.toLocaleString('fr-FR')})`, type: 'success' },
        { label: 'Dernier', value: `${grounding.lowestBrand} (${grounding.lowestSales.toLocaleString('fr-FR')})`, type: 'warning' },
        { label: 'Volume Total Fichier', value: `${grounding.totalMarketSales.toLocaleString('fr-FR')} unités`, type: 'highlight' },
      ],
      chart: {
        type: 'bar',
        title: `Premier vs Dernier - ${grounding.datasetName}`,
        data: [
          { name: grounding.leaderBrand, value: grounding.leaderSales, highlight: true },
          { name: grounding.lowestBrand, value: grounding.lowestSales },
        ],
      },
      suggestedFollowUps: [
        'Donne-moi le top 5 complet',
        'Répartition en camembert des volumes',
      ],
    };
  }

  // Top items chart
  const topList = grounding.allBrands.slice(0, 6);
  return {
    reply: `Voici l'analyse basée sur votre fichier importé **"${grounding.datasetName}"** (${grounding.totalRows} lignes réelles) :\n\nLe volume total calculé est de **${grounding.totalMarketSales.toLocaleString('fr-FR')} unités**. Le leader est **${grounding.leaderBrand}** avec **${grounding.leaderSales.toLocaleString('fr-FR')} unités**.`,
    calculations: [
      { label: 'Fichier', value: grounding.datasetName || '', type: 'highlight' },
      { label: 'Lignes', value: `${grounding.totalRows} lignes`, type: 'default' },
      { label: 'Leader', value: `${grounding.leaderBrand} (${grounding.leaderSales.toLocaleString('fr-FR')})`, type: 'success' },
    ],
    chart: {
      type: 'bar',
      title: `Volumes Principaux - ${grounding.datasetName}`,
      data: topList.map((b, i) => ({
        name: b.name,
        value: b.sales,
        highlight: i === 0,
        share: `${b.marketShare}%`,
      })),
    },
    suggestedFollowUps: [
      'Qui est le meilleur et le plus bas ?',
      'Afficher la répartition en pourcentage',
    ],
  };
}

/**
 * POST /api/assistant/chat
 * Conversational AI grounded 100% on the user's uploaded Excel file
 */
export async function chatWithAssistant(req: Request, res: Response): Promise<void> {
  try {
    const { message, importId, conversationHistory } = req.body;
    const cleanQuery = cleanUserQuery(message || '');

    if (!cleanQuery) {
      res.status(400).json({ error: 'Message vide.' });
      return;
    }

    const dataset = await getTargetDataset(importId);
    const grounding = computeDynamicGrounding(dataset);

    // If no dataset is imported yet, return the honest notice
    if (!grounding.hasData) {
      res.json({
        reply:
          "Bonjour ! Aucun fichier Excel n'est actuellement importé dans la plateforme. Veuillez importer un fichier (.xlsx ou .xls) dans la section 'Données & Imports'. Dès son importation, je pourrai analyser vos données en direct et générer vos graphiques.",
        calculations: [],
        chart: null,
        missingDataNotice: 'Aucun fichier Excel disponible. Veuillez importer un fichier de données.',
        suggestedFollowUps: ['Comment importer un fichier Excel ?', 'Quels formats sont acceptés ?'],
      });
      return;
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      res.json(buildDeterministicResponse(cleanQuery, grounding));
      return;
    }

    try {
      const ai = new GoogleGenAI({ apiKey });
      const prompt = `Tu es l'Assistant IA Expert en Analyse de Données Automobile de l'application OMODA & JAECOO.

RÈGLE ABSOLUE :
Tu dois répondre STRICTEMENT et EXCLUSIVEMENT à partir des données réelles du fichier Excel importé par l'utilisateur.
Ne cite JAMAIS de source fictive ou ancienne comme "ATTT". Ta seule source est le fichier "${grounding.datasetName}".

DONNÉES DU FICHIER IMPORTÉ PAR L'UTILISATEUR :
- Nom du fichier : "${grounding.datasetName}"
- Nombre total de lignes : ${grounding.totalRows}
- Colonnes détectées dans le fichier : ${grounding.availableColumns.join(', ')}
- Volume total calculé : ${grounding.totalMarketSales.toLocaleString('fr-FR')}
- Ventes PHEV totales (si présentes) : ${grounding.totalPhevSales}
- Premier / Meilleur : ${grounding.leaderBrand} (${grounding.leaderSales} unités)
- Dernier / Plus faible : ${grounding.lowestBrand} (${grounding.lowestSales} unités)
- Toutes les marques et volumes du fichier :
${grounding.allBrands
  .slice(0, 30)
  .map((b) => `  * ${b.name}: ${b.sales} unités (${b.marketShare}% PDM), PHEV: ${b.phevSales}`)
  .join('\n')}

CONSIGNES :
1. Tolère toutes les fautes d'orthographe, de grammaire et caractères spéciaux de l'utilisateur.
2. Si l'utilisateur demande une courbe ou une comparaison (ex: omoda + chery), extrais les éléments et génère un graphique adapté ("bar", "pie", ou "line").
3. Si la donnée demandée n'existe pas dans le fichier (ex: prix en Dinars, crash tests), préviens l'utilisateur avec précision via missingDataNotice.
4. Réponds toujours en JSON valide avec reply, calculations, chart, missingDataNotice, suggestedFollowUps.`;

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: [
          { role: 'user', parts: [{ text: `${prompt}\n\nQuestion de l'utilisateur : "${cleanQuery}"` }] },
        ],
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              reply: { type: Type.STRING },
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
                required: ['type', 'title', 'data'],
              },
              missingDataNotice: { type: Type.STRING },
              suggestedFollowUps: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
              },
            },
            required: ['reply'],
          },
        },
      });

      const parsed = JSON.parse(response.text || '{}');
      res.json(parsed);
    } catch (aiErr) {
      console.warn('Gemini AI fallback in assistant:', aiErr);
      res.json(buildDeterministicResponse(cleanQuery, grounding));
    }
  } catch (error: any) {
    console.error('Erreur chatWithAssistant:', error);
    res.status(500).json({ error: error?.message || "Erreur de l'assistant." });
  }
}
