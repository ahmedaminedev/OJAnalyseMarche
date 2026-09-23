import { ImportRecordModel } from '../models/ImportRecord';
import { isMongoConnected } from '../config/db';

/**
 * Removes any legacy default mock/seed records so that the application
 * is 100% driven purely by user-imported Excel files.
 */
export async function cleanupLegacyDefaultData(): Promise<void> {
  try {
    if (isMongoConnected()) {
      const deleted = await ImportRecordModel.deleteMany({
        $or: [
          { id: 'attt-tunisie-2026-official' },
          { fileName: /Immatriculations_Automobiles_Tunisie_2026_ATTT/i },
          { importedBy: 'source-officielle@attt.tn' },
        ],
      });
      if (deleted.deletedCount > 0) {
        console.log(`🧹 [Clean DB] Supprimé ${deleted.deletedCount} ancien(s) jeu(x) de données par défaut.`);
      }
    }
  } catch (error) {
    console.warn('⚠️ [Clean DB] Erreur lors du nettoyage des données par défaut:', error);
  }
}
