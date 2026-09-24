import { create } from 'zustand';
import { FilterGroup, FilterCondition, SavedView } from '../types/analytics';

interface AnalyticsState {
  selectedDatasetId: string | null;
  filters: FilterGroup;
  savedViews: SavedView[];
  activeViewName: string | null;

  // Actions
  setSelectedDatasetId: (id: string | null) => void;
  setFilters: (filters: FilterGroup) => void;
  addCondition: (condition: FilterCondition) => void;
  removeCondition: (field: string) => void;
  updateCondition: (field: string, condition: Partial<FilterCondition>) => void;
  clearAllFilters: () => void;

  // Cross-filtering from chart clicks
  toggleCrossFilter: (field: string, value: any) => void;

  // URL synchronization
  syncFromUrl: () => void;
  syncToUrl: () => void;

  // Saved views
  saveView: (name: string) => void;
  loadView: (view: SavedView) => void;
  deleteView: (viewId: string) => void;
}

const DEFAULT_FILTERS: FilterGroup = {
  logic: 'AND',
  conditions: [],
};

const SAVED_VIEWS_STORAGE_KEY = 'oj_analytics_saved_views';

function loadSavedViewsFromStorage(): SavedView[] {
  try {
    const raw = localStorage.getItem(SAVED_VIEWS_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function persistSavedViewsToStorage(views: SavedView[]): void {
  try {
    localStorage.setItem(SAVED_VIEWS_STORAGE_KEY, JSON.stringify(views));
  } catch {
    // Ignore storage quota errors
  }
}

export const useAnalyticsStore = create<AnalyticsState>((set, get) => ({
  selectedDatasetId: null,
  filters: DEFAULT_FILTERS,
  savedViews: loadSavedViewsFromStorage(),
  activeViewName: null,

  setSelectedDatasetId: (id: string | null) => {
    set({
      selectedDatasetId: id,
      filters: DEFAULT_FILTERS,
      activeViewName: null,
    });
    get().syncToUrl();
  },

  setFilters: (filters: FilterGroup) => {
    set({ filters, activeViewName: null });
    get().syncToUrl();
  },

  addCondition: (condition: FilterCondition) => {
    const { filters } = get();
    // Replace if condition on same field already exists
    const existingIdx = filters.conditions.findIndex(
      (c) => !('logic' in c) && (c as FilterCondition).field === condition.field
    );

    let newConditions = [...filters.conditions];
    if (existingIdx !== -1) {
      newConditions[existingIdx] = condition;
    } else {
      newConditions.push(condition);
    }

    set({
      filters: { ...filters, conditions: newConditions },
      activeViewName: null,
    });
    get().syncToUrl();
  },

  removeCondition: (field: string) => {
    const { filters } = get();
    const newConditions = filters.conditions.filter(
      (c) => ('logic' in c) || (c as FilterCondition).field !== field
    );
    set({
      filters: { ...filters, conditions: newConditions },
      activeViewName: null,
    });
    get().syncToUrl();
  },

  updateCondition: (field: string, updates: Partial<FilterCondition>) => {
    const { filters } = get();
    const newConditions = filters.conditions.map((c) => {
      if (!('logic' in c) && (c as FilterCondition).field === field) {
        return { ...(c as FilterCondition), ...updates };
      }
      return c;
    });
    set({
      filters: { ...filters, conditions: newConditions },
      activeViewName: null,
    });
    get().syncToUrl();
  },

  clearAllFilters: () => {
    set({ filters: DEFAULT_FILTERS, activeViewName: null });
    get().syncToUrl();
  },

  toggleCrossFilter: (field: string, value: any) => {
    const { filters } = get();
    const existing = filters.conditions.find(
      (c) => !('logic' in c) && (c as FilterCondition).field === field
    ) as FilterCondition | undefined;

    if (!existing) {
      // Add 'eq' condition
      get().addCondition({ field, op: 'eq', value });
      return;
    }

    if (existing.op === 'eq') {
      if (existing.value === value) {
        // Toggle off
        get().removeCondition(field);
      } else {
        // Change value
        get().addCondition({ field, op: 'eq', value });
      }
    } else if (existing.op === 'in' && Array.isArray(existing.value)) {
      const arr = existing.value;
      if (arr.includes(value)) {
        const nextArr = arr.filter((v: any) => v !== value);
        if (nextArr.length === 0) {
          get().removeCondition(field);
        } else {
          get().addCondition({ field, op: 'in', value: nextArr });
        }
      } else {
        get().addCondition({ field, op: 'in', value: [...arr, value] });
      }
    }
  },

  syncFromUrl: () => {
    try {
      const params = new URLSearchParams(window.location.search);
      const datasetParam = params.get('dataset');
      const filtersParam = params.get('filters');

      let parsedFilters = DEFAULT_FILTERS;
      if (filtersParam) {
        try {
          parsedFilters = JSON.parse(decodeURIComponent(filtersParam));
        } catch {
          // Ignore invalid URL filter param
        }
      }

      set((state) => ({
        selectedDatasetId: datasetParam || state.selectedDatasetId,
        filters: parsedFilters,
      }));
    } catch {
      // Ignore
    }
  },

  syncToUrl: () => {
    try {
      const { selectedDatasetId, filters } = get();
      const url = new URL(window.location.href);

      if (selectedDatasetId) {
        url.searchParams.set('dataset', selectedDatasetId);
      } else {
        url.searchParams.delete('dataset');
      }

      if (filters.conditions && filters.conditions.length > 0) {
        url.searchParams.set('filters', encodeURIComponent(JSON.stringify(filters)));
      } else {
        url.searchParams.delete('filters');
      }

      window.history.replaceState({}, '', url.toString());
    } catch {
      // Ignore
    }
  },

  saveView: (name: string) => {
    const { selectedDatasetId, filters, savedViews } = get();
    if (!selectedDatasetId) return;

    const newView: SavedView = {
      id: `view_${Date.now()}`,
      name: name.trim(),
      datasetId: selectedDatasetId,
      filters: JSON.parse(JSON.stringify(filters)),
      createdAt: new Date().toISOString(),
    };

    const nextViews = [newView, ...savedViews];
    persistSavedViewsToStorage(nextViews);
    set({ savedViews: nextViews, activeViewName: newView.name });
  },

  loadView: (view: SavedView) => {
    set({
      selectedDatasetId: view.datasetId,
      filters: view.filters,
      activeViewName: view.name,
    });
    get().syncToUrl();
  },

  deleteView: (viewId: string) => {
    const { savedViews, activeViewName } = get();
    const nextViews = savedViews.filter((v) => v.id !== viewId);
    persistSavedViewsToStorage(nextViews);
    set({
      savedViews: nextViews,
      activeViewName: activeViewName && !nextViews.some((v) => v.name === activeViewName) ? null : activeViewName,
    });
  },
}));
