import { ImportedFileRecord, ImportStatus } from '../types/import';

const OLD_STORAGE_KEY = 'omoda_jaecoo_imported_files_v1';

// Cleanup any legacy browser localStorage imports so data is strictly loaded from backend DB
try {
  if (typeof window !== 'undefined' && window.localStorage) {
    window.localStorage.removeItem(OLD_STORAGE_KEY);
  }
} catch {
  // ignore storage errors
}

export interface BackendStats {
  totalImports: number;
  totalRows: number;
  totalColumns: number;
  storageType: string;
  mongoConnected: boolean;
  databaseName?: string;
  host?: string;
  edition?: string;
  cluster?: string;
}

export interface BackendHealth {
  status: string;
  service: string;
  database: {
    name: string;
    host: string;
    cluster: string;
    edition: string;
    connected: boolean;
    status: string;
  };
  timestamp: string;
}

class ImportService {
  /**
   * Check backend health and MongoDB connectivity status
   */
  async getHealth(): Promise<BackendHealth | null> {
    try {
      const res = await fetch('/api/health');
      if (res.ok) {
        return await res.json();
      }
    } catch (err) {
      console.warn('Erreur vérification santé backend:', err);
    }
    return null;
  }

  /**
   * POST /api/imports/test-connection
   * Test a custom MongoDB connection URI
   */
  async testMongoConnection(uri: string): Promise<{ success: boolean; message?: string; error?: string }> {
    try {
      const res = await fetch('/api/imports/test-connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uri }),
      });
      return await res.json();
    } catch (err: any) {
      return { success: false, error: err?.message || 'Erreur réseau de test.' };
    }
  }


  /**
   * GET /api/imports/stats/overview
   * Fetches statistics directly from the backend database
   */
  async getStatsOverview(): Promise<BackendStats> {
    try {
      const response = await fetch('/api/imports/stats/overview');
      if (response.ok) {
        return await response.json();
      }
    } catch (err) {
      console.warn('Erreur récupération stats backend:', err);
    }

    return {
      totalImports: 0,
      totalRows: 0,
      totalColumns: 0,
      databaseName: 'omoda_jaecoo_stats_db',
      host: 'localhost:27017',
      cluster: 'Standalone',
      edition: 'Mode Mémoire (MongoDB déconnecté)',
      storageType: 'En attente de données en base',
      mongoConnected: false,
    };
  }

  /**
   * GET /api/imports
   * Retrieve all confirmed file imports stored strictly in the backend database
   */
  async getAllImports(): Promise<ImportedFileRecord[]> {
    try {
      const response = await fetch('/api/imports');
      if (response.ok) {
        const data = await response.json();
        return Array.isArray(data) ? data : [];
      } else {
        console.error('Erreur backend HTTP lors de la récupération des imports:', response.status);
      }
    } catch (error) {
      console.error('Erreur réseau lors de la récupération des imports depuis le backend:', error);
    }

    // Never fallback to localStorage: imports must exist in the backend database
    return [];
  }

  /**
   * GET /api/imports/:id
   * Retrieve single import record from backend database
   */
  async getImportById(id: string): Promise<ImportedFileRecord | null> {
    try {
      const response = await fetch(`/api/imports/${encodeURIComponent(id)}`);
      if (response.ok) {
        return await response.json();
      }
    } catch (error) {
      console.error('Erreur récupération import par ID depuis le backend:', error);
    }

    return null;
  }

  /**
   * POST /api/imports
   * Confirms and persists an import record exclusively in the backend database.
   * Throws an error if backend persistence fails so the UI never displays unpersisted data.
   */
  async createImport(
    payload: Omit<ImportedFileRecord, 'id' | 'importedAt'>
  ): Promise<ImportedFileRecord> {
    const newRecord = {
      ...payload,
      id: `imp_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      importedAt: new Date().toISOString(),
    };

    const response = await fetch('/api/imports', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(newRecord),
    });

    if (!response.ok) {
      let errorMessage = "Erreur lors de l'enregistrement dans la base de données backend.";
      try {
        const errorData = await response.json();
        if (errorData.error) {
          errorMessage = errorData.error;
        }
      } catch {
        // ignore parsing error
      }
      throw new Error(errorMessage);
    }

    const created: ImportedFileRecord = await response.json();
    return created;
  }

  /**
   * DELETE /api/imports/:id
   * Delete an imported file record from backend database
   */
  async deleteImport(id: string): Promise<boolean> {
    try {
      const response = await fetch(`/api/imports/${encodeURIComponent(id)}`, {
        method: 'DELETE',
      });
      return response.ok;
    } catch (error) {
      console.error('Erreur suppression dans le backend:', error);
      return false;
    }
  }

  /**
   * Update status of an existing import record in the backend
   */
  async updateImportStatus(id: string, status: ImportStatus): Promise<boolean> {
    try {
      const response = await fetch(`/api/imports/${encodeURIComponent(id)}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status }),
      });
      return response.ok;
    } catch {
      return false;
    }
  }
}

export const importService = new ImportService();

