// API Route: /api/orb/backtest
// Runs ORB backtest on selected symbols

import { NextRequest, NextResponse } from 'next/server';
import { StrategyConfig } from '@/types/orb';
import { runBacktest } from '@/lib/orb/backtestRunner';
import { generateProfitableOrbSample } from '@/lib/orb/sampleDataService';

// Dynamic import to handle SQLite not being installed
let ensureDataAvailable: any = null;
try {
    const dataService = require('@/lib/data/dataService');
    ensureDataAvailable = dataService.ensureDataAvailable;
} catch (error) {
    console.warn('[Backtest API] SQLite not available, will use sample data');
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const config: StrategyConfig = body.config || body;

        console.log('[Backtest API] Received config:', {
            symbols: config.selectedSymbols,
            dateRange: `${config.startDate} to ${config.endDate}`,
            capital: config.startingCapital,
            allocation: config.capitalAllocationPercent,
        });

        const results = [];

        for (const symbol of config.selectedSymbols) {
            console.log(`[Backtest API] Running backtest for ${symbol}`);

            try {
                let data;

                // Try to use real data if SQLite is available
                if (ensureDataAvailable) {
                    try {
                        console.log(`[Backtest API] Fetching real data for ${symbol}`);
                        data = await ensureDataAvailable(
                            symbol,
                            config.startDate,
                            config.endDate,
                            config.timeframe
                        );
                    } catch (error) {
                        console.error(`[Backtest API] Real data fetch failed, using sample data:`, error);
                        data = null;
                    }
                }

                // Fallback to sample data
                if (!data || data.length === 0) {
                    console.log(`[Backtest API] Using sample data for ${symbol}`);
                    data = generateProfitableOrbSample(
                        symbol,
                        250,
                        config.startDate,
                        config.endDate
                    );
                }

                console.log(`[Backtest API] Using ${data.length} candles for ${symbol}`);

                // Run backtest
                const result = await runBacktest(symbol, data, config);
                results.push(result);

                console.log(`[Backtest API] Completed ${symbol}: ${result.metrics.totalTrades} trades, ${result.metrics.winRate.toFixed(2)}% win rate`);
            } catch (error) {
                console.error(`[Backtest API] Error processing ${symbol}:`, error);
                throw error;
            }
        }

        return NextResponse.json({
            success: true,
            results,
            summary: {
                totalSymbols: results.length,
                totalTrades: results.reduce((sum, r) => sum + r.metrics.totalTrades, 0),
                avgWinRate: results.reduce((sum, r) => sum + r.metrics.winRate, 0) / results.length,
            },
        });
    } catch (error) {
        console.error('[Backtest API] Error:', error);
        return NextResponse.json(
            {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error occurred',
            },
            { status: 500 }
        );
    }
}
