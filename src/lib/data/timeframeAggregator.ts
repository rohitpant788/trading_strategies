// Timeframe Aggregator
// Converts 1-minute candles to higher timeframes (5m, 15m, 30m, 1h)

import Database from 'better-sqlite3';
import { CandleData } from '@/types/orb';

/**
 * Aggregate 1-minute candles to specified timeframe using SQL
 * This is MUCH faster than doing it in JavaScript
 */
export function aggregate1mToTimeframe(
    db: Database.Database,
    startDate: Date,
    endDate: Date,
    timeframeMinutes: number
): CandleData[] {
    const startTs = Math.floor(startDate.getTime() / 1000);
    const endTs = Math.floor(endDate.getTime() / 1000);
    const bucketSeconds = timeframeMinutes * 60;

    // SQL aggregation query
    const query = `
        SELECT
            (timestamp / ${bucketSeconds}) * ${bucketSeconds} AS bucket_ts,
            (SELECT open FROM candles_1m WHERE timestamp >= bucket_ts AND timestamp < bucket_ts + ${bucketSeconds} ORDER BY timestamp ASC LIMIT 1) AS open,
            MAX(high) AS high,
            MIN(low) AS low,
            (SELECT close FROM candles_1m WHERE timestamp >= bucket_ts AND timestamp < bucket_ts + ${bucketSeconds} ORDER BY timestamp DESC LIMIT 1) AS close,
            SUM(volume) AS volume
        FROM candles_1m
        WHERE timestamp >= ? AND timestamp <= ?
        GROUP BY bucket_ts
        ORDER BY bucket_ts ASC
    `;

    const stmt = db.prepare(query);
    const rows = stmt.all(startTs, endTs) as Array<{
        bucket_ts: number;
        open: number;
        high: number;
        low: number;
        close: number;
        volume: number;
    }>;

    return rows.map(row => ({
        timestamp: new Date(row.bucket_ts * 1000),
        open: row.open,
        high: row.high,
        low: row.low,
        close: row.close,
        volume: row.volume || 0,
    }));
}

/**
 * Alternative: In-memory aggregation (use when DB is not available)
 * Slower but more flexible
 */
export function aggregateCandlesInMemory(
    candles: CandleData[],
    timeframeMinutes: number
): CandleData[] {
    if (candles.length === 0) return [];

    const bucketMs = timeframeMinutes * 60 * 1000;
    const buckets = new Map<number, CandleData[]>();

    // Group candles by bucket
    for (const candle of candles) {
        const bucketStart = Math.floor(candle.timestamp.getTime() / bucketMs) * bucketMs;

        if (!buckets.has(bucketStart)) {
            buckets.set(bucketStart, []);
        }
        buckets.get(bucketStart)!.push(candle);
    }

    // Aggregate each bucket
    const aggregated: CandleData[] = [];

    for (const [bucketStart, bucketCandles] of Array.from(buckets.entries()).sort((a, b) => a[0] - b[0])) {
        if (bucketCandles.length === 0) continue;

        // Sort by timestamp
        bucketCandles.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

        const open = bucketCandles[0].open;
        const close = bucketCandles[bucketCandles.length - 1].close;
        const high = Math.max(...bucketCandles.map(c => c.high));
        const low = Math.min(...bucketCandles.map(c => c.low));
        const volume = bucketCandles.reduce((sum, c) => sum + c.volume, 0);

        aggregated.push({
            timestamp: new Date(bucketStart),
            open,
            high,
            low,
            close,
            volume,
        });
    }

    return aggregated;
}

/**
 * Validate OHLC integrity
 */
export function validateOHLC(candle: CandleData): boolean {
    const { open, high, low, close } = candle;

    // High must be highest
    if (high < Math.max(open, close, low)) return false;

    // Low must be lowest
    if (low > Math.min(open, close, high)) return false;

    // Open and close must be within high/low range
    if (open < low || open > high) return false;
    if (close < low || close > high) return false;

    return true;
}

/**
 * Get aggregated candles with validation
 */
export function getAggregatedCandles(
    db: Database.Database,
    startDate: Date,
    endDate: Date,
    timeframeMinutes: number
): CandleData[] {
    const candles = aggregate1mToTimeframe(db, startDate, endDate, timeframeMinutes);

    // Validate all candles
    const validCandles = candles.filter(candle => {
        const isValid = validateOHLC(candle);
        if (!isValid) {
            console.warn('[Aggregator] Invalid OHLC detected:', candle);
        }
        return isValid;
    });

    console.log(`[Aggregator] Generated ${validCandles.length} ${timeframeMinutes}m candles`);
    return validCandles;
}
