// Data Service - Main Orchestrator
// Handles data fetching, caching, and aggregation

import { CandleData } from '@/types/orb';
import { parseISO, differenceInDays, format } from 'date-fns';
import {
    initializeDb,
    dbExists,
    getSyncMetadata,
    updateSyncMetadata,
    insertCandles,
    queryCandles,
    getDataCoverage,
    closeDb,
} from './sqliteAdapter';
import {
    fetchYahooData,
    fetchIncrementalData,
    fetchFullBackfill,
    fetchWithRetry,
} from './yahooFetcher';
import { getAggregatedCandles } from './timeframeAggregator';
import Database from 'better-sqlite3';

/**
 * Main function: Ensure data is available for backtesting
 * Handles: DB check → Fetch missing → Aggregate → Return
 */
export async function ensureDataAvailable(
    symbol: string,
    startDate: string,
    endDate: string,
    timeframeMinutes: number = 15
): Promise<CandleData[]> {
    const start = parseISO(startDate);
    const end = parseISO(endDate);

    console.log(`[DataService] Ensuring data for ${symbol}: ${startDate} to ${endDate} (${timeframeMinutes}m)`);

    // Step 1: Check if DB exists
    const dbExistsFlag = dbExists(symbol);
    const db = initializeDb(symbol);

    try {
        if (!dbExistsFlag) {
            console.log(`[DataService] New symbol ${symbol} - performing full backfill`);
            await performFullBackfill(db, symbol);
        } else {
            console.log(`[DataService] DB exists for ${symbol} - checking for gaps`);
            await performIncrementalSync(db, symbol);
        }

        // Step 2: Get aggregated candles for requested timeframe
        const candles = getAggregatedCandles(db, start, end, timeframeMinutes);

        // Step 3: Validate coverage
        if (candles.length === 0) {
            console.warn(`[DataService] No candles found for ${symbol} in range ${startDate} to ${endDate}`);
        } else {
            console.log(`[DataService] Returning ${candles.length} candles for ${symbol}`);
        }

        return candles;

    } finally {
        // Always close DB connection
        closeDb(db);
    }
}

/**
 * Perform full backfill (first time sync)
 */
async function performFullBackfill(db: Database.Database, symbol: string): Promise<void> {
    console.log(`[DataService] Full backfill for ${symbol}`);

    try {
        // Fetch last 7 days of 1-minute data (Yahoo limit)
        const candles = await fetchFullBackfill(symbol);

        if (candles.length === 0) {
            console.warn(`[DataService] No data received for ${symbol}`);
            return;
        }

        // Insert into DB
        const inserted = insertCandles(db, candles);
        console.log(`[DataService] Inserted ${inserted} candles for ${symbol}`);

        // Update metadata
        const firstTs = Math.floor(candles[0].timestamp.getTime() / 1000);
        const lastTs = Math.floor(candles[candles.length - 1].timestamp.getTime() / 1000);

        updateSyncMetadata(db, {
            firstAvailableTs: firstTs,
            lastSyncedTs: lastTs,
            lastSyncDate: new Date().toISOString(),
        });

        console.log(`[DataService] Backfill complete for ${symbol}`);
    } catch (error) {
        console.error(`[DataService] Backfill failed for ${symbol}:`, error);
        throw error;
    }
}

/**
 * Perform incremental sync (update existing DB)
 */
async function performIncrementalSync(db: Database.Database, symbol: string): Promise<void> {
    const metadata = getSyncMetadata(db);

    if (!metadata.lastSyncedTs) {
        console.warn(`[DataService] No sync metadata found, performing full backfill`);
        await performFullBackfill(db, symbol);
        return;
    }

    const lastSyncDate = new Date(metadata.lastSyncedTs * 1000);
    const now = new Date();
    const daysSinceSync = differenceInDays(now, lastSyncDate);

    console.log(`[DataService] Last synced: ${format(lastSyncDate, 'yyyy-MM-dd HH:mm')} (${daysSinceSync} days ago)`);

    // If last sync was today, skip
    if (daysSinceSync === 0) {
        console.log(`[DataService] Already synced today, skipping`);
        return;
    }

    try {
        // Fetch incremental data
        const candles = await fetchIncrementalData(symbol, metadata.lastSyncedTs);

        if (candles.length === 0) {
            console.log(`[DataService] No new data for ${symbol}`);
            return;
        }

        // Insert into DB
        const inserted = insertCandles(db, candles);
        console.log(`[DataService] Inserted ${inserted} new candles for ${symbol}`);

        // Update metadata
        const lastTs = Math.floor(candles[candles.length - 1].timestamp.getTime() / 1000);
        updateSyncMetadata(db, {
            lastSyncedTs: lastTs,
            lastSyncDate: new Date().toISOString(),
        });

        console.log(`[DataService] Incremental sync complete for ${symbol}`);
    } catch (error) {
        console.error(`[DataService] Incremental sync failed for ${symbol}:`, error);
        // Don't throw - we can still use existing data
    }
}

/**
 * Get data coverage info for a symbol
 */
export function getSymbolCoverage(symbol: string): {
    exists: boolean;
    coverage?: {
        firstDate: Date | null;
        lastDate: Date | null;
        totalCandles: number;
    };
} {
    if (!dbExists(symbol)) {
        return { exists: false };
    }

    const db = initializeDb(symbol);
    try {
        const coverage = getDataCoverage(db);
        return { exists: true, coverage };
    } finally {
        closeDb(db);
    }
}

/**
 * Force sync for a symbol (manual trigger)
 */
export async function forceSync(symbol: string): Promise<void> {
    console.log(`[DataService] Force sync for ${symbol}`);
    const db = initializeDb(symbol);
    try {
        await performIncrementalSync(db, symbol);
    } finally {
        closeDb(db);
    }
}
