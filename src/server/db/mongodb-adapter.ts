/**
 * MongoDB adapter providing a Drizzle ORM-compatible query builder API.
 *
 * Drop-in replacement for the Drizzle `db` object when using MongoDB as the
 * storage backend. Supports the same chainable query patterns:
 *
 *   db.select().from(table).where(...).limit(n).orderBy(...)
 *   db.select({ col: table.col }).from(table).where(...)
 *   db.insert(table).values({...}).returning()
 *   db.update(table).set({...}).where(...)
 *   db.delete(table).where(...)
 *   db.transaction(async (tx) => { ... })
 *
 * Internally, each Drizzle table maps to a MongoDB collection. Documents use
 * camelCase keys matching the JavaScript property names in the schema. The
 * primary key is stored as `_id` and mapped to `id` in results.
 */

import {
  MongoClient,
  type Db,
  type Document,
  type ClientSession,
  type Collection,
  type MongoClientOptions,
  ObjectId,
} from 'mongodb';
import { getTableColumns } from 'drizzle-orm';

// ─── Drizzle Internals Detection ──────────────────────────────────────────────

interface DrizzleColumn {
  name: string;
  table: any;
  primary?: boolean;
  autoIncrement?: boolean;
}

/** Detect a Drizzle column reference (has .name + .table with Symbol(drizzle:Name)). */
function isDrizzleColumn(obj: unknown): obj is DrizzleColumn {
  return (
    obj !== null &&
    typeof obj === 'object' &&
    'name' in obj &&
    'table' in obj &&
    typeof (obj as any).name === 'string' &&
    (obj as any).table !== null &&
    typeof (obj as any).table === 'object'
  );
}

/** Detect a Drizzle SQL wrapper (has .queryChunks array). */
function isSQL(obj: unknown): obj is { queryChunks: any[] } {
  return (
    obj !== null &&
    typeof obj === 'object' &&
    'queryChunks' in obj &&
    Array.isArray((obj as any).queryChunks)
  );
}

/** Detect a Drizzle StringChunk (has .value string array, not SQL/Column). */
function isStringChunk(obj: unknown): obj is { value: string[] } {
  return (
    obj !== null &&
    typeof obj === 'object' &&
    'value' in obj &&
    Array.isArray((obj as any).value) &&
    !('queryChunks' in obj) &&
    !('name' in obj && 'table' in obj)
  );
}

// ─── Table Metadata Extraction ────────────────────────────────────────────────

/** Get the SQL table name via Symbol(drizzle:Name). */
function getTableName(table: any): string {
  const sym = Object.getOwnPropertySymbols(table).find((s) =>
    s.toString().includes('drizzle:Name'),
  );
  return sym ? String(table[sym]) : '';
}

/** Cached table metadata to avoid repeated getTableColumns calls. */
interface TableMeta {
  name: string;
  columns: Record<string, DrizzleColumn>;
  sqlToJs: Record<string, string>;
  primaryKeyJsKey: string;
  hasAutoIncrement: boolean;
}

const metaCache = new WeakMap<any, TableMeta>();

function getTableMeta(table: any): TableMeta {
  const cached = metaCache.get(table);
  if (cached) return cached;

  const columns = getTableColumns(table) as Record<string, DrizzleColumn>;
  const sqlToJs: Record<string, string> = {};
  let primaryKeyJsKey = 'id';
  let hasAutoIncrement = false;

  for (const [jsKey, col] of Object.entries(columns)) {
    sqlToJs[col.name] = jsKey;
    if (col.primary) {
      primaryKeyJsKey = jsKey;
      hasAutoIncrement = col.autoIncrement === true;
    }
  }

  const meta: TableMeta = {
    name: getTableName(table),
    columns,
    sqlToJs,
    primaryKeyJsKey,
    hasAutoIncrement,
  };
  metaCache.set(table, meta);
  return meta;
}

/** Find the JS property name for a column reference via identity comparison. */
function findJsKey(col: DrizzleColumn, table: any): string {
  const meta = getTableMeta(table);
  // Fast path: identity comparison
  for (const [jsKey, column] of Object.entries(meta.columns)) {
    if (column === col) return jsKey;
  }
  // Fallback: match by SQL name
  return meta.sqlToJs[col.name] ?? col.name;
}

