# OMODA | JAECOO — Système Universel d'Import & d'Analyse (Power BI Style)

Plateforme web d'analyse de données tabulaires pour le marché automobile (OMODA & JAECOO).
Moteur d'importation dynamique et générique sans nom de colonne codé en dur, avec ingestion par lots, typage strict, contrôle d'intégrité SHA-256 et réconciliation exacte sur MongoDB Atlas.

---

## 🛠️ Stack Technique

- **Frontend** : React 19, TypeScript, Vite, Tailwind CSS, TanStack Table, Motion.
- **Backend** : Node.js, Express, TypeScript (`tsx`).
- **Base de données** : MongoDB (Atlas ou local) via le **driver officiel `mongodb`**.
- **Tests** : Vitest.

---

## ⚙️ Configuration (.env)

Créez un fichier `.env` à la racine du projet à partir de `.env.example` :

```env
# Port d'écoute du serveur unifié (Frontend + Backend)
PORT=3000

# Nom de la base de données cible sur MongoDB
MONGODB_DB_NAME=omoda_jaecoo_stats_db

# URI de connexion MongoDB Atlas ou local (driver officiel mongodb)
# Exemple MongoDB Atlas :
MONGODB_URI=mongodb+srv://<username>:<password>@cluster0.abcde.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0

# (Optionnel) Clé API Google Gemini pour les synthèses IA
GEMINI_API_KEY=

# (Optionnel) Email par défaut pour l'attribution des imports
DEFAULT_IMPORT_USER=utilisateur@omoda-jaecoo.tn
```

> **Règle stricte** : Si `MONGODB_URI` n'est pas renseigné ou si le serveur MongoDB est injoignable, le backend renvoie explicitement une erreur HTTP `503 Service Unavailable` avec le code `DATABASE_OFFLINE`. Aucun faux cache mémoire n'est utilisé pour simuler un succès.

---

## 🚀 Démarrage du Projet

### 1. Installation des dépendances
```bash
npm install
```

### 2. Lancement en développement (Serveur unifié sur le port 3000)
```bash
npm run dev
```
Le serveur Express démarre sur `http://localhost:3000` et monte Vite en middleware :
- API Backend : `http://localhost:3000/api`
- Frontend React SPA : `http://localhost:3000`

### 3. Exécution des tests unitaires
```bash
npm run test
```

### 4. Test de charge & Réconciliation sur 100 000 lignes
```bash
npm run test:100k
```
Ce script génère 100 000 lignes, les découpe en 50 lots de 2 000 lignes, exécute le typage, calcule les checksums et valide la réconciliation exacte à 100%.

### 5. Build de production
```bash
npm run build
npm run start
```

---

## 🗄️ Modèle de Données (Driver Officiel MongoDB)

Le système utilise 2 collections principales sans aucun schéma rigide ni colonnes préconfigurées :

### 1. Collection `datasets`
Stocke un document léger par fichier importé :
```json
{
  "_id": "ObjectId(...)",
  "name": "Immatriculations 2026",
  "fileName": "ventes_2026.xlsx",
  "fileHash": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
  "fileSizeBytes": 2450000,
  "sheetName": "Feuil1",
  "importedAt": "2026-09-24T12:00:00.000Z",
  "importedBy": "admin@omoda-jaecoo.tn",
  "status": "SUCCESS",
  "rowCount": 24500,
  "columns": [
    {
      "key": "marque",
      "label": "Marque Automobile",
      "type": "string",
      "role": "dimension",
      "nullCount": 0,
      "distinctCount": 24,
      "values": [{ "value": "OMODA", "count": 1250 }]
    },
    {
      "key": "ventes_unites",
      "label": "Ventes (Unités)",
      "type": "number",
      "role": "measure",
      "nullCount": 12,
      "distinctCount": 450,
      "min": 1,
      "max": 850
    },
    {
      "key": "date_immat",
      "label": "Date d'immatriculation",
      "type": "date",
      "role": "date",
      "nullCount": 0,
      "distinctCount": 365,
      "min": "2026-01-01T00:00:00.000Z",
      "max": "2026-12-31T00:00:00.000Z"
    }
  ],
  "mapping": {
    "brand": "marque",
    "volume": "ventes_unites",
    "date": "date_immat"
  },
  "quality": {
    "errors": 0,
    "warnings": 2,
    "info": 1,
    "issues": []
  },
  "reconciliation": {
    "expectedRows": 24500,
    "actualRows": 24500,
    "checksums": [
      { "column": "ventes_unites", "expected": 458900, "actual": 458900, "ok": true }
    ],
    "verified": true
  }
}
```

