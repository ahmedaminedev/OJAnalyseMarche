import {
  MetricCardData,
  SalesHistoryPoint,
  ModelSalesShare,
  RegionalSales,
  TopModel,
  ActivityLog,
} from '../types';

import heroImg from '../assets/images/omoda_jaecoo_hero_1789945065937.jpg';
import c5Thumb from '../assets/images/omoda_c5_thumb_1789945079316.jpg';
import j7Thumb from '../assets/images/jaecoo_7_thumb_1789945093344.jpg';

export const ASSETS = {
  // Real automobile.tn official event / vehicles image requested for home page
  homeHero: 'https://news.automobile.tn/2026/03/omoda-jaecoo-2926_max.webp?t=1772879176',
  // Real requested image for the dashboard page (displayed after login)
  dashboardHero: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQIrrTQlNlFlXlBH7wVB2tMJRnvX3lxpZqr3h8vCSTvUg&s',
  hero: heroImg,
  c5: c5Thumb,
  j7: j7Thumb,
};

export const METRICS_DATA: MetricCardData[] = [
  {
    id: 'total_sales',
    title: 'Ventes totales',
    value: '12 458',
    trend: '+12,5%',
    isPositive: true,
    type: 'total',
    sparkline: [35, 42, 58, 52, 68, 80],
  },
  {
    id: 'omoda_sales',
    title: 'Ventes OMODA',
    value: '6 732',
    trend: '+10,3%',
    isPositive: true,
    type: 'omoda',
    sparkline: [25, 30, 42, 38, 48, 55],
  },
  {
    id: 'jaecoo_sales',
    title: 'Ventes JAECOO',
    value: '5 726',
    trend: '+15,2%',
    isPositive: true,
    type: 'jaecoo',
    sparkline: [18, 22, 28, 25, 35, 42],
  },
  {
    id: 'market_share',
    title: 'Part de marché',
    value: '18,7%',
    trend: '+2,4%',
    isPositive: true,
    type: 'share',
    sparkline: [14, 15, 16.5, 16.2, 17.5, 18.7],
  },
];

export const SALES_EVOLUTION_6M: SalesHistoryPoint[] = [
  { month: 'Avr 2025', omoda: 720, jaecoo: 430, total: 1150 },
  { month: 'Mai 2025', omoda: 1050, jaecoo: 680, total: 1730 },
  { month: 'Juin 2025', omoda: 1480, jaecoo: 920, total: 2400 },
  { month: 'Juil 2025', omoda: 1390, jaecoo: 860, total: 2250 },
  { month: 'Août 2025', omoda: 1650, jaecoo: 1080, total: 2730 },
  { month: 'Sept 2025', omoda: 1890, jaecoo: 1320, total: 3210 },
];

export const MODEL_SALES_DISTRIBUTION: ModelSalesShare[] = [
  { name: 'OMODA E5', brand: 'OMODA', percentage: 32.4, count: 4036, color: '#ff284d' },
  { name: 'OMODA C5', brand: 'OMODA', percentage: 24.7, count: 3077, color: '#ff5c73' },
  { name: 'JAECOO 7', brand: 'JAECOO', percentage: 18.9, count: 2354, color: '#62738d' },
  { name: 'JAECOO 8', brand: 'JAECOO', percentage: 12.6, count: 1570, color: '#94a3b8' },
  { name: 'Autres', brand: 'AUTRES', percentage: 11.4, count: 1421, color: '#334155' },
];

export const REGIONAL_SALES: RegionalSales[] = [
  { region: 'Tunis', percentage: 28.6, salesCount: 3563, coordinates: { x: 55, y: 18 } },
  { region: 'Sousse', percentage: 18.7, salesCount: 2330, coordinates: { x: 58, y: 35 } },
  { region: 'Sfax', percentage: 16.2, salesCount: 2018, coordinates: { x: 62, y: 52 } },
  { region: 'Sfax Nord / Bizerte', percentage: 11.9, salesCount: 1482, coordinates: { x: 45, y: 12 } },
  { region: 'Gabès', percentage: 8.4, salesCount: 1046, coordinates: { x: 52, y: 68 } },
  { region: 'Autres', percentage: 6.2, salesCount: 772, coordinates: { x: 38, y: 45 } },
];

export const TOP_MODELS: TopModel[] = [
  {
    rank: 1,
    name: 'OMODA C5',
    brand: 'OMODA',
    salesCount: 3214,
    image: c5Thumb,
    category: 'SUV Coupé Urbain',
  },
  {
    rank: 2,
    name: 'OMODA E5',
    brand: 'OMODA',
    salesCount: 2876,
    image: c5Thumb,
    category: '100% Électrique',
  },
  {
    rank: 3,
    name: 'JAECOO 7',
    brand: 'JAECOO',
    salesCount: 2341,
    image: j7Thumb,
    category: 'SUV Tout-Terrain Premium',
  },
  {
    rank: 4,
    name: 'JAECOO 8',
    brand: 'JAECOO',
    salesCount: 1982,
    image: j7Thumb,
    category: 'Grand SUV 7 Places',
  },
  {
    rank: 5,
    name: 'OMODA 9',
    brand: 'OMODA',
    salesCount: 1122,
    image: c5Thumb,
    category: 'Flagship PHEV',
  },
];

export const RECENT_ACTIVITIES: ActivityLog[] = [
  {
    id: 'act-1',
    title: 'Importation du fichier ventes_septembre.xlsx',
    category: 'Données',
    timestamp: 'Il y a 2 heures',
    type: 'upload',
  },
  {
    id: 'act-2',
    title: 'Nouvelle analyse créée',
    category: 'Analyse',
    timestamp: 'Il y a 4 heures',
    type: 'analytics',
  },
  {
    id: 'act-3',
    title: 'Rapport mensuel généré',
    category: 'Rapports',
    timestamp: 'Il y a 6 heures',
    type: 'report',
  },
  {
    id: 'act-4',
    title: 'Utilisateur connecté',
    category: 'Administrateur',
    timestamp: 'Il y a 8 heures',
    type: 'user',
  },
];
