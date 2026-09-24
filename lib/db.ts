import { mkdir, writeFile } from "node:fs/promises";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { randomUUID } from "node:crypto";
import path from "node:path";
import { MongoClient, type Db, type Document, type Filter, type WithId } from "mongodb";

declare global {
  var senganthalMongo: Promise<MongoClient> | undefined;
  var senganthalIndexes: Promise<void> | undefined;
  var senganthalLocalDb: LocalDatabase | undefined;
}

type StoredDocument = Record<string, unknown>;
type CollectionStore = Record<string, StoredDocument[]>;
type Query<T extends StoredDocument> = Partial<Record<keyof T | string, unknown>>;
type Update<T extends StoredDocument> = {
  $inc?: Partial<Record<keyof T | string, number>>;
  $set?: Partial<Record<keyof T | string, unknown>>;
  $setOnInsert?: Partial<Record<keyof T | string, unknown>>;
  $push?: Partial<Record<keyof T | string, unknown | { $each: unknown[] }>>;
};
type Projection = Record<string, 0 | 1>;

const localDbPath = path.join(process.cwd(), ".data", "local-db.json");
const localFallbackEnabled = process.env.MONGODB_LOCAL_FALLBACK === "true" || (process.env.MONGODB_LOCAL_FALLBACK !== "false" && process.env.NODE_ENV !== "production");

async function ensureIndexes(database: Db) {
  await Promise.all([
    database.collection("rateLimits").createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }),
    database.collection("reports").createIndex({ owner: 1, symbol: 1, period: 1 }, { unique: true }),
    database.collection("watchlist").createIndex({ owner: 1, symbol: 1 }, { unique: true }),
    database.collection("members").createIndex({ email: 1 }, { unique: true }),
    database.collection("messages").createIndex({ createdAt: -1 }),
    database.collection("settings").createIndex({ key: 1 }, { unique: true }),
    database.collection("stakeScans").createIndex({ owner: 1 }, { unique: true }),
    database.collection("errors").createIndex({ createdAt: 1 }, { expireAfterSeconds: 30 * 86400 })
  ]);
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value));
}

function matches<T extends StoredDocument>(doc: T, query: Query<T>) {
  return Object.entries(query).every(([key, value]) => {
    const current = doc[key];
    const currentValue = comparable(current);
    if (value && typeof value === "object" && !Array.isArray(value) && !(value instanceof Date)) {
      const operators = value as Record<string, unknown>;
      if ("$ne" in operators && current === operators.$ne) return false;
      if ("$lt" in operators && !(currentValue < comparable(operators.$lt))) return false;
      if ("$lte" in operators && !(currentValue <= comparable(operators.$lte))) return false;
      if ("$gt" in operators && !(currentValue > comparable(operators.$gt))) return false;
      if ("$gte" in operators && !(currentValue >= comparable(operators.$gte))) return false;
      return true;
    }
    return current === value;
  });
}

function comparable(value: unknown) {
  if (value instanceof Date) return value.getTime();
  if (typeof value === "string") {
    const time = Date.parse(value);
    return Number.isFinite(time) ? time : value;
  }
  if (typeof value === "number") return value;
  return String(value);
}

function projected<T extends StoredDocument>(doc: T, projection?: Projection) {
  const copy = clone(doc) as StoredDocument;
  if (!projection) return copy;

  const entries = Object.entries(projection);
  const includes = entries.filter(([, value]) => value === 1).map(([key]) => key);
  if (includes.length) {
    const result: StoredDocument = {};
    for (const key of includes) if (key in copy) result[key] = copy[key];
    return result;
  }

  for (const [key, value] of entries) if (value === 0) delete copy[key];
  return copy;
}

function applyUpdate<T extends StoredDocument>(doc: T, update: Update<T>, isInsert: boolean) {
  if (isInsert && update.$setOnInsert) Object.assign(doc, update.$setOnInsert);
  if (update.$set) Object.assign(doc, update.$set);
  if (update.$inc) {
    for (const [key, value] of Object.entries(update.$inc)) {
      (doc as StoredDocument)[key] = Number(doc[key] || 0) + Number(value);
    }
  }
  if (update.$push) {
    for (const [key, value] of Object.entries(update.$push)) {
      const target = Array.isArray(doc[key]) ? doc[key] as unknown[] : [];
      if (value && typeof value === "object" && "$each" in value && Array.isArray(value.$each)) target.push(...value.$each);
      else target.push(value);
      (doc as StoredDocument)[key] = target;
    }
  }
}

class LocalCursor<T extends StoredDocument> {
  constructor(private rows: T[], private projection?: Projection) {}

  sort(spec: Record<string, 1 | -1>) {
    const [[key, direction]] = Object.entries(spec);
    this.rows.sort((left, right) => {
      const a = left[key];
      const b = right[key];
      if (a === b) return 0;
      return (String(a) > String(b) ? 1 : -1) * direction;
    });
    return this;
  }

  limit(count: number) {
    this.rows = this.rows.slice(0, count);
    return this;
  }

  async toArray() {
    return this.rows.map(row => projected(row, this.projection)) as T[];
  }
}

class LocalCollection<T extends StoredDocument> {
  constructor(private database: LocalDatabase, private name: string) {}

  private rows() {
    return this.database.rows(this.name);
  }

  async createIndex() {
    return `${this.name}_local_index`;
  }

  async findOne(query: Query<T>, options?: { projection?: Projection }) {
    const doc = this.rows().find(row => matches(row as T, query));
    return doc ? projected(doc as T, options?.projection) as WithId<T> : null;
  }

