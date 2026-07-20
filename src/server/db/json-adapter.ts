/**
 * JSON file-backed Drizzle ORM-compatible database adapter.
 *
 * Stores each table as a JSON file under `data/jsonstore/<tableName>.json`.
 * Provides the same query-builder API surface that Drizzle's SQLite adapter
 * exposes so services can swap `db` without changing call sites.
 *
 * Supported operations:
 *   - SELECT with column selection, WHERE, ORDER BY, LIMIT
 *   - INSERT with .returning()
 *   - UPDATE with WHERE
 *   - DELETE with WHERE
 *   - transactions (sequential execution with shared lock)
 *
 * Supported Drizzle operators: eq, and, or, asc, desc
 */

import { mkdirSync, readFileSync, writeFileSync, renameSync, existsSync } from 'node:fs';
import { join } from 'node:path';

// ---------------------------------------------------------------------------
// Constants & mutable store directory (set by JsonDatabase constructor)
// ---------------------------------------------------------------------------

const DEFAULT_STORE_DIR = join(process.cwd(), 'data', 'jsonstore');
let _activeStoreDir = DEFAULT_STORE_DIR;

// ---------------------------------------------------------------------------
// Drizzle AST type guards
//
// We introspect the SQL objects that eq() / and() / or() / asc() / desc()
// produce without importing internal drizzle-orm symbols.
// ---------------------------------------------------------------------------

interface SqlChunk {
  queryChunks: readonly unknown[];
}

interface ParamChunk {
  value: unknown;
  encoder: unknown;
}

interface ColumnChunk {
  name: string;
  table: unknown;
  dataType: string;
  default?: unknown;
  notNull?: boolean;
  autoIncrement?: boolean;
  mode?: string;
}

interface StringChunk {
  value: readonly string[];
}

function isSql(obj: unknown): obj is SqlChunk {
  return obj !== null && typeof obj === 'object' && 'queryChunks' in obj;
}

function isParam(obj: unknown): obj is ParamChunk {
  return obj !== null && typeof obj === 'object' && 'value' in obj && 'encoder' in obj;
}

function isColumn(obj: unknown): obj is ColumnChunk {
  return (
    obj !== null && typeof obj === 'object' && 'name' in obj && 'table' in obj && 'dataType' in obj
  );
}

function isStringChunk(obj: unknown): obj is StringChunk {
  return (
    obj !== null &&
    typeof obj === 'object' &&
    'value' in obj &&
    Array.isArray((obj as StringChunk).value) &&
    typeof (obj as StringChunk).value[0] === 'string' &&
    !('encoder' in obj) &&
    !('queryChunks' in obj)
  );
}

// ---------------------------------------------------------------------------
// Table introspection helpers
// ---------------------------------------------------------------------------

/** Get the SQL table name from a Drizzle table object. */
function getTableName(table: unknown): string {
  const t = table as Record<string | symbol, unknown>;
  const sym = Object.getOwnPropertySymbols(t).find((s) => s.toString().includes('Name'));
  if (sym) return String(t[sym]);
  // Fallback – shouldn't happen with proper Drizzle tables
  return (table as { name?: string }).name ?? 'unknown';
}

type ColumnMeta = { jsKey: string; dbName: string };
type ColumnLookup = Map<object | string, ColumnMeta>;

/** Build a lookup from column-object → JS key name for a given table. */
function buildColumnMap(table: unknown): ColumnLookup {
  const map: ColumnLookup = new Map();
  const t = table as Record<string, unknown>;
  for (const key of Object.keys(t)) {
    const col = t[key];
    if (isColumn(col)) {
      const meta: ColumnMeta = { jsKey: key, dbName: col.name };
      map.set(col, meta);
      map.set(col.name, meta);
    }
  }
  return map;
}

