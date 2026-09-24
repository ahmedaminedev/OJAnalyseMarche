import fs from 'fs';
import path from 'path';
import { ObjectId } from 'mongodb';
import { DatasetDocument, RowDocument, DatasetColumn } from '../types/dataset';

const DATA_DIR = path.resolve(process.cwd(), 'backend', 'data', 'local_db');

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

const DATASETS_FILE = path.join(DATA_DIR, 'datasets.json');
const ROWS_FILE = path.join(DATA_DIR, 'rows.json');

// Memory caches backed by atomic disk sync
let datasetsCache: DatasetDocument[] | null = null;
let rowsCache: RowDocument[] | null = null;

function loadDatasets(): DatasetDocument[] {
  if (datasetsCache) return datasetsCache;
  ensureDataDir();
  try {
    if (fs.existsSync(DATASETS_FILE)) {
      const raw = fs.readFileSync(DATASETS_FILE, 'utf8');
      datasetsCache = JSON.parse(raw).map((d: any) => ({
        ...d,
        _id: typeof d._id === 'string' ? new ObjectId(d._id) : d._id,
        importedAt: d.importedAt ? new Date(d.importedAt) : new Date(),
      }));
    } else {
      datasetsCache = [];
      saveDatasets();
    }
  } catch {
    datasetsCache = [];
  }
  return datasetsCache || [];
}

function saveDatasets() {
  ensureDataDir();
  try {
    const tempFile = `${DATASETS_FILE}.tmp`;
    fs.writeFileSync(tempFile, JSON.stringify(datasetsCache || [], null, 2), 'utf8');
    fs.renameSync(tempFile, DATASETS_FILE);
  } catch (err) {
    console.error('Erreur sauvegarde locale datasets:', err);
  }
}

function loadRows(): RowDocument[] {
  if (rowsCache) return rowsCache;
  ensureDataDir();
  try {
    if (fs.existsSync(ROWS_FILE)) {
      const raw = fs.readFileSync(ROWS_FILE, 'utf8');
      rowsCache = JSON.parse(raw).map((r: any) => ({
        ...r,
        _id: typeof r._id === 'string' ? new ObjectId(r._id) : r._id,
        datasetId: typeof r.datasetId === 'string' ? new ObjectId(r.datasetId) : r.datasetId,
      }));
    } else {
      rowsCache = [];
      saveRows();
    }
  } catch {
    rowsCache = [];
  }
  return rowsCache || [];
}

function saveRows() {
  ensureDataDir();
  try {
    const tempFile = `${ROWS_FILE}.tmp`;
    fs.writeFileSync(tempFile, JSON.stringify(rowsCache || []), 'utf8');
    fs.renameSync(tempFile, ROWS_FILE);
  } catch (err) {
    console.error('Erreur sauvegarde locale rows:', err);
  }
}