### 2. Collection `rows`
Stocke **chaque ligne** individuelle du fichier :
```json
{
  "_id": "ObjectId(...)",
  "datasetId": "ObjectId(...)",
  "rowNumber": 142,
  "chunkIndex": 0,
  "data": {
    "marque": "OMODA",
    "ventes_unites": 25,
    "date_immat": "2026-06-15T00:00:00.000Z"
  }
}
```

- **Types natifs** : Les nombres sont stockés en `Number`, les dates en objet UTC `Date`, les booléens en `Boolean`, les textes en `String` (`trim()`), et les cellules vides en `null`.
- **Clés techniques sécurisées** : Les clés de `data` sont des slugs ASCII uniques (ex: `prix_ttc`, `c_1`), sans points ni `$`.
- **Indexation automatique** :
  - `{ datasetId: 1, rowNumber: 1 }` (unique) à la création (idempotence).
  - À la finalisation : création d'index composés `{ datasetId: 1, "data.<key>": 1 }` pour la colonne date principale et les colonnes de rôle "dimension" ayant `distinctCount <= 500` (max 8 index).

---

## 📡 API Endpoints

### Flux d'Import par Lots (`/api/imports`)
- `POST /api/imports/init` : Initialise le dataset (`PROCESSING`), vérifie le doublon SHA-256 (`409 Conflict`), génère les clés techniques.
- `POST /api/imports/:id/chunks` : Reçoit `{ chunkIndex, rows[] }` (max 2 000 lignes par lot). Insertion idempotente (`bulkWrite upsert`).
- `POST /api/imports/:id/finalize` : Réconcilie les sommes ($sum) et le compte ($count). Calcule les statistiques et indexe.
- `POST /api/imports/:id/cancel` : Supprime les lignes insérées et passe le dataset en `CANCELLED`.
- `POST /api/imports/test-connection` : Teste une URI MongoDB en temps réel.

### Gestion des Jeux de Données (`/api/datasets`)
- `GET /api/datasets` : Liste légère des datasets triée par date décroissante.
- `GET /api/datasets/:id` : Métadonnées complètes, colonnes et statistiques détaillées.
- `PATCH /api/datasets/:id` : Renommer, modifier le mapping sémantique, modifier rôle et libellé d'une colonne.
- `DELETE /api/datasets/:id` : Supprime le dataset ET toutes ses lignes associées.
- `GET /api/datasets/:id/rows?page=1&pageSize=50` : Pagination serveur des lignes (max 200 lignes/page).

### Santé du Système
- `GET /api/health` : État réel de la connexion MongoDB (déconnecté ou connecté avec détails de cluster).

---

## 📂 Arborescence des Fichiers Backend

```
/backend
├── config/
│   └── db.ts                         # Connexion officielle MongoDB, index initiaux & nettoyage imports orphelins (> 1h)
├── controllers/
│   ├── datasetController.ts          # CRUD datasets, pagination serveur des lignes
│   ├── importBatchController.ts      # Flux par lots (init, chunks, finalize, cancel, test-connection)
│   ├── importController.ts           # Contrôleur d'importation unifié et requêtes de synthèse
│   ├── marketStatsController.ts      # Analyse dynamique sans colonnes en dur
│   └── assistantController.ts        # Analyse IA connectée aux datasets
├── data/
│   ├── importsStore.ts               # Accès MongoDB exclusif (aucun cache mémoire simulé)
│   └── seedMarketData.ts             # Nettoyage des anciennes données de mock
├── middleware/
│   └── validation.ts                 # Validation des extensions (.xlsx, .xls, .csv) et sécurité
├── models/
│   └── ImportRecord.ts               # Types de rétrocompatibilité
├── routes/
│   ├── datasetRoutes.ts              # Routes REST /api/datasets
│   ├── importRoutes.ts               # Routes REST /api/imports
│   ├── marketRoutes.ts               # Routes REST /api/market-stats
│   └── assistantRoutes.ts            # Routes REST /api/assistant
├── scripts/
│   └── testImport100k.ts             # Script de test de charge 100 000 lignes et réconciliation
├── services/
│   └── indexService.ts               # Création optimisée des index composés sur les dimensions et dates
├── tests/
│   ├── typeConverter.test.ts         # Tests unitaires du typage et des slugs ASCII
│   └── reconciliation.test.ts        # Tests unitaires de la réconciliation ($count, $sum)
├── types/
│   └── dataset.ts                    # Interfaces TypeScript strictes (datasets & rows)
├── utils/
│   ├── reconciliation.ts             # Algorithmes de réconciliation et statistiques de colonnes
│   ├── semanticSchemaEngine.ts       # Moteur d'analyse sémantique dynamique
│   └── typeConverter.ts              # Conversion de types (Number, Date UTC, Boolean, String, null)
└── server.ts                         # Point d'entrée serveur Express + Vite middleware
```