/** Resolve a Drizzle Column chunk to its JS property name. */
function resolveJsKey(column: ColumnChunk, columnMap: ColumnLookup): string {
  const meta = columnMap.get(column);
  if (meta) return meta.jsKey;
  // Fallback: look up by DB name
  const byName = columnMap.get(column.name);
  if (byName) return byName.jsKey;
  return column.name;
}

// ---------------------------------------------------------------------------
// AST condition evaluator – walks the SQL tree produced by eq / and / or
// ---------------------------------------------------------------------------

/**
 * Evaluate a Drizzle SQL condition AST against a single row of data.
 *
 * The AST is produced by Drizzle's `eq`, `and`, `or` operators and has this
 * recursive structure:
 *
 *   eq(col, val)    → SQL{ chunks: ["" | Column, " = ", Param(val), ""] }
 *   and(c1, c2, …)  → SQL{ chunks: ["(", SQL{ chunks: [c1, " and ", c2, …] }, ")"] }
 *   or(c1, c2, …)   → SQL{ chunks: ["(", SQL{ chunks: [c1, " or ", c2, …] }, ")"] }
 */
function evaluateCondition(
  condition: unknown,
  row: Record<string, unknown>,
  columnMap: ColumnLookup,
): boolean {
  if (!isSql(condition)) return true; // no condition → pass

  let chunks = [...condition.queryChunks];

  // Unwrap matching outer parentheses
  while (chunks.length >= 2) {
    const first = chunks[0];
    const last = chunks[chunks.length - 1];
    if (
      isStringChunk(first) &&
      first.value.join('') === '(' &&
      isStringChunk(last) &&
      last.value.join('') === ')'
    ) {
      chunks = chunks.slice(1, -1);
    } else {
      break;
    }
  }

  // Single nested SQL object → descend
  if (chunks.length === 1 && isSql(chunks[0])) {
    return evaluateCondition(chunks[0], row, columnMap);
  }

  // Scan for AND / OR separators (left-to-right; Drizzle's parentheses
  // already encode precedence so order doesn't matter).
  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    if (isStringChunk(chunk)) {
      const val = chunk.value.join('');
      if (val === ' and ') {
        const left = evaluateCondition({ queryChunks: chunks.slice(0, i) }, row, columnMap);
        const right = evaluateCondition({ queryChunks: chunks.slice(i + 1) }, row, columnMap);
        return left && right;
      }
      if (val === ' or ') {
        const left = evaluateCondition({ queryChunks: chunks.slice(0, i) }, row, columnMap);
        const right = evaluateCondition({ queryChunks: chunks.slice(i + 1) }, row, columnMap);
        return left || right;
      }
    }
  }

  // No separator – evaluate as a single comparison (column OP value)
  return evaluateComparison(chunks, row, columnMap);
}

/** Evaluate a single comparison like `column = value`. */
function evaluateComparison(
  chunks: readonly unknown[],
  row: Record<string, unknown>,
  columnMap: ColumnLookup,
): boolean {
  let column: ColumnChunk | null = null;
  let operator = '';
  let value: unknown = undefined;

  for (const chunk of chunks) {
    if (isColumn(chunk)) {
      column = chunk;
    } else if (isStringChunk(chunk)) {
      const s = chunk.value.join('').trim();
      if (
        s === '=' ||
        s === '<>' ||
        s === '!=' ||
        s === '>' ||
        s === '>=' ||
        s === '<' ||
        s === '<=' ||
        s.toUpperCase() === 'LIKE'
      ) {
        operator = s;
      }
    } else if (isParam(chunk)) {
      value = chunk.value;
    }
  }

  if (!column || !operator) return true; // unparseable → pass

  const jsKey = resolveJsKey(column, columnMap);
  const rowVal = row[jsKey];

  switch (operator) {
    case '=':
      return rowVal === value;
    case '<>':
    case '!=':
      return rowVal !== value;
    case '>':
      return (rowVal as number) > (value as number);
    case '>=':
      return (rowVal as number) >= (value as number);
    case '<':
      return (rowVal as number) < (value as number);
    case '<=':
      return (rowVal as number) <= (value as number);
    case 'LIKE':
    case 'like': {
      if (typeof rowVal !== 'string' || typeof value !== 'string') return false;
      const pattern = (value as string).replace(/%/g, '.*').replace(/_/g, '.');
      return new RegExp(`^${pattern}$`, 'i').test(rowVal);
    }
    default:
      return true;
  }
}