function matchQuery(doc: any, query?: any): boolean {
  if (!query || Object.keys(query).length === 0) return true;

  for (const key of Object.keys(query)) {
    const expected = query[key];

    if (key === '$or' && Array.isArray(expected)) {
      const orMatched = expected.some((subQuery) => matchQuery(doc, subQuery));
      if (!orMatched) return false;
      continue;
    }

    // Nested properties like "data.foo"
    let actual: any;
    if (key.includes('.')) {
      const parts = key.split('.');
      actual = doc;
      for (const p of parts) {
        if (actual == null) {
          actual = undefined;
          break;
        }
        actual = actual[p];
      }
    } else {
      actual = doc[key];
    }

    if (expected && typeof expected === 'object' && !(expected instanceof ObjectId) && !(expected instanceof Date)) {
      if ('$ne' in expected) {
        if (expected.$ne === null) {
          if (actual == null) return false;
        } else if (actual === expected.$ne) {
          return false;
        }
        continue;
      }
      if ('$exists' in expected) {
        const exists = actual !== undefined;
        if (exists !== expected.$exists) return false;
        continue;
      }
      if ('$lt' in expected) {
        if (actual == null || !(actual < expected.$lt)) return false;
        continue;
      }
      if ('$lte' in expected) {
        if (actual == null || !(actual <= expected.$lte)) return false;
        continue;
      }
      if ('$gt' in expected) {
        if (actual == null || !(actual > expected.$gt)) return false;
        continue;
      }
      if ('$gte' in expected) {
        if (actual == null || !(actual >= expected.$gte)) return false;
        continue;
      }
      if ('$in' in expected && Array.isArray(expected.$in)) {
        const isId = key === '_id' || key === 'datasetId' || key.endsWith('Id');
        const matches = expected.$in.some((item: any) => {
          if (item instanceof ObjectId || actual instanceof ObjectId || isId) {
            const itemStr = item != null ? (typeof item.toHexString === 'function' ? item.toHexString() : String(item)) : '';
            const actStr = actual != null ? (typeof actual.toHexString === 'function' ? actual.toHexString() : String(actual)) : '';
            return itemStr === actStr;
          }
          return item === actual;
        });
        if (!matches) return false;
        continue;
      }
      if ('$regex' in expected) {
        const reg = new RegExp(expected.$regex, expected.$options || 'i');
        if (!reg.test(String(actual || ''))) return false;
        continue;
      }
    }

    // Direct comparison (supports ObjectId, string IDs, dates, numbers, booleans)
    const isIdField = key === '_id' || key === 'datasetId' || key.endsWith('Id');
    if (
      expected instanceof ObjectId ||
      actual instanceof ObjectId ||
      isIdField
    ) {
      const expStr = expected != null ? (typeof expected.toHexString === 'function' ? expected.toHexString() : String(expected)) : '';
      const actStr = actual != null ? (typeof actual.toHexString === 'function' ? actual.toHexString() : String(actual)) : '';
      if (expStr !== actStr) return false;
      continue;
    } else if (actual !== expected) {
      return false;
    }
  }

  return true;
}

/**
 * Creates a collection adapter that behaves like MongoDB Collection
 */
