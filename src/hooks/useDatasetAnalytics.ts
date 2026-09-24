import { useQuery } from '@tanstack/react-query';
import { useState, useEffect } from 'react';
import { analyticsService } from '../services/analyticsService';
import {
  DatasetSummary,
  QueryRequest,
  QueryResult,
  FacetsResponse,
  FilterGroup,
} from '../types/analytics';

/**
 * Hook to debounce value changes (prevents rapid-fire API requests while typing or sliding)
 */
export function useDebounce<T>(value: T, delayMs: number = 300): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delayMs);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delayMs]);

  return debouncedValue;
}

/**
 * Fetches list of all imported datasets
 */
export function useDatasetsList() {
  return useQuery<DatasetSummary[]>({
    queryKey: ['datasets'],
    queryFn: ({ signal }) => analyticsService.fetchDatasets(signal),
    staleTime: 10000,
  });
}

/**
 * Fetches full metadata and columns for a specific dataset
 */
export function useDatasetDetails(id: string | null) {
  return useQuery<DatasetSummary>({
    queryKey: ['dataset', id],
    queryFn: ({ signal }) => {
      if (!id) throw new Error('ID de jeu de données requis');
      return analyticsService.fetchDatasetById(id, signal);
    },
    enabled: Boolean(id),
    staleTime: 60000,
  });
}

/**
 * Fetches cascading facets (dimensions and numeric ranges under active filters)
 */
export function useDatasetFacets(id: string | null, activeFilters?: FilterGroup) {
  const debouncedFilters = useDebounce(activeFilters, 250);

  return useQuery<FacetsResponse>({
    queryKey: ['facets', id, debouncedFilters],
    queryFn: ({ signal }) => {
      if (!id) throw new Error('ID de jeu de données requis');
      return analyticsService.fetchFacets(id, debouncedFilters, signal);
    },
    enabled: Boolean(id),
    staleTime: 15000,
  });
}

/**
 * Executes an analytics query with debouncing and query cancellation
 */
export function useDatasetQuery(
  id: string | null,
  queryRequest: QueryRequest,
  options?: { enabled?: boolean; debounceMs?: number }
) {
  const debouncedRequest = useDebounce(queryRequest, options?.debounceMs ?? 300);
  const isEnabled = Boolean(id) && (options?.enabled ?? true);

  return useQuery<QueryResult>({
    queryKey: ['datasetQuery', id, debouncedRequest],
    queryFn: ({ signal }) => {
      if (!id) throw new Error('ID requis');
      return analyticsService.executeQuery(id, debouncedRequest, signal);
    },
    enabled: isEnabled,
    staleTime: 15000,
  });
}