// ---------------------------------------------------------------------------
// Order-by parser
// ---------------------------------------------------------------------------

interface OrderBySpec {
  jsKey: string;
  direction: 'asc' | 'desc';
}

function parseOrderByExpression(expr: unknown, columnMap: ColumnLookup): OrderBySpec | null {
  if (!isSql(expr)) return null;
  const chunks = expr.queryChunks;

  let column: ColumnChunk | null = null;
  let direction: 'asc' | 'desc' = 'asc';

  for (const chunk of chunks) {
    if (isColumn(chunk)) {
      column = chunk;
    } else if (isStringChunk(chunk)) {
      const s = chunk.value.join('').trim().toLowerCase();
      if (s === 'asc') direction = 'asc';
      else if (s === 'desc') direction = 'desc';
    }
  }

  if (!column) return null;
  return { jsKey: resolveJsKey(column, columnMap), direction };
}

// ---------------------------------------------------------------------------
// JSON file storage with atomic writes
// ---------------------------------------------------------------------------

let storeDir = DEFAULT_STORE_DIR;

function ensureStoreDir(): void {
  mkdirSync(storeDir, { recursive: true });
}

function filePathFor(tableName: string): string {
  return join(_activeStoreDir, `${tableName}.json`);
}

function readTableData(tableName: string): Record<string, unknown>[] {
  const fp = filePathFor(tableName);
  if (!existsSync(fp)) return [];
  try {
    const raw = readFileSync(fp, 'utf-8');
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as Record<string, unknown>[]) : [];
  } catch {
    return [];
  }
}

function writeTableData(tableName: string, rows: Record<string, unknown>[]): void {
  ensureStoreDir();
  const fp = filePathFor(tableName);
  const tmp = `${fp}.tmp.${Date.now()}.${Math.random().toString(36).slice(2, 8)}`;
  writeFileSync(tmp, JSON.stringify(rows));
  renameSync(tmp, fp);
}

// ---------------------------------------------------------------------------
// Per-table async lock (ensures serial writes per table)
// ---------------------------------------------------------------------------

const lockQueues = new Map<string, Promise<unknown>>();

async function withTableLock<T>(tableName: string, fn: () => T | Promise<T>): Promise<T> {
  const prev = lockQueues.get(tableName) ?? Promise.resolve();
  let release!: () => void;
  const current = new Promise<void>((r) => {
    release = r;
  });
  lockQueues.set(tableName, current);
  try {
    await prev;
    return await fn();
  } finally {
    release();
    if (lockQueues.get(tableName) === current) {
      lockQueues.delete(tableName);
    }
  }
}

// ---------------------------------------------------------------------------
// Auto-increment tracker
// ---------------------------------------------------------------------------

const autoIncrements = new Map<string, number>();

function computeNextId(tableName: string, rows: Record<string, unknown>[]): number {
  // Use cached next-id if it is still ahead of any existing row
  let next = autoIncrements.get(tableName) ?? 0;
  for (const row of rows) {
    if (typeof row.id === 'number' && row.id >= next) {
      next = row.id + 1;
    }
  }
  autoIncrements.set(tableName, next);
  return next;
}

/** Reset auto-increment cache for a table (useful after bulk loads). */
export function resetAutoIncrement(tableName: string): void {
  autoIncrements.delete(tableName);
}

// ---------------------------------------------------------------------------
// Default-value helpers – mirrors what Drizzle/SQLite applies automatically
// ---------------------------------------------------------------------------