// ─── Condition Parsing ────────────────────────────────────────────────────────

interface EqCondition {
  type: 'eq';
  field: string;
  value: any;
}

interface CompoundCondition {
  type: 'and' | 'or';
  children: ParsedCondition[];
}

type ParsedCondition = EqCondition | CompoundCondition;

/**
 * Recursively parse a Drizzle SQL condition tree into a simple AST.
 * Handles: eq(col, val), and(c1, c2), or(c1, c2), and nested combinations.
 */
function parseCondition(sql: any, table: any): ParsedCondition {
  if (!isSQL(sql)) {
    throw new Error('[MongoDB adapter] Expected SQL condition object');
  }

  let chunks = sql.queryChunks;

  // Strip outer parentheses: ("(", inner, ")") → inner
  while (
    chunks.length >= 3 &&
    isStringChunk(chunks[0]) &&
    chunks[0].value.join('') === '(' &&
    isStringChunk(chunks[chunks.length - 1]) &&
    chunks[chunks.length - 1].value.join('') === ')'
  ) {
    if (isSQL(chunks[1]) && chunks.length === 3) {
      chunks = chunks[1].queryChunks;
    } else {
      break;
    }
  }

  // Look for 'and' / 'or' join operator
  for (let i = 0; i < chunks.length; i++) {
    if (isStringChunk(chunks[i])) {
      const str = chunks[i].value.join('');
      if (str === ' and ' || str === ' or ') {
        const leftChunks = (chunks[i - 1] as any).queryChunks as any[];
        const rightChunks = (chunks[i + 1] as any).queryChunks as any[];
        return {
          type: str.trim() as 'and' | 'or',
          children: [
            parseCondition({ queryChunks: leftChunks }, table),
            parseCondition({ queryChunks: rightChunks }, table),
          ],
        };
      }
    }
  }

  // Simple eq condition — find the column and value
  let column: DrizzleColumn | null = null;
  let value: any = undefined;
  let hasValue = false;

  for (const chunk of chunks) {
    if (isDrizzleColumn(chunk)) {
      column = chunk;
    } else if (!isStringChunk(chunk) && !isSQL(chunk) && chunk !== undefined) {
      value = chunk;
      hasValue = true;
    }
  }

  if (column) {
    return {
      type: 'eq',
      field: findJsKey(column, table),
      value: hasValue ? value : null,
    };
  }

  throw new Error('[MongoDB adapter] Could not parse condition');
}

/** Convert a parsed condition tree to a MongoDB filter document. */
function conditionToFilter(cond: ParsedCondition, pkField: string): Document {
  switch (cond.type) {
    case 'eq': {
      const mongoField = cond.field === pkField ? '_id' : cond.field;
      return { [mongoField]: cond.value };
    }
    case 'and':
      return { $and: cond.children.map((c) => conditionToFilter(c, pkField)) };
    case 'or':
      return { $or: cond.children.map((c) => conditionToFilter(c, pkField)) };
  }
}

// ─── Order By Parsing ─────────────────────────────────────────────────────────

interface SortSpec {
  field: string;
  dir: 1 | -1;
}

/** Parse a single Drizzle orderBy clause (asc/desc). */
function parseOrderByClause(sql: any, table: any): SortSpec | null {
  if (!isSQL(sql)) return null;

  const chunks = sql.queryChunks;
  let column: DrizzleColumn | null = null;
  let dir: 1 | -1 = 1;

  for (const chunk of chunks) {
    if (isDrizzleColumn(chunk)) {
      column = chunk;
    } else if (isStringChunk(chunk)) {
      const s = chunk.value.join('');
      if (s.includes(' desc')) dir = -1;
      else if (s.includes(' asc')) dir = 1;
    }
  }

  if (column) {
    return { field: findJsKey(column, table), dir };
  }
  return null;
}

// ─── Document Mapping ─────────────────────────────────────────────────────────

