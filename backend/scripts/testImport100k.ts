import { MongoClient, ObjectId } from 'mongodb';
import dotenv from 'dotenv';
import { generateColumnKey, sanitizeRowData } from '../utils/typeConverter';
import { performReconciliation, calculateColumnStatistics } from '../utils/reconciliation';
import { createDatasetIndexes } from '../services/indexService';
import { DatasetColumn, DatasetDocument, RowDocument } from '../types/dataset';

dotenv.config();

/**
 * Benchmark & Quality Verification Script: 100,000 Rows Import
 * Tests chunking (2,000 rows per batch = 50 batches), type conversion,
 * and verifies exact rowCount and numeric checksums reconciliation.
 */
async function run100kImportTest() {
  console.log('\n========================================================================');
  console.log('🚀 TEST DE CHARGE ET RÉCONCILIATION SUR 100 000 LIGNES');
  console.log('========================================================================\n');

  const mongoUri = process.env.MONGODB_URI?.trim();
  const dbName = process.env.MONGODB_DB_NAME?.trim() || 'omoda_jaecoo_test_db';

  let client: MongoClient | null = null;
  let useInMemoryMock = false;

  if (mongoUri) {
    try {
      console.log(`📡 Connexion à MongoDB (${dbName})...`);
      client = new MongoClient(mongoUri, { serverSelectionTimeoutMS: 5000 });
      await client.connect();
      console.log('✅ Connecté avec succès à MongoDB pour le test.');
    } catch (err: any) {
      console.warn('⚠️ MongoDB non joignable via MONGODB_URI. Exécution avec le moteur de simulation in-memory.');
      useInMemoryMock = true;
    }
  } else {
    console.log('ℹ️ MONGODB_URI non renseigné. Exécution de la validation de flux en mémoire (100k lignes).');
    useInMemoryMock = true;
  }

  const TOTAL_ROWS = 100_000;
  const CHUNK_SIZE = 2_000;
  const TOTAL_CHUNKS = Math.ceil(TOTAL_ROWS / CHUNK_SIZE);

  console.log(`📊 Paramètres du test :`);
  console.log(`   - Nombre total de lignes : ${TOTAL_ROWS.toLocaleString('fr-FR')}`);
  console.log(`   - Taille d'un lot        : ${CHUNK_SIZE.toLocaleString('fr-FR')} lignes`);
  console.log(`   - Nombre de lots         : ${TOTAL_CHUNKS}`);
  console.log(`   - Colonnes testées       : 7 (Texte, Dimensions, Mesures numériques, Date)\n`);

  // Column definitions
  const columns: DatasetColumn[] = [
    { key: 'id_immat', label: 'Immatriculation ID', type: 'string', role: 'id', nullCount: 0, distinctCount: 0 },
    { key: 'marque', label: 'Marque', type: 'string', role: 'dimension', nullCount: 0, distinctCount: 0 },
    { key: 'modele', label: 'Modèle', type: 'string', role: 'dimension', nullCount: 0, distinctCount: 0 },
    { key: 'energie', label: 'Énergie', type: 'string', role: 'dimension', nullCount: 0, distinctCount: 0 },
    { key: 'quantite_ventes', label: 'Quantité Ventes', type: 'number', role: 'measure', nullCount: 0, distinctCount: 0 },
    { key: 'prix_unitaire_tnd', label: 'Prix Unitaire (TND)', type: 'number', role: 'measure', nullCount: 0, distinctCount: 0 },
    { key: 'date_immatriculation', label: 'Date Immatriculation', type: 'date', role: 'date', nullCount: 0, distinctCount: 0 },
  ];

  const brands = ['OMODA', 'JAECOO', 'CHERY', 'TOYOTA', 'PEUGEOT', 'VOLKSWAGEN', 'HYUNDAI', 'KIA', 'BYD', 'MG'];
  const models = ['C5', '7', '8', 'TIGGO 8', 'YARIS', '208', 'GOLF', 'TUCSON', 'SPORTAGE', 'ATTO 3'];
  const energies = ['PHEV', 'Essence', 'Hybride', 'Électrique', 'Diesel'];

  // Accumulators for client checksum expectations
  let expectedSumQuantite = 0;
  let expectedSumPrix = 0;

  const datasetId = new ObjectId();
  const startTime = Date.now();

  // In-memory mock storage if MongoDB offline
  const mockStorage: RowDocument[] = [];

  const db = client ? client.db(dbName) : null;
  const datasetsCol = db ? db.collection<DatasetDocument>('datasets') : null;
  const rowsCol = db ? db.collection<RowDocument>('rows') : null;

  if (datasetsCol) {
    await datasetsCol.insertOne({
      _id: datasetId,
      name: 'Test Benchmark 100k',
      fileName: 'benchmark_100k_lignes.xlsx',
      fileHash: 'sha256_bench_100k_test',
      fileSizeBytes: 24_500_000,
      sheetName: 'Données_2026',
      importedAt: new Date(),
      importedBy: 'benchmark@test.local',
      status: 'PROCESSING',
      rowCount: 0,
      columns,
    });
  }

  console.log('⚡ Début du traitement et envoi des lots par paquets de 2 000 lignes...');
  const chunkStartTime = Date.now();

  for (let chunkIdx = 0; chunkIdx < TOTAL_CHUNKS; chunkIdx++) {
    const startRowNumber = chunkIdx * CHUNK_SIZE + 1;
    const endRowNumber = Math.min((chunkIdx + 1) * CHUNK_SIZE, TOTAL_ROWS);
    const chunkRows: any[] = [];

    for (let r = startRowNumber; r <= endRowNumber; r++) {
      // Deterministic synthetic values
      const bIdx = r % brands.length;
      const mIdx = r % models.length;
      const eIdx = r % energies.length;
      const quantite = (r % 25) + 1; // 1 to 25
      const prix = 45000 + (r % 50000); // 45000 to 95000

      expectedSumQuantite += quantite;
      expectedSumPrix += prix;

      const rawRow = {
        'Immatriculation ID': `TN-${100000 + r}-TUNIS`,
        'Marque': brands[bIdx],
        'Modèle': models[mIdx],
        'Énergie': energies[eIdx],
        'Quantité Ventes': `${quantite}`,
        'Prix Unitaire (TND)': `${prix},00 TND`,
        'Date Immatriculation': '15/06/2026',
      };

      const sanitized = sanitizeRowData(rawRow, columns);
      chunkRows.push({
        datasetId,
        rowNumber: r,
        chunkIndex: chunkIdx,
        data: sanitized,
      });
    }

    // Insert chunk into real DB or memory mock
    if (rowsCol) {
      await rowsCol.insertMany(chunkRows, { ordered: false });
    } else {
      mockStorage.push(...chunkRows);
    }

    if ((chunkIdx + 1) % 10 === 0 || chunkIdx === TOTAL_CHUNKS - 1) {
      const elapsedSec = ((Date.now() - chunkStartTime) / 1000).toFixed(2);
      const rowsDone = Math.min((chunkIdx + 1) * CHUNK_SIZE, TOTAL_ROWS);
      const percent = Math.round((rowsDone / TOTAL_ROWS) * 100);
      const rate = Math.round(rowsDone / (parseFloat(elapsedSec) || 1));
      console.log(`   ➜ Lot ${chunkIdx + 1}/${TOTAL_CHUNKS} (${percent}%) - ${rowsDone.toLocaleString('fr-FR')} lignes insérées [${rate} lignes/sec]`);
    }
  }

  const importDuration = ((Date.now() - chunkStartTime) / 1000).toFixed(2);
  console.log(`\n⏱️  Temps total d'ingestion des 100 000 lignes : ${importDuration} secondes.`);

  console.log('\n🔍 Démarrage de la RÉCONCILIATION SERVEUR ($count, $sum)...');
  const reconStartTime = Date.now();

  let actualRows = 0;
  let actualSumQuantite = 0;
  let actualSumPrix = 0;

  if (rowsCol) {
    actualRows = await rowsCol.countDocuments({ datasetId });
    const agg = await rowsCol
      .aggregate([
        { $match: { datasetId } },
        {
          $group: {
            _id: null,
            sumQuantite: { $sum: '$data.quantite_ventes' },
            sumPrix: { $sum: '$data.prix_unitaire_tnd' },
          },
        },
      ])
      .toArray();

    actualSumQuantite = agg[0]?.sumQuantite || 0;
    actualSumPrix = agg[0]?.sumPrix || 0;
  } else {
    actualRows = mockStorage.length;
    actualSumQuantite = mockStorage.reduce((acc, r) => acc + ((r.data.quantite_ventes as number) || 0), 0);
    actualSumPrix = mockStorage.reduce((acc, r) => acc + ((r.data.prix_unitaire_tnd as number) || 0), 0);
  }

  const reconDuration = ((Date.now() - reconStartTime) / 1000).toFixed(2);

  console.log(`\n📋 RÉSULTATS DE LA RÉCONCILIATION (${reconDuration}s) :`);
  console.log(`   ---------------------------------------------------------------------`);
  console.log(`   Métrique              | Attendu (Client)      | Réel (Serveur / BDD)   | Statut`);
  console.log(`   ---------------------------------------------------------------------`);

  const rowMatch = actualRows === TOTAL_ROWS;
  console.log(`   Nombre de lignes      | ${TOTAL_ROWS.toLocaleString('fr-FR').padEnd(21)} | ${actualRows.toLocaleString('fr-FR').padEnd(22)} | ${rowMatch ? '✅ MATCH' : '❌ ÉCART'}`);

  const quantiteMatch = actualSumQuantite === expectedSumQuantite;
  console.log(`   Somme Ventes (Unités) | ${expectedSumQuantite.toLocaleString('fr-FR').padEnd(21)} | ${actualSumQuantite.toLocaleString('fr-FR').padEnd(22)} | ${quantiteMatch ? '✅ MATCH' : '❌ ÉCART'}`);

  const prixMatch = actualSumPrix === expectedSumPrix;
  console.log(`   Somme Prix TTC (TND)  | ${expectedSumPrix.toLocaleString('fr-FR').padEnd(21)} | ${actualSumPrix.toLocaleString('fr-FR').padEnd(22)} | ${prixMatch ? '✅ MATCH' : '❌ ÉCART'}`);
  console.log(`   ---------------------------------------------------------------------`);

  // Cleanup benchmark test data if connected to real DB
  if (db && datasetsCol && rowsCol) {
    console.log('\n🧹 Nettoyage des données de test 100k...');
    await rowsCol.deleteMany({ datasetId });
    await datasetsCol.deleteOne({ _id: datasetId });
    console.log('✅ Nettoyage terminé.');
    await client?.close();
  }

  const totalTime = ((Date.now() - startTime) / 1000).toFixed(2);
  console.log(`\n✨ Test 100 000 lignes terminé avec succès en ${totalTime} secondes !`);

  if (!rowMatch || !quantiteMatch || !prixMatch) {
    console.error('❌ Échec du test : au moins un checksum ou le nombre de lignes ne correspond pas.');
    process.exit(1);
  } else {
    console.log('🎉 100% DES TOTAUX ET LIGNES SONT EXACTEMENT RÉCONCILIÉS SANS AUCUNE PERTE.\n');
  }
}

run100kImportTest().catch((err) => {
  console.error('Erreur fatale lors du test 100k:', err);
  process.exit(1);
});
