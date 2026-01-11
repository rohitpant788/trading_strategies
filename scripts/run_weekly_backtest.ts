
import { fetchYahooData } from '../src/lib/data/yahooFetcher';
import { runWeeklyBacktest } from '../src/lib/weekly-close/runner';
import { WeeklyStrategyConfig } from '../src/lib/weekly-close/types';
import { generateMockData } from '../src/lib/weekly-close/mock';
import { CandleData } from '../src/types/orb';

async function main() {
    console.log('--- Starting Weekly Strategy Backtest ---');

    const symbol = 'BTC-USD';
    const startDate = new Date('2020-01-01');
    const endDate = new Date('2024-12-31');

    // 1. Fetch Data
    console.log(`Fetching data for ${symbol}...`);
    let candles: CandleData[] = [];
    try {
        // Fetch Daily Data directly
        candles = await fetchYahooData(symbol, startDate, endDate, '1d');
    } catch (err) {
        console.warn('Failed to fetch data (likely 429/404). Using MOCK data for verification.');
        candles = generateMockData(startDate, 365 * 4); // 4 years
    }


    if (candles.length === 0) {
        console.error('No candles found.');
        return;
    }

    console.log(`Loaded ${candles.length} daily candles.`);

    // 2. Configure Strategy
    const config: WeeklyStrategyConfig = {
        symbol,
        startDate: startDate.toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0],
        targetPercent: 6.0,
        initialCapital: 100000,
        allocationPerTrade: 10000 // Not strictly used in current runner logic but good for future
    };

    // 3. Run Backtest
    console.log('Running backtest...');
    const result = runWeeklyBacktest(candles, config);

    // 4. Report
    console.log('\n--- Backtest Results ---');
    console.log(`Total Trades: ${result.metrics.totalTrades}`);
    console.log(`Win Rate: ${result.metrics.winRate.toFixed(2)}%`);
    console.log(`Total Profit: ${result.metrics.totalProfit.toFixed(2)} (per unit traded)`);

    console.log('\n--- Trade Log (Last 20) ---');
    result.log.slice(-20).forEach(l => console.log(l));

    console.log('\n--- Trade Log (First 10) ---');
    result.log.slice(0, 10).forEach(l => console.log(l));

    // Specific verification of "Trend Change" logic
    // Look for a period where we might have paused.
    // We can manually inspect the log for "Trend Change" reasons.
    const trendChangeTrades = result.trades.filter(t =>
        result.log.find(l => l.includes('Trend Change') && l.includes(t.entryPrice.toFixed(2)))
    );

    if (trendChangeTrades.length > 0) {
        console.log('\n[VERIFICATION] Found trades triggered by Trend Change logic!');
    } else {
        console.log('\n[VERIFICATION] No Trend Change trades found (might be rare or strategy logic needs tuning).');
    }
}

main().catch(console.error);