/** Map a raw MongoDB document to a Drizzle-compatible row (add id, remove _id). */
function docToRow(doc: Document): any {
  const result: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(doc)) {
    if (key === '_id') {
      result.id = val;
    } else {
      result[key] = val;
    }
  }
  return result;
}

/** Prepare an insert/update values object for MongoDB storage. */
function prepareForStorage(values: Record<string, any>, pkField: string): {
  doc: Document;
  pkValue: any;
} {
  const doc: Document = {};
  let pkValue: any = undefined;

  for (const [key, val] of Object.entries(values)) {
    if (key === pkField) {
      pkValue = val;
      // Don't store 'id' as a separate field — it becomes _id
    } else {
      doc[key] = val;
    }
  }

  return { doc, pkValue };
}

/** Build a MongoDB sort document from parsed orderBy clauses. */
function buildSort(sortSpecs: SortSpec[], pkField: string): Document {
  if (sortSpecs.length === 0) return {};
  const sort: Document = {};
  for (const s of sortSpecs) {
    const mongoField = s.field === pkField ? '_id' : s.field;
    sort[mongoField] = s.dir;
  }
  return sort;
}

/** Build a MongoDB projection from selected column keys. */
function buildProjection(
  selectedKeys: string[] | null,
  pkField: string,
): Document | null {
  if (!selectedKeys) return null; // no projection — return all fields

  const projection: Document = {};
  for (const key of selectedKeys) {
    projection[key] = 1;
  }
  // _id is included by default; exclude it only if 'id' is not in the selection
  if (!selectedKeys.includes(pkField)) {
    projection._id = 0;
  }
  return projection;
}

// ─── Auto-Increment Counter ───────────────────────────────────────────────────

const COUNTERS_COLLECTION = '_counters';

async function getNextId(
  collection: Collection<Document>,
  tableName: string,
  session?: ClientSession,
): Promise<number> {
  const result = await collection.findOneAndUpdate(
    { _id: tableName } as Document,
    { $inc: { seq: 1 } },
    {
      upsert: true,
      returnDocument: 'after',
      session,
    },
  );
  return Number(result?.seq ?? 1);
}

// ─── Select Query Builder ─────────────────────────────────────────────────────

class SelectQuery {
  private _table: any = null;
  private _columns: Record<string, any> | undefined;
  private _where: any = null;
  private _limitN: number | undefined;
  private _orderByClauses: any[] = [];
  private _db: MongoDatabase;

  constructor(db: MongoDatabase, columns?: Record<string, any>) {
    this._db = db;
    this._columns = columns;
  }

  from(table: any): this {
    this._table = table;
    return this;
  }

  where(condition: any): this {
    this._where = condition;
    return this;
  }

  limit(n: number): this {
    this._limitN = n;
    return this;
  }

  orderBy(...clauses: any[]): this {
    this._orderByClauses.push(...clauses);
    return this;
  }

  /** Thenable interface — allows `await` to auto-execute the query. */
  then<TResult = any>(
    onfulfilled?: ((value: any) => TResult | PromiseLike<TResult>) | null,
    onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | null,
  ): Promise<TResult> {
    return this._execute().then(onfulfilled, onrejected);
  }

