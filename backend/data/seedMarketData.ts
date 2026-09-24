import { isMongoConnected, getDatasetsCollection, getRowsCollection } from '../config/db';

/**
 * Removes any legacy default mock/seed records so that the application
 * is 100% driven purely by user-imported Excel files.
 */
export async function cleanupLegacyDefaultData(): Promise<void> {
  try {
    if (isMongoConnected()) {
      const datasetsCol = getDatasetsCollection();
      const rowsCol = getRowsCollection();

      const legacyDatasets = await datasetsCol.find({
        $or: [
          { fileName: /Immatriculations_Automobiles_Tunisie_2026_ATTT/i },
          { importedBy: 'source-officielle@attt.tn' },
        ],
      }).toArray();

      for (const d of legacyDatasets) {
        await rowsCol.deleteMany({ datasetId: d._id });
        await datasetsCol.deleteOne({ _id: d._id });
      }

      if (legacyDatasets.length > 0) {
        console.log(`🧹 [Clean DB] Supprimé ${legacyDatasets.length} ancien(s) jeu(x) de données par défaut.`);
      }
    }
  } catch (error) {
    console.warn('⚠️ [Clean DB] Avertissement lors du nettoyage des données par défaut:', error);
  }
}