function applyDefaults(table: unknown, data: Record<string, unknown>): Record<string, unknown> {
  const t = table as Record<string, unknown>;
  const result = { ...data };
  for (const key of Object.keys(t)) {
    const col = t[key];
    if (isColumn(col) && result[key] === undefined) {
      if (col.default !== undefined) {
        result[key] = col.default;
      } else if (col.notNull) {
        switch (col.dataType) {
          case 'number':
            result[key] = 0;
            break;
          case 'string':
            result[key] = '';
            break;
          case 'boolean':
            result[key] = false;
            break;
          default:
            result[key] = null;
        }
      }
    }
  }
  return result;
}

function isAutoIncrement(col: ColumnChunk): boolean {
  return col.autoIncrement === true;
}

// ---------------------------------------------------------------------------
// SELECT query builder
// ---------------------------------------------------------------------------

class SelectQuery {
  private _table: unknown = null;
  private _selectCols: Record<string, unknown> | null = null;
  private _condition: unknown = null;
  private _limitN: number | null = null;
  private _orderBySpecs: OrderBySpec[] = [];
  private _columnMap: ColumnLookup = new Map();
  private _result?: Promise<unknown[]>;

  /** `.select()` / `.select({ col: table.col })` */
  select(columns?: Record<string, unknown>): this {
    if (columns) this._selectCols = columns;
    return this;
  }

  /** `.from(table)` */
  from(table: unknown): this {
    this._table = table;
    this._columnMap = buildColumnMap(table) as ColumnLookup;
    return this;
  }

  /** `.where(condition)` – accepts Drizzle eq/and/or output */
  where(condition: unknown): this {
    this._condition = condition;
    return this;
  }

  /** `.limit(n)` */
  limit(n: number): this {
    this._limitN = n;
    return this;
  }

  /** `.orderBy(asc(col))` or `.orderBy(asc(a), desc(b))` */
  orderBy(...specs: unknown[]): this {
    this._orderBySpecs = specs
      .map((s) => parseOrderByExpression(s, this._columnMap))
      .filter((s): s is OrderBySpec => s !== null);
    return this;
  }

  /** Thenable – makes `await query` execute the SELECT. */
  then<R>(
    onFulfilled?: (value: unknown[]) => R | PromiseLike<R>,
    onRejected?: (reason: unknown) => unknown,
  ): Promise<R> {
    this._result ??= this._execute();
    return this._result.then(onFulfilled, onRejected) as Promise<R>;
  }

  // -- internal execution --------------------------------------------------

  private async _execute(): Promise<unknown[]> {
    const tableName = getTableName(this._table);
    return withTableLock(tableName, () => {
      let rows = readTableData(tableName);

      // Filter by condition
      if (this._condition !== null) {
        rows = rows.filter((row) => evaluateCondition(this._condition, row, this._columnMap));
      }

      // Sort
      if (this._orderBySpecs.length > 0) {
        rows = [...rows].sort((a, b) => {
          for (const spec of this._orderBySpecs) {
            const aVal = a[spec.jsKey];
            const bVal = b[spec.jsKey];
            if (aVal === bVal) continue;
            if (aVal == null) return 1; // nulls last
            if (bVal == null) return -1;
            const cmp = aVal < bVal ? -1 : 1;
            return spec.direction === 'asc' ? cmp : -cmp;
          }
          return 0;
        });
      }

      // Limit
      if (this._limitN !== null) {
        rows = rows.slice(0, this._limitN);
      }

      // Column projection
      if (this._selectCols) {
        return rows.map((row) => {
          const projected: Record<string, unknown> = {};
          for (const [outputKey, col] of Object.entries(this._selectCols!)) {
            if (isColumn(col)) {
              const jsKey = resolveJsKey(col, this._columnMap);
              projected[outputKey] = row[jsKey];
            }
          }
          return projected;
        });
      }

      return rows;
    });
  }
}

