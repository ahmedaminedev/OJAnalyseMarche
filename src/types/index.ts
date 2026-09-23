export type PageView = 'home' | 'dashboard';

export interface UserSession {
  name: string;
  role: string;
  email: string;
  avatarUrl?: string;
}

export interface MetricCardData {
  id: string;
  title: string;
  value: string;
  trend: string;
  isPositive: boolean;
  type: 'total' | 'omoda' | 'jaecoo' | 'share';
  sparkline: number[];
}

export interface SalesHistoryPoint {
  month: string;
  omoda: number;
  jaecoo: number;
  total: number;
}

export interface ModelSalesShare {
  name: string;
  brand: 'OMODA' | 'JAECOO' | 'AUTRES';
  percentage: number;
  count: number;
  color: string;
}

export interface RegionalSales {
  region: string;
  percentage: number;
  salesCount: number;
  coordinates: { x: number; y: number }; // Relative coordinates on Tunisia SVG map (0-100)
}

export interface TopModel {
  rank: number;
  name: string;
  brand: 'OMODA' | 'JAECOO';
  salesCount: number;
  image: string;
  category: string;
}

export interface ActivityLog {
  id: string;
  title: string;
  category: 'Données' | 'Analyse' | 'Rapports' | 'Administrateur';
  timestamp: string;
  type: 'upload' | 'analytics' | 'report' | 'user';
}
