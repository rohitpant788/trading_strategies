// Yahoo Finance Data Fetcher
// Fetches 1-minute historical data with incremental sync support

import { CandleData } from '@/types/orb';
import { format, addDays, subDays } from 'date-fns';

/**
 * Get Yahoo Finance symbol format (add .NS for NSE stocks)
 */
function getYahooSymbol(symbol: string): string {
    // If already has exchange suffix or is an index, return as-is
    if (symbol.includes('.') || symbol.startsWith('^')) {
        return symbol;
    }
    // Add NSE suffix for Indian stocks
    return `${symbol}.NS`;
}

/**
 * Fetch 1-minute candles from Yahoo Finance
 */
export async function fetchYahooData(
    symbol: string,
    startDate: Date,
    endDate: Date,
    interval: string = '1m'
): Promise<CandleData[]> {
    const yahooSymbol = getYahooSymbol(symbol);

    // Yahoo Finance API expects Unix timestamps
    const period1 = Math.floor(startDate.getTime() / 1000);
    const period2 = Math.floor(endDate.getTime() / 1000);

    // Use provided interval
    // const interval = '1m'; // Removed hardcode

    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${yahooSymbol}?period1=${period1}&period2=${period2}&interval=${interval}&includePrePost=false`;

    console.log(`[Yahoo] Fetching ${symbol} from ${format(startDate, 'yyyy-MM-dd')} to ${format(endDate, 'yyyy-MM-dd')}`);

    try {
        const response = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0',
            },
        });

        if (!response.ok) {
            throw new Error(`Yahoo Finance API error: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();

        // Validate response
        if (!data.chart || !data.chart.result || data.chart.result.length === 0) {
            console.warn(`[Yahoo] No data returned for ${symbol}`);
            return [];
        }

        const result = data.chart.result[0];
        const timestamps = result.timestamp as number[];
        const quotes = result.indicators.quote[0];

        if (!timestamps || timestamps.length === 0) {
            console.warn(`[Yahoo] Empty timestamps for ${symbol}`);
            return [];
        }

        // Map to CandleData format
        const candles: CandleData[] = [];

        for (let i = 0; i < timestamps.length; i++) {
            const timestamp = new Date(timestamps[i] * 1000);
            const open = quotes.open[i];
            const high = quotes.high[i];
            const low = quotes.low[i];
            const close = quotes.close[i];
            const volume = quotes.volume[i];

            // Skip invalid candles
            if (open === null || high === null || low === null || close === null) {
                continue;
            }

            candles.push({
                timestamp,
                open,
                high,
                low,
                close,
                volume: volume || 0,
            });
        }

        console.log(`[Yahoo] Fetched ${candles.length} candles for ${symbol}`);
        return candles;

    } catch (error) {
        console.error(`[Yahoo] Error fetching ${symbol}:`, error);
        throw error;
    }
}

/**
 * Fetch incremental data (from last synced timestamp to now)
 */
export async function fetchIncrementalData(
    symbol: string,
    lastSyncedTs: number
): Promise<CandleData[]> {
    const startDate = new Date(lastSyncedTs * 1000);

    // Add 1 minute to avoid duplicate
    startDate.setMinutes(startDate.getMinutes() + 1);

    const endDate = new Date();

    return fetchYahooData(symbol, startDate, endDate);
}

/**
 * Fetch full backfill (max data available)
 * Yahoo Finance 1-minute data is limited to ~7 days
 */
export async function fetchFullBackfill(symbol: string): Promise<CandleData[]> {
    // Fetch last 7 days of 1-minute data
    const endDate = new Date();
    const startDate = subDays(endDate, 7);

    return fetchYahooData(symbol, startDate, endDate);
}

/**
 * Retry mechanism for failed fetches
 */
export async function fetchWithRetry(
    symbol: string,
    startDate: Date,
    endDate: Date,
    maxRetries: number = 3
): Promise<CandleData[]> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            return await fetchYahooData(symbol, startDate, endDate);
        } catch (error) {
            lastError = error as Error;
            console.error(`[Yahoo] Attempt ${attempt}/${maxRetries} failed for ${symbol}:`, error);

            if (attempt < maxRetries) {
                // Exponential backoff: 1s, 2s, 4s
                const delayMs = Math.pow(2, attempt - 1) * 1000;
                console.log(`[Yahoo] Retrying in ${delayMs}ms...`);
                await new Promise(resolve => setTimeout(resolve, delayMs));
            }
        }
    }

    throw lastError || new Error('Failed to fetch data after retries');
}