// ---------------------------------------------------------------------------
// INSERT query builder
// ---------------------------------------------------------------------------

class InsertQuery {
  private _table: unknown = null;
  private _values: Record<string, unknown>[] = [];
  private _returning = false;
  private _columnMap: ColumnLookup = new Map();
  private _result?: Promise<unknown>;

  /** `.values(row)` or `.values([row1, row2])` */
  values(data: Record<string, unknown> | Record<string, unknown>[]): this {
    this._values = Array.isArray(data) ? data : [data];
    return this;
  }

  /** `.returning()` – makes the insert return the inserted row(s). */
  returning(): this {
    this._returning = true;
    return this;
  }

  /** Thenable – makes `await insert` execute the INSERT. */
  then<R>(
    onFulfilled?: (value: unknown) => R | PromiseLike<R>,
    onRejected?: (reason: unknown) => unknown,
  ): Promise<R> {
    this._result ??= this._execute();
    return this._result.then(onFulfilled, onRejected) as Promise<R>;
  }

  // -- internal execution --------------------------------------------------

  private async _execute(): Promise<unknown> {
    const tableName = getTableName(this._table);
    const columnMap = buildColumnMap(this._table);
    const table = this._table;

    return withTableLock(tableName, () => {
      const rows = readTableData(tableName);
      const inserted: Record<string, unknown>[] = [];

      for (const raw of this._values) {
        // Apply defaults
        const data = applyDefaults(table, raw);

        // Auto-increment ID if the table has an auto-increment primary key
        const idCol = Object.keys(table as Record<string, unknown>).find((k) => {
          const col = (table as Record<string, unknown>)[k];
          return isColumn(col) && isAutoIncrement(col);
        });
        if (idCol && data.id === undefined) {
          data.id = computeNextId(tableName, rows);
        }

        // Normalise: store booleans as booleans, JSON columns as objects
        for (const [key, val] of Object.entries(data)) {
          const col = (table as Record<string, unknown>)[key];
          if (isColumn(col)) {
            // Boolean mode columns: ensure boolean
            if (
              col.dataType === 'boolean' ||
              (col as unknown as { mode?: string }).mode === 'boolean'
            ) {
              data[key] = val === 1 || val === true;
            }
          }
        }

        rows.push(data);
        inserted.push(data);
      }

      writeTableData(tableName, rows);

      if (this._returning) {
        // Return projected rows (using column map for consistent output)
        return inserted.map((row) => {
          const projected: Record<string, unknown> = {};
          for (const key of Object.keys(row)) {
            projected[key] = row[key];
          }
          return projected;
        });
      }
      return undefined;
    });
  }
}

// ---------------------------------------------------------------------------
// UPDATE query builder
// ---------------------------------------------------------------------------

class UpdateQuery {
  private _table: unknown = null;
  private _set: Record<string, unknown> = {};
  private _condition: unknown = null;
  private _columnMap: ColumnLookup = new Map();
  private _result?: Promise<void>;

  /** `.set({ col: value, … })` */
  set(data: Record<string, unknown>): this {
    this._set = data;
    return this;
  }

  /** `.where(condition)` */
  where(condition: unknown): this {
    this._condition = condition;
    return this;
  }

  /** Thenable – makes `await update` execute the UPDATE. */
  then<R>(
    onFulfilled?: (value: void) => R | PromiseLike<R>,
    onRejected?: (reason: unknown) => unknown,
  ): Promise<R> {
    this._result ??= this._execute();
    return this._result.then(onFulfilled, onRejected) as Promise<R>;
  }

  // -- internal execution --------------------------------------------------

