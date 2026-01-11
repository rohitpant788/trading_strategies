
import { NextRequest, NextResponse } from 'next/server';
import { runWeeklyBacktest } from '@/lib/weekly-close/runner';
import { runSIPBacktest } from '@/lib/weekly-close/sipRunner';
import { WeeklyStrategyConfig } from '@/lib/weekly-close/types';
import { fetchYahooData } from '@/lib/data/yahooFetcher';
import { CandleData } from '@/types/orb';
import { generateMockData } from '@/lib/weekly-close/mock';
import Papa from 'papaparse';

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { config, csvContent } = body;

        let candles: CandleData[] = [];

        if (csvContent) {
            // Parse CSV
            console.log('[API] Parsing uploaded CSV...');
            const result = Papa.parse(csvContent, {
                header: true,
                skipEmptyLines: true,
                dynamicTyping: true,
            });

            if (result.errors.length > 0) {
                console.error('[API] CSV Parse Errors:', result.errors);
                return NextResponse.json({ success: false, error: 'Failed to parse CSV' }, { status: 400 });
            }

            // Map CSV to CandleData
            candles = result.data.map((row: any) => {
                const dateStr = row['Date'] || row['date'] || row['time'];
                return {
                    timestamp: new Date(dateStr),
                    open: row['Open'] ?? row['open'],
                    high: row['High'] ?? row['high'],
                    low: row['Low'] ?? row['low'],
                    close: row['Close'] ?? row['close'],
                    volume: row['Volume'] ?? row['volume'] ?? 0,
                } as CandleData;
            }).filter(c => !isNaN(c.close) && !isNaN(c.timestamp.getTime()));

            console.log(`[API] Loaded ${candles.length} candles from CSV`);

        } else {
            // Fetch from Yahoo
            console.log(`[API] Fetching data for ${config.symbol}...`);
            const startDate = new Date(config.startDate);
            const endDate = new Date(config.endDate);

            try {
                candles = await fetchYahooData(config.symbol, startDate, endDate, '1d');
            } catch (error) {
                console.warn('[API] Yahoo fetch failed (likely 429/404). Using MOCK data fallback.');
                // Calculate diff days roughly
                const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                candles = generateMockData(startDate, diffDays);
            }
        }

        if (candles.length === 0) {
            return NextResponse.json({ success: false, error: 'No data available' }, { status: 400 });
        }

        // Run Backtest
        console.log(`[API] Running backtest in ${config.mode || 'LUMP_SUM'} mode...`);
        let result;
        if (config.mode === 'SIP') {
            result = runSIPBacktest(candles, config as WeeklyStrategyConfig);
        } else {
            result = runWeeklyBacktest(candles, config as WeeklyStrategyConfig);
        }

        return NextResponse.json({ success: true, result });

    } catch (error) {
        console.error('[API] Backtest error:', error);
        return NextResponse.json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 });
    }
}
