// Main Backtest Runner - Orchestrates the entire backtesting process
// Combines data fetching, ORB calculation, trade simulation, and metrics

import { CandleData, StrategyConfig, BacktestResult, Trade } from '@/types/orb';
import { calculateOrbLevels, groupCandlesByDay, filterMarketHours, sortCandles } from './orbCalculator';
import { findOrbBreakouts, simulateTrade } from './tradeSimulator';
import { calculateMetrics, calculateEquityCurve } from './metrics';
import { format } from 'date-fns';

/**
 * Main backtest function - runs ORB strategy on historical data
 */
export async function runBacktest(
    symbol: string,
    candles: CandleData[],
    config: StrategyConfig
): Promise<BacktestResult> {
    console.log(`[Backtest] Starting backtest for ${symbol}`);

    // 1. Prepare data
    const sortedCandles = sortCandles(candles);
    const marketHoursCandles = filterMarketHours(sortedCandles);

    console.log(`[Backtest] Loaded ${marketHoursCandles.length} candles`);

    // 2. Calculate ORB levels for each day
    const orbLevels = calculateOrbLevels(marketHoursCandles, config.timeframe);
    console.log(`[Backtest] Calculated ORB levels for ${orbLevels.length} trading days`);

    // 3. Group candles by day for efficient processing
    const candlesByDay = groupCandlesByDay(marketHoursCandles);

    // 4. Simulate trades with max trades per day limit
    const trades: Trade[] = [];

    for (const orb of orbLevels) {
        const dayCandles = candlesByDay.get(orb.date) || [];

        if (dayCandles.length === 0) {
            continue;
        }

        // Track trades taken for this day
        let tradesForDay = 0;

        // Find breakout signals for this day
        const signals = findOrbBreakouts(dayCandles, orb, config);

        // Simulate trade for each signal (up to maxTradesPerDay)
        for (const signal of signals) {
            // Check if we've hit the daily limit
            if (tradesForDay >= config.maxTradesPerDay) {
                console.log(`[Backtest] Max trades per day (${config.maxTradesPerDay}) reached for ${orb.date}`);
                break;
            }

            const entryCandle = dayCandles.find(c =>
                new Date(c.timestamp).getTime() >= signal.timestamp.getTime()
            );

            if (!entryCandle) {
                continue;
            }

            const direction = signal.price === orb.orbHigh ? 'LONG' : 'SHORT';

            const trade = simulateTrade(
                dayCandles,
                entryCandle,
                signal.price,
                orb,
                config,
                direction
            );

            trade.symbol = symbol;

            // Only count trade if quantity > 0 (valid trade)
            if (trade.quantity > 0) {
                trades.push(trade);
                tradesForDay++;
            }

            // For single-direction strategies, only take one trade per day
            if (config.direction !== 'BOTH') {
                break;
            }
        }
    }

    console.log(`[Backtest] Simulated ${trades.length} trades`);

    // 5. Calculate metrics
    const metrics = calculateMetrics(trades, config.startingCapital);
    const equityCurve = calculateEquityCurve(trades, config.startingCapital);

    // 6. Create result object
    const result: BacktestResult = {
        symbol,
        config,
        trades,
        metrics,
        equityCurve,
        orbLevels,
        startDate: new Date(config.startDate),
        endDate: new Date(config.endDate),
        runTimestamp: new Date(),
    };

    console.log(`[Backtest] Complete. Win rate: ${metrics.winRate.toFixed(2)}%, Net profit: ₹${metrics.netProfit.toFixed(2)}, Final capital: ₹${metrics.finalCapital.toFixed(2)} (${metrics.returnPercent.toFixed(2)}% return)`);

    return result;
}

/**
 * Run backtest on multiple symbols
 */
export async function runBatchBacktest(
    symbolsWithData: Map<string, CandleData[]>,
    config: StrategyConfig
): Promise<BacktestResult[]> {
    const results: BacktestResult[] = [];

    for (const [symbol, candles] of symbolsWithData) {
        try {
            const result = await runBacktest(symbol, candles, config);
            results.push(result);
        } catch (error) {
            console.error(`[Batch Backtest] Error processing ${symbol}:`, error);
        }
    }

    return results;
}

/**
 * Generate sample summary from backtest result
 */
export function getBacktestSummary(result: BacktestResult): string {
    const { symbol, metrics, trades } = result;

    return `
=== Backtest Summary for ${symbol} ===
Total Trades: ${metrics.totalTrades}
Win Rate: ${metrics.winRate.toFixed(2)}%
Expectancy: ₹${metrics.expectancy.toFixed(2)}
Net Profit: ₹${metrics.netProfit.toFixed(2)}
Max Drawdown: ₹${metrics.maxDrawdown.toFixed(2)} (${metrics.maxDrawdownPercent.toFixed(2)}%)
Profit Factor: ${metrics.profitFactor.toFixed(2)}
Largest Win: ₹${metrics.largestWin.toFixed(2)}
Largest Loss: ₹${metrics.largestLoss.toFixed(2)}
Avg Holding Time: ${metrics.avgHoldingMinutes.toFixed(0)} minutes
`.trim();
}
