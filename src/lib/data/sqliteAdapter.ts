// SQLite Adapter - Manages per-symbol SQLite databases
// Stores 1-minute candles as source of truth

import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { CandleData } from '@/types/orb';

const DATA_DIR = path.join(process.cwd(), 'data');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
}

export interface SyncMetadata {
    lastSyncedTs?: number;
    firstAvailableTs?: number;
    symbol: string;
    lastSyncDate?: string;
}

/**
 * Get database path for a symbol
 */
function getDbPath(symbol: string): string {
    return path.join(DATA_DIR, `${symbol}.db`);
}

/**
 * Initialize database for a symbol
 * Creates tables if they don't exist
 */
export function initializeDb(symbol: string): Database.Database {
    const dbPath = getDbPath(symbol);
    const db = new Database(dbPath);

    // Enable WAL mode for better concurrent access
    db.pragma('journal_mode = WAL');

    // Create candles_1m table
    db.exec(`
        CREATE TABLE IF NOT EXISTS candles_1m (
            timestamp INTEGER PRIMARY KEY,
            open REAL NOT NULL,
            high REAL NOT NULL,
            low REAL NOT NULL,
            close REAL NOT NULL,
            volume REAL
        );
    `);

    // Create index on timestamp
    db.exec(`
        CREATE INDEX IF NOT EXISTS idx_timestamp ON candles_1m(timestamp);
    `);

    // Create sync metadata table
    db.exec(`
        CREATE TABLE IF NOT EXISTS sync_meta (
            key TEXT PRIMARY KEY,
            value TEXT
        );
    `);

    // Initialize metadata if not exists
    const metaStmt = db.prepare('SELECT value FROM sync_meta WHERE key = ?');
    const symbolMeta = metaStmt.get('symbol');

    if (!symbolMeta) {
        const insertMeta = db.prepare('INSERT OR REPLACE INTO sync_meta (key, value) VALUES (?, ?)');
        insertMeta.run('symbol', symbol);
    }

    return db;
}

/**
 * Insert 1-minute candles (idempotent)
 */
export function insertCandles(db: Database.Database, candles: CandleData[]): number {
    const insert = db.prepare(`
        INSERT OR IGNORE INTO candles_1m (timestamp, open, high, low, close, volume)
        VALUES (?, ?, ?, ?, ?, ?)
    `);

    const insertMany = db.transaction((candles: CandleData[]) => {
        let inserted = 0;
        for (const candle of candles) {
            const timestamp = Math.floor(candle.timestamp.getTime() / 1000);
            const result = insert.run(
                timestamp,
                candle.open,
                candle.high,
                candle.low,
                candle.close,
                candle.volume
            );
            if (result.changes > 0) inserted++;
        }
        return inserted;
    });

    return insertMany(candles);
}

/**
 * Query candles by date range
 */
export function queryCandles(
    db: Database.Database,
    startDate: Date,
    endDate: Date
): CandleData[] {
    const startTs = Math.floor(startDate.getTime() / 1000);
    const endTs = Math.floor(endDate.getTime() / 1000);

    const stmt = db.prepare(`
        SELECT timestamp, open, high, low, close, volume
        FROM candles_1m
        WHERE timestamp >= ? AND timestamp <= ?
        ORDER BY timestamp ASC
    `);

    const rows = stmt.all(startTs, endTs) as Array<{
        timestamp: number;
        open: number;
        high: number;
        low: number;
        close: number;
        volume: number;
    }>;

    return rows.map(row => ({
        timestamp: new Date(row.timestamp * 1000),
        open: row.open,
        high: row.high,
        low: row.low,
        close: row.close,
        volume: row.volume,
    }));
}

/**
 * Get sync metadata
 */
export function getSyncMetadata(db: Database.Database): SyncMetadata {
    const stmt = db.prepare('SELECT key, value FROM sync_meta');
    const rows = stmt.all() as Array<{ key: string; value: string }>;

    const metadata: SyncMetadata = {
        symbol: '',
    };

    for (const row of rows) {
        if (row.key === 'symbol') metadata.symbol = row.value;
        if (row.key === 'last_synced_ts') metadata.lastSyncedTs = parseInt(row.value);
        if (row.key === 'first_available_ts') metadata.firstAvailableTs = parseInt(row.value);
        if (row.key === 'last_sync_date') metadata.lastSyncDate = row.value;
    }

    return metadata;
}

/**
 * Update sync metadata
 */
export function updateSyncMetadata(
    db: Database.Database,
    updates: Partial<SyncMetadata>
): void {
    const stmt = db.prepare('INSERT OR REPLACE INTO sync_meta (key, value) VALUES (?, ?)');

    const updateMany = db.transaction(() => {
        if (updates.lastSyncedTs !== undefined) {
            stmt.run('last_synced_ts', updates.lastSyncedTs.toString());
        }
        if (updates.firstAvailableTs !== undefined) {
            stmt.run('first_available_ts', updates.firstAvailableTs.toString());
        }
        if (updates.lastSyncDate !== undefined) {
            stmt.run('last_sync_date', updates.lastSyncDate);
        }
    });

    updateMany();
}

/**
 * Get data coverage info
 */
export function getDataCoverage(db: Database.Database): {
    firstDate: Date | null;
    lastDate: Date | null;
    totalCandles: number;
} {
    const countStmt = db.prepare('SELECT COUNT(*) as count FROM candles_1m');
    const countResult = countStmt.get() as { count: number };

    const rangeStmt = db.prepare('SELECT MIN(timestamp) as first, MAX(timestamp) as last FROM candles_1m');
    const rangeResult = rangeStmt.get() as { first: number | null; last: number | null };

    return {
        firstDate: rangeResult.first ? new Date(rangeResult.first * 1000) : null,
        lastDate: rangeResult.last ? new Date(rangeResult.last * 1000) : null,
        totalCandles: countResult.count,
    };
}

/**
 * Check if database exists for symbol
 */
export function dbExists(symbol: string): boolean {
    const dbPath = getDbPath(symbol);
    return fs.existsSync(dbPath);
}

/**
 * Close database connection
 */
export function closeDb(db: Database.Database): void {
    db.close();
}