  find(query: Query<T> = {}, options?: { projection?: Projection }) {
    const rows = this.rows().filter(row => matches(row as T, query)).map(row => clone(row as T));
    return new LocalCursor(rows, options?.projection);
  }

  async insertOne(doc: T) {
    const value = clone(doc) as StoredDocument;
    value._id ??= randomUUID();
    this.rows().push(value);
    await this.database.save();
    return { acknowledged: true, insertedId: value._id };
  }

  async insertMany(docs: T[]) {
    for (const doc of docs) {
      const value = clone(doc) as StoredDocument;
      value._id ??= randomUUID();
      this.rows().push(value);
    }
    await this.database.save();
    return { acknowledged: true, insertedCount: docs.length };
  }

  async updateOne(query: Query<T>, update: Update<T>, options?: { upsert?: boolean }) {
    const rows = this.rows();
    let doc = rows.find(row => matches(row as T, query));
    const didInsert = !doc && Boolean(options?.upsert);

    if (!doc && options?.upsert) {
      doc = clone(query as StoredDocument);
      rows.push(doc);
    }

    if (doc) {
      applyUpdate(doc as T, update, didInsert);
      await this.database.save();
    }

    return { acknowledged: true, matchedCount: didInsert ? 0 : doc ? 1 : 0, modifiedCount: doc ? 1 : 0, upsertedCount: didInsert ? 1 : 0 };
  }

  async findOneAndUpdate(query: Query<T>, update: Update<T>, options?: { upsert?: boolean; returnDocument?: "after" | "before" }) {
    const rows = this.rows();
    let doc = rows.find(row => matches(row as T, query));
    const before = doc ? clone(doc) : null;
    const didInsert = !doc && Boolean(options?.upsert);

    if (!doc && options?.upsert) {
      doc = clone(query as StoredDocument);
      rows.push(doc);
    }

    if (doc) {
      applyUpdate(doc as T, update, didInsert);
      await this.database.save();
    }

    return options?.returnDocument === "before" ? before : doc ? clone(doc) : null;
  }

  async deleteOne(query: Query<T>) {
    const rows = this.rows();
    const index = rows.findIndex(row => matches(row as T, query));
    if (index >= 0) {
      rows.splice(index, 1);
      await this.database.save();
    }
    return { acknowledged: true, deletedCount: index >= 0 ? 1 : 0 };
  }

  async deleteMany(query: Query<T>) {
    const rows = this.rows();
    let deletedCount = 0;
    for (let index = rows.length - 1; index >= 0; index -= 1) {
      if (matches(rows[index] as T, query)) {
        rows.splice(index, 1);
        deletedCount += 1;
      }
    }
    if (deletedCount) await this.database.save();
    return { acknowledged: true, deletedCount };
  }

  async countDocuments(query: Query<T> = {}) {
    return this.rows().filter(row => matches(row as T, query)).length;
  }

  async bulkWrite(operations: Array<{ updateOne?: { filter: Query<T>; update: Update<T>; upsert?: boolean } }>) {
    let modifiedCount = 0;
    let upsertedCount = 0;
    for (const operation of operations) {
      if (!operation.updateOne) continue;
      const result = await this.updateOne(operation.updateOne.filter, operation.updateOne.update, { upsert: operation.updateOne.upsert });
      modifiedCount += result.modifiedCount;
      upsertedCount += result.upsertedCount;
    }
    return { acknowledged: true, modifiedCount, upsertedCount };
  }
}

class LocalDatabase {
  private store: CollectionStore = {};
  private writes = Promise.resolve();

  constructor(private filePath: string) {
    this.load();
  }

  private load() {
    try {
      this.store = JSON.parse(readFileSync(this.filePath, "utf8")) as CollectionStore;
    } catch {
      this.store = {};
      mkdirSync(path.dirname(this.filePath), { recursive: true });
      writeFileSync(this.filePath, JSON.stringify(this.store, null, 2));
    }
  }

  rows(name: string) {
    this.store[name] ??= [];
    return this.store[name];
  }

  collection<T extends Document = Document>(name: string) {
    return new LocalCollection<T & StoredDocument>(this, name);
  }

  async command(command: Record<string, unknown>) {
    if (command.ping === 1) return { ok: 1 };
    return { ok: 1 };
  }

  async save() {
    this.writes = this.writes.then(async () => {
      await this.writeStore();
    });
    await this.writes;
  }

  private async writeStore() {
    await mkdir(path.dirname(this.filePath), { recursive: true });
    await writeFile(this.filePath, JSON.stringify(this.store, null, 2));
  }
}

function localDb() {
  global.senganthalLocalDb ??= new LocalDatabase(localDbPath);
  return global.senganthalLocalDb;
}

async function mongoDb() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("Database is not configured. Contact your administrator.");
  if (!global.senganthalMongo) {
    global.senganthalMongo = new MongoClient(uri, {
      maxPoolSize: 5,
      minPoolSize: 0,
      maxIdleTimeMS: 60000,
      serverSelectionTimeoutMS: 8000
    }).connect().catch(error => {
      global.senganthalMongo = undefined;
      throw error;
    });
  }
  const database = (await global.senganthalMongo).db(process.env.MONGODB_DB || "senganthal");
  global.senganthalIndexes ??= ensureIndexes(database).catch(error => {
    global.senganthalIndexes = undefined;
    throw error;
  });
  await global.senganthalIndexes;
  return database;
}

export async function db(): Promise<Db> {
  try {
    return await mongoDb();
  } catch (error) {
    if (!localFallbackEnabled) throw error;
    console.warn("MongoDB is unavailable; using local development database fallback.");
    return localDb() as unknown as Db;
  }
}