export function createLocalCollection<T extends { _id?: any }>(
  collectionName: 'datasets' | 'rows'
) {
  const getStore = (): any[] => {
    return collectionName === 'datasets' ? loadDatasets() : loadRows();
  };

  const persist = () => {
    if (collectionName === 'datasets') {
      saveDatasets();
    } else {
      saveRows();
    }
  };

  return {
    collectionName,

    async findOne(query?: any, options?: any): Promise<T | null> {
      const store = getStore();
      const item = store.find((doc) => matchQuery(doc, query));
      if (!item) return null;
      const clone = JSON.parse(JSON.stringify(item));
      if (item._id instanceof ObjectId) {
        clone._id = item._id;
      } else if (clone._id) {
        try { clone._id = new ObjectId(clone._id); } catch {}
      }
      if (item.datasetId instanceof ObjectId) {
        clone.datasetId = item.datasetId;
      } else if (clone.datasetId) {
        try { clone.datasetId = new ObjectId(clone.datasetId); } catch {}
      }
      return clone;
    },

    find(query?: any, options?: any) {
      const store = getStore();
      let results = store.filter((doc) => matchQuery(doc, query));

      let sortField: string | null = null;
      let sortDir = 1;
      let skipCount = 0;
      let limitCount: number | null = null;

      const cursor = {
        sort(sortObj: Record<string, number>) {
          const keys = Object.keys(sortObj);
          if (keys.length > 0) {
            sortField = keys[0];
            sortDir = sortObj[sortField] || 1;
          }
          return cursor;
        },
        skip(num: number) {
          skipCount = num;
          return cursor;
        },
        limit(num: number) {
          limitCount = num;
          return cursor;
        },
        project(proj: any) {
          return cursor;
        },
        async toArray(): Promise<T[]> {
          let list = [...results];
          if (sortField) {
            const field = sortField;
            const dir = sortDir;
            list.sort((a, b) => {
              const valA = a[field];
              const valB = b[field];
              if (valA < valB) return -1 * dir;
              if (valA > valB) return 1 * dir;
              return 0;
            });
          }
          if (skipCount > 0) {
            list = list.slice(skipCount);
          }
          if (limitCount !== null) {
            list = list.slice(0, limitCount);
          }
          return list.map((item) => {
            const clone = JSON.parse(JSON.stringify(item));
            if (item._id instanceof ObjectId) {
              clone._id = item._id;
            } else if (clone._id) {
              try { clone._id = new ObjectId(clone._id); } catch {}
            }
            if (item.datasetId instanceof ObjectId) {
              clone.datasetId = item.datasetId;
            } else if (clone.datasetId) {
              try { clone.datasetId = new ObjectId(clone.datasetId); } catch {}
            }
            return clone;
          });
        },
      };

      return cursor;
    },

    async insertOne(doc: T): Promise<{ insertedId: ObjectId }> {
      const store = getStore();
      const clone: any = { ...doc };
      if (!clone._id) {
        clone._id = new ObjectId();
      } else if (typeof clone._id === 'string') {
        clone._id = new ObjectId(clone._id);
      }
      store.push(clone);
      persist();
      return { insertedId: clone._id };
    },

    async insertMany(docs: T[], options?: any): Promise<{ insertedCount: number }> {
      const store = getStore();
      for (const d of docs) {
        const clone: any = { ...d };
        if (!clone._id) {
          clone._id = new ObjectId();
        } else if (typeof clone._id === 'string') {
          clone._id = new ObjectId(clone._id);
        }
        store.push(clone);
      }
      persist();
      return { insertedCount: docs.length };
    },

    async updateOne(filter: any, update: any, options?: any): Promise<{ modifiedCount: number; upsertedCount?: number }> {
      const store = getStore();
      const index = store.findIndex((doc) => matchQuery(doc, filter));
      if (index === -1) {
        if (options && options.upsert) {
          const newDoc: any = { _id: new ObjectId(), ...filter };
          if (update.$set) Object.assign(newDoc, update.$set);
          if (update.$setOnInsert) Object.assign(newDoc, update.$setOnInsert);
          store.push(newDoc);
          persist();
          return { modifiedCount: 1, upsertedCount: 1 };
        }
        return { modifiedCount: 0 };
      }

      const doc = store[index];
      if (update.$set) {
        Object.assign(doc, update.$set);
      }
      if (update.$inc) {
        for (const k of Object.keys(update.$inc)) {
          doc[k] = (doc[k] || 0) + update.$inc[k];
        }
      }
      persist();
      return { modifiedCount: 1 };
    },

    async deleteOne(filter: any): Promise<{ deletedCount: number }> {
      const store = getStore();
      const index = store.findIndex((doc) => matchQuery(doc, filter));
      if (index === -1) return { deletedCount: 0 };
      store.splice(index, 1);
      persist();
      return { deletedCount: 1 };
    },

    async deleteMany(filter: any): Promise<{ deletedCount: number }> {
      const store = getStore();
      const before = store.length;
      const remaining = store.filter((doc) => !matchQuery(doc, filter));
      const deleted = before - remaining.length;
      if (collectionName === 'datasets') {
        datasetsCache = remaining;
      } else {
        rowsCache = remaining;
      }
      persist();
      return { deletedCount: deleted };
    },

    async countDocuments(filter?: any): Promise<number> {
      const store = getStore();
      if (!filter || Object.keys(filter).length === 0) return store.length;
      return store.filter((doc) => matchQuery(doc, filter)).length;
    },

    async bulkWrite(ops: any[], options?: any): Promise<{ insertedCount: number; modifiedCount: number; upsertedCount: number }> {
      const store = getStore();
      let insertedCount = 0;
      let modifiedCount = 0;
      let upsertedCount = 0;

      for (const op of ops) {
        if (op.insertOne && op.insertOne.document) {
          const clone: any = { ...op.insertOne.document };
          if (!clone._id) clone._id = new ObjectId();
          store.push(clone);
          insertedCount++;
        } else if (op.updateOne) {
          const { filter, update, upsert } = op.updateOne;
          const index = store.findIndex((doc) => matchQuery(doc, filter));
          if (index !== -1) {
            const doc = store[index];
            if (update.$set) Object.assign(doc, update.$set);
            if (update.$inc) {
              for (const k of Object.keys(update.$inc)) {
                doc[k] = (doc[k] || 0) + update.$inc[k];
              }
            }
            modifiedCount++;
          } else if (upsert) {
            const newDoc: any = { _id: new ObjectId(), ...filter };
            if (update.$set) Object.assign(newDoc, update.$set);
            if (update.$setOnInsert) Object.assign(newDoc, update.$setOnInsert);
            store.push(newDoc);
            upsertedCount++;
          }
        } else if (op.replaceOne) {
          const { filter, replacement, upsert } = op.replaceOne;
          const index = store.findIndex((doc) => matchQuery(doc, filter));
          if (index !== -1) {
            const existingId = store[index]._id;
            store[index] = { ...replacement, _id: existingId };
            modifiedCount++;
          } else if (upsert) {
            const newDoc: any = { _id: new ObjectId(), ...replacement };
            store.push(newDoc);
            upsertedCount++;
          }
        }
      }
      persist();
      return { insertedCount, modifiedCount, upsertedCount };
    },

    async createIndex(spec: any, options?: any): Promise<string> {
      return 'index_created';
    },

    aggregate(pipeline: any[]) {
      const store = getStore();
      return {
        async toArray(): Promise<any[]> {
          let currentDocs = [...store];

          for (const stage of pipeline) {
            if (stage.$match) {
              currentDocs = currentDocs.filter((doc) => matchQuery(doc, stage.$match));
            } else if (stage.$group) {
              const groupSpec = stage.$group;
              const resultsMap = new Map<string, any>();

              // If group by specific field or null
              const idExpr = groupSpec._id;

              for (const doc of currentDocs) {
                let groupKey = 'null';
                let idValue: any = null;
                if (idExpr && typeof idExpr === 'string' && idExpr.startsWith('$')) {
                  const pathKey = idExpr.slice(1);
                  idValue = pathKey.split('.').reduce((o, i) => o?.[i], doc);
                  groupKey = idValue instanceof Date ? idValue.toISOString() : String(idValue ?? 'null');
                } else if (idExpr !== null && idExpr !== undefined) {
                  idValue = idExpr;
                  groupKey = String(idExpr);
                }

                if (!resultsMap.has(groupKey)) {
                  const entry: any = {
                    _id: idValue,
                  };
                  // initialize aggregators
                  for (const [k, agg] of Object.entries(groupSpec)) {
                    if (k === '_id') continue;
                    const aggObj = agg as any;
                    if (aggObj.$sum !== undefined) entry[k] = 0;
                    if (aggObj.$min !== undefined) entry[k] = null;
                    if (aggObj.$max !== undefined) entry[k] = null;
                  }
                  resultsMap.set(groupKey, entry);
                }

                const entry = resultsMap.get(groupKey);

                for (const [k, agg] of Object.entries(groupSpec)) {
                  if (k === '_id') continue;
                  const aggObj = agg as any;
                  if (aggObj.$sum !== undefined) {
                    if (aggObj.$sum === 1) {
                      entry[k] += 1;
                    } else if (typeof aggObj.$sum === 'string' && aggObj.$sum.startsWith('$')) {
                      const val = aggObj.$sum.slice(1).split('.').reduce((o: any, i: any) => o?.[i], doc);
                      const num = Number(val);
                      if (!isNaN(num)) entry[k] += num;
                    } else if (typeof aggObj.$sum === 'number') {
                      entry[k] += aggObj.$sum;
                    }
                  } else if (aggObj.$min !== undefined) {
                    const pathKey = typeof aggObj.$min === 'string' && aggObj.$min.startsWith('$') ? aggObj.$min.slice(1) : '';
                    const val = pathKey ? pathKey.split('.').reduce((o: any, i: any) => o?.[i], doc) : null;
                    if (val != null) {
                      if (entry[k] === null || val < entry[k]) entry[k] = val;
                    }
                  } else if (aggObj.$max !== undefined) {
                    const pathKey = typeof aggObj.$max === 'string' && aggObj.$max.startsWith('$') ? aggObj.$max.slice(1) : '';
                    const val = pathKey ? pathKey.split('.').reduce((o: any, i: any) => o?.[i], doc) : null;
                    if (val != null) {
                      if (entry[k] === null || val > entry[k]) entry[k] = val;
                    }
                  }
                }
              }

              currentDocs = Array.from(resultsMap.values());
            } else if (stage.$sort) {
              const sortSpec = stage.$sort;
              const [field, dir] = Object.entries(sortSpec)[0];
              const multiplier = dir === -1 ? -1 : 1;
              currentDocs.sort((a, b) => {
                const valA = a[field];
                const valB = b[field];
                if (valA < valB) return -1 * multiplier;
                if (valA > valB) return 1 * multiplier;
                return 0;
              });
            } else if (stage.$limit) {
              currentDocs = currentDocs.slice(0, stage.$limit);
            }
          }

          return currentDocs;
        },
      };
    },
  };
}