  private async _execute(): Promise<any[]> {
    if (!this._table) {
      throw new Error('[MongoDB adapter] .from() is required on select queries');
    }

    const meta = getTableMeta(this._table);
    const coll = this._db.getCollection(meta.name);

    // Build filter
    const filter: Document = this._where
      ? conditionToFilter(parseCondition(this._where, this._table), meta.primaryKeyJsKey)
      : {};

    // Build projection
    let selectedKeys: string[] | null = null;
    if (this._columns) {
      selectedKeys = [];
      for (const [outputKey, colRef] of Object.entries(this._columns)) {
        if (isDrizzleColumn(colRef)) {
          const jsKey = findJsKey(colRef, this._table);
          // Map outputKey → jsKey (they usually match, but handle aliases)
          if (outputKey !== jsKey) {
            // Alias: we'll rename in post-processing
            selectedKeys.push(jsKey);
          } else {
            selectedKeys.push(jsKey);
          }
        }
      }
    }
    const projection = buildProjection(selectedKeys, meta.primaryKeyJsKey);

    // Build sort
    const sortSpecs: SortSpec[] = [];
    for (const clause of this._orderByClauses) {
      const spec = parseOrderByClause(clause, this._table);
      if (spec) sortSpecs.push(spec);
    }
    const sort = buildSort(sortSpecs, meta.primaryKeyJsKey);

    // Execute query
    let cursor = coll.find(filter, {
      projection: projection ?? undefined,
      session: this._db.getSession(),
    });

    if (Object.keys(sort).length > 0) {
      cursor = cursor.sort(sort);
    }
    if (this._limitN !== undefined) {
      cursor = cursor.limit(this._limitN);
    }

    const docs = await cursor.toArray();

    // Map _id → id, handle aliases
    return docs.map((doc) => {
      const row = docToRow(doc);
      // Handle aliased columns (outputKey !== jsKey)
      if (this._columns) {
        const aliased: Record<string, unknown> = {};
        for (const [outputKey, colRef] of Object.entries(this._columns)) {
          if (isDrizzleColumn(colRef)) {
            const jsKey = findJsKey(colRef, this._table);
            aliased[outputKey] = row[jsKey];
          }
        }
        return aliased;
      }
      return row;
    });
  }
}

// ─── Insert Query Builder ─────────────────────────────────────────────────────

class InsertQuery {
  private _table: any;
  private _values: Record<string, any> | Record<string, any>[] | null = null;
  private _returning = false;
  private _db: MongoDatabase;

  constructor(db: MongoDatabase, table: any) {
    this._db = db;
    this._table = table;
  }

  values(data: Record<string, any> | Record<string, any>[]): this {
    this._values = data;
    return this;
  }

  returning(): this {
    this._returning = true;
    return this;
  }

  then<TResult = any>(
    onfulfilled?: ((value: any) => TResult | PromiseLike<TResult>) | null,
    onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | null,
  ): Promise<TResult> {
    return this._execute().then(onfulfilled, onrejected);
  }

  private async _execute(): Promise<any> {
    if (!this._values) {
      throw new Error('[MongoDB adapter] .values() is required on insert queries');
    }

    const meta = getTableMeta(this._table);
    const coll = this._db.getCollection(meta.name);
    const session = this._db.getSession();
    const valuesArray = Array.isArray(this._values) ? this._values : [this._values];
    const results: any[] = [];

    for (const values of valuesArray) {
      const { doc, pkValue } = prepareForStorage(values, meta.primaryKeyJsKey);

      // Determine _id
      let _id: any;
      if (pkValue !== undefined) {
        _id = pkValue;
      } else if (meta.hasAutoIncrement) {
        _id = await getNextId(coll, meta.name, session);
      } else {
        // No PK provided and not auto-increment — generate ObjectId
        _id = new ObjectId().toHexString();
      }

      doc._id = _id;
      await coll.insertOne(doc, { session });

      if (this._returning) {
        // Build result row from the values (avoids extra read)
        const row: Record<string, unknown> = { id: _id };
        for (const [key, val] of Object.entries(values)) {
          if (key !== meta.primaryKeyJsKey) {
            row[key] = val;
          }
        }
        results.push(row);
      }
    }

    if (this._returning) return results;
    return { rowCount: valuesArray.length };
  }
}

// ─── Update Query Builder ─────────────────────────────────────────────────────

class UpdateQuery {
  private _table: any;
  private _set: Record<string, any> | null = null;
  private _where: any = null;
  private _db: MongoDatabase;

  constructor(db: MongoDatabase, table: any) {
    this._db = db;
    this._table = table;
  }

  set(data: Record<string, any>): this {
    this._set = data;
    return this;
  }

  where(condition: any): this {
    this._where = condition;
    return this;
  }

  then<TResult = any>(
    onfulfilled?: ((value: any) => TResult | PromiseLike<TResult>) | null,
    onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | null,
  ): Promise<TResult> {
    return this._execute().then(onfulfilled, onrejected);
  }