  private async _execute(): Promise<void> {
    const tableName = getTableName(this._table);
    const columnMap = buildColumnMap(this._table);
    const table = this._table;

    await withTableLock(tableName, () => {
      const rows = readTableData(tableName);
      const condition = this._condition;

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i]!;
        if (condition !== null && !evaluateCondition(condition, row, columnMap)) {
          continue;
        }

        // Merge set values, normalising types
        for (const [jsKey, val] of Object.entries(this._set)) {
          const col = (table as Record<string, unknown>)[jsKey];
          if (isColumn(col)) {
            if (
              col.dataType === 'boolean' ||
              (col as unknown as { mode?: string }).mode === 'boolean'
            ) {
              row[jsKey] = val === 1 || val === true;
            } else {
              row[jsKey] = val;
            }
          } else {
            row[jsKey] = val;
          }
        }
      }

      writeTableData(tableName, rows);
    });
  }
}

// ---------------------------------------------------------------------------
// DELETE query builder
// ---------------------------------------------------------------------------

class DeleteQuery {
  private _table: unknown = null;
  private _condition: unknown = null;
  private _columnMap: ColumnLookup = new Map();
  private _result?: Promise<void>;

  /** `.where(condition)` */
  where(condition: unknown): this {
    this._condition = condition;
    return this;
  }

  /** Thenable – makes `await delete` execute the DELETE. */
  then<R>(
    onFulfilled?: (value: void) => R | PromiseLike<R>,
    onRejected?: (reason: unknown) => unknown,
  ): Promise<R> {
    this._result ??= this._execute();
    return this._result.then(onFulfilled, onRejected) as Promise<R>;
  }

  // -- internal execution --------------------------------------------------

  private async _execute(): Promise<void> {
    const tableName = getTableName(this._table);
    const columnMap = buildColumnMap(this._table);
    const condition = this._condition;

    await withTableLock(tableName, () => {
      const rows = readTableData(tableName);
      const kept = rows.filter(
        (row) => condition === null || !evaluateCondition(condition, row, columnMap),
      );
      writeTableData(tableName, kept);
    });
  }
}

// ---------------------------------------------------------------------------
// JsonDatabase – the main adapter class
// ---------------------------------------------------------------------------

export class JsonDatabase {
  /** Mimics Drizzle's `$client` used for raw SQL (migrations). No-op here. */
  readonly $client = {
    exec(_sql: string): void {
      // JSON backend has no raw-SQL path – migrations are not applicable.
    },
  };

  private _storeDir: string;

  constructor(storeDir?: string) {
    this._storeDir = storeDir ?? DEFAULT_STORE_DIR;
    _activeStoreDir = this._storeDir;
  }

  /** `db.select()` or `db.select({ col: table.col })` */
  select(columns?: Record<string, unknown>): SelectQuery {
    const q = new SelectQuery();
    return q.select(columns);
  }

  /** `db.insert(table)` → chain `.values(…)` then optional `.returning()` */
  insert(table: unknown): InsertQuery {
    const q = new InsertQuery();
    (q as unknown as { _table: unknown })._table = table;
    return q;
  }

  /** `db.update(table)` → chain `.set(…)` then `.where(…)` */
  update(table: unknown): UpdateQuery {
    const q = new UpdateQuery();
    (q as unknown as { _table: unknown })._table = table;
    return q;
  }

  /** `db.delete(table)` → chain `.where(…)` */
  delete(table: unknown): DeleteQuery {
    const q = new DeleteQuery();
    (q as unknown as { _table: unknown })._table = table;
    return q;
  }

  /**
   * `db.transaction(async (tx) => { … })`
   *
   * Executes the callback with `this` as the transaction context.
   * Each operation acquires the per-table lock, so sequential operations
   * within the transaction are consistent.
   */
  async transaction<T>(fn: (tx: JsonDatabase) => Promise<T>): Promise<T> {
    return fn(this);
  }
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

/**
 * Create a JsonDatabase instance.
 *
 * @param storeDir  Directory for JSON files (default: `data/jsonstore`).
 */
export function createJsonDb(storeDir?: string): JsonDatabase {
  return new JsonDatabase(storeDir);
}
