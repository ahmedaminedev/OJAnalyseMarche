import {
  DatasetSummary,
  QueryRequest,
  QueryResult,
  FacetsResponse,
  FilterGroup,
} from '../types/analytics';

export class ApiError extends Error {
  public statusCode: number;
  public code?: string;

  constructor(message: string, statusCode: number, code?: string) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.code = code;
  }
}

export const analyticsService = {
  /**
   * Fetches all imported datasets
   */
  async fetchDatasets(signal?: AbortSignal): Promise<DatasetSummary[]> {
    const res = await fetch('/api/datasets', { signal });
    if (res.status === 503) {
      throw new ApiError('Base de données MongoDB non connectée ou injoignable (HTTP 503).', 503, 'DATABASE_OFFLINE');
    }
    if (!res.ok) {
      throw new ApiError(`Erreur lors du chargement des jeux de données: ${res.statusText}`, res.status);
    }
    return res.json();
  },

  /**
   * Fetches full metadata for a specific dataset
   */
  async fetchDatasetById(id: string, signal?: AbortSignal): Promise<DatasetSummary> {
    const res = await fetch(`/api/datasets/${id}`, { signal });
    if (res.status === 503) {
      throw new ApiError('Base de données MongoDB déconnectée (HTTP 503).', 503, 'DATABASE_OFFLINE');
    }
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new ApiError(errData.error || `Erreur chargement dataset (${res.statusText})`, res.status, errData.code);
    }
    return res.json();
  },

  /**
   * Executes a generic analytics query on the dataset
   */
  async executeQuery(
    id: string,
    request: QueryRequest,
    signal?: AbortSignal
  ): Promise<QueryResult> {
    const res = await fetch(`/api/datasets/${id}/query`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
      signal,
    });

    if (res.status === 503) {
      throw new ApiError('Base de données MongoDB déconnectée (HTTP 503).', 503, 'DATABASE_OFFLINE');
    }
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new ApiError(errData.error || `Erreur lors de la requête analytique`, res.status, errData.code);
    }
    return res.json();
  },

  /**
   * Computes cascading dimension facets and numeric ranges under active filters
   */
  async fetchFacets(
    id: string,
    filters?: FilterGroup,
    signal?: AbortSignal
  ): Promise<FacetsResponse> {
    const res = await fetch(`/api/datasets/${id}/facets`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ filters }),
      signal,
    });

    if (res.status === 503) {
      throw new ApiError('Base de données MongoDB déconnectée (HTTP 503).', 503, 'DATABASE_OFFLINE');
    }
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new ApiError(errData.error || `Erreur chargement facettes`, res.status, errData.code);
    }
    return res.json();
  },

  /**
   * Autocompletes distinct values for high cardinality columns (> 200 values)
   */
  async fetchColumnValues(
    id: string,
    columnKey: string,
    query: string = '',
    limit: number = 50,
    signal?: AbortSignal
  ): Promise<{ column: string; values: Array<{ value: any; count: number }>; total: number }> {
    const params = new URLSearchParams();
    if (query) params.append('q', query);
    params.append('limit', String(limit));

    const res = await fetch(`/api/datasets/${id}/columns/${columnKey}/values?${params.toString()}`, { signal });
    if (res.status === 503) {
      throw new ApiError('Base de données déconnectée (HTTP 503).', 503, 'DATABASE_OFFLINE');
    }
    if (!res.ok) {
      throw new ApiError(`Erreur autocomplétion colonne`, res.status);
    }
    return res.json();
  },

  /**
   * Exports query data to Excel (.xlsx) or CSV
   */
  async exportQuery(
    id: string,
    request: QueryRequest,
    format: 'xlsx' | 'csv' = 'xlsx'
  ): Promise<void> {
    const res = await fetch(`/api/datasets/${id}/export`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...request, format }),
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new ApiError(errData.error || `Erreur lors de l'exportation`, res.status);
    }

    const blob = await res.blob();
    const contentDisposition = res.headers.get('content-disposition');
    let filename = `export_${id}.${format}`;
    if (contentDisposition) {
      const match = contentDisposition.match(/filename="?([^"]+)"?/);
      if (match && match[1]) {
        filename = match[1];
      }
    }

    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  },

  /**
   * Fetches paginated raw rows for TanStack Table
   */
  async fetchRows(
    id: string,
    page: number = 1,
    pageSize: number = 50,
    sortField?: string,
    sortDir: 'asc' | 'desc' = 'asc',
    signal?: AbortSignal
  ): Promise<{ rows: any[]; total: number; page: number; pageSize: number; totalPages: number }> {
    const params = new URLSearchParams();
    params.append('page', String(page));
    params.append('pageSize', String(pageSize));
    if (sortField) {
      params.append('sortField', sortField);
      params.append('sortDir', sortDir);
    }

    const res = await fetch(`/api/datasets/${id}/rows?${params.toString()}`, { signal });
    if (res.status === 503) {
      throw new ApiError('Base de données déconnectée (HTTP 503).', 503, 'DATABASE_OFFLINE');
    }
    if (!res.ok) {
      throw new ApiError(`Erreur chargement des lignes`, res.status);
    }
    return res.json();
  },
};