  private async _execute(): Promise<void> {
    if (!this._set) {
      throw new Error('[MongoDB adapter] .set() is required on update queries');
    }

    const meta = getTableMeta(this._table);
    const coll = this._db.getCollection(meta.name);

    // Build filter
    const filter: Document = this._where
      ? conditionToFilter(parseCondition(this._where, this._table), meta.primaryKeyJsKey)
      : {};

    // Build update document
    const { doc: setDoc } = prepareForStorage(this._set, meta.primaryKeyJsKey);

    if (Object.keys(setDoc).length === 0) return;

    await coll.updateMany(filter, { $set: setDoc }, { session: this._db.getSession() });
  }
}

// ─── Delete Query Builder ─────────────────────────────────────────────────────

class DeleteQuery {
  private _table: any;
  private _where: any = null;
  private _db: MongoDatabase;

  constructor(db: MongoDatabase, table: any) {
    this._db = db;
    this._table = table;
  }

  where(condition: any): this {
    this._where = condition;
    return this;
  }

  then<TResult = any>(
    onfulfilled?: ((value: any) => TResult | PromiseLike<TResult>) | null,
    onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | null,
  ): Promise<TResult> {
    return this._execute().then(onfulfilled, onrejected);
  }

  private async _execute(): Promise<void> {
    const meta = getTableMeta(this._table);
    const coll = this._db.getCollection(meta.name);

    const filter: Document = this._where
      ? conditionToFilter(parseCondition(this._where, this._table), meta.primaryKeyJsKey)
      : {};

    await coll.deleteMany(filter, { session: this._db.getSession() });
  }
}

// ─── Main Database Class ──────────────────────────────────────────────────────

export class MongoDatabase {
  private _client: MongoClient;
  private _db: Db;
  private _session?: ClientSession;

  /** Exposes a no-op `exec()` for `$client.exec(sql)` calls (migrations only). */
  readonly $client = {
    exec(_sql: string): void {
      // No-op — raw SQL is only used in SQLite migrations
    },
  };

  constructor(client: MongoClient, db: Db, session?: ClientSession) {
    this._client = client;
    this._db = db;
    this._session = session;
  }

  /** Get a MongoDB collection by name. */
  getCollection(name: string): Collection<Document> {
    return this._db.collection(name);
  }

  /** Get the active session (undefined when not in a transaction). */
  getSession(): ClientSession | undefined {
    return this._session;
  }

  select(columns?: Record<string, any>): SelectQuery {
    return new SelectQuery(this, columns);
  }

  insert(table: any): InsertQuery {
    return new InsertQuery(this, table);
  }

  update(table: any): UpdateQuery {
    return new UpdateQuery(this, table);
  }

  delete(table: any): DeleteQuery {
    return new DeleteQuery(this, table);
  }

  /**
   * Execute a function within a MongoDB transaction.
   * Requires a MongoDB replica set or sharded cluster.
   */
  async transaction<T>(fn: (tx: MongoDatabase) => Promise<T>): Promise<T> {
    const session = this._client.startSession();
    try {
      let result!: T;
      await session.withTransaction(async () => {
        const txDb = new MongoDatabase(this._client, this._db, session);
        result = await fn(txDb);
      });
      return result;
    } finally {
      await session.endSession();
    }
  }

  /** Close the MongoDB connection. Call on shutdown. */
  async close(): Promise<void> {
    await this._client.close();
  }
}

// ─── Factory ──────────────────────────────────────────────────────────────────

/**
 * Create a MongoDatabase instance connected to the given MongoDB URI.
 *
 * @param uri - MongoDB connection string (e.g. "mongodb://localhost:27017/worldcore")
 * @param options - Optional MongoClient options
 * @returns A MongoDatabase instance with Drizzle-compatible query builder API
 */
export async function createMongoDb(
  uri: string,
  options?: MongoClientOptions,
): Promise<MongoDatabase> {
  const client = new MongoClient(uri, {
    // Sensible defaults for a local dev / single-server setup
    directConnection: true,
    ...options,
  });

  await client.connect();

  // Extract database name from URI, default to "worldcore"
  const url = new URL(uri);
  const dbName = url.pathname.replace(/^\//, '') || 'worldcore';
  const db = client.db(dbName);

  return new MongoDatabase(client, db);
}
