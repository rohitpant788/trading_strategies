
import { WeeklyStrategyConfig } from './types';
import { CandleData } from '../../types/orb';

export interface BenchmarkResult {
    totalInvested: number;
    finalValue: number;
    absoluteReturn: number;
    absoluteReturnPercent: number;
    units: number;
    equityCurve: { date: string; value: number }[];
}

/**
 * Strategy 2 (BENCHMARK): Simple Weekly Accumulation
 * 
 * Rules:
 * - Every Friday at 3 PM: Invest ₹10,000 into NIFTY regardless of trend.
 * - No exit during the backtest period.
 * - All units held until end of backtest.
 */
export function runBenchmarkBacktest(dailyCandles: CandleData[], config: WeeklyStrategyConfig): BenchmarkResult {
    const sortedCandles = [...dailyCandles].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

    const weeklyDeposit = config.weeklyDeposit || 10000;

    // State
    let totalUnits = 0;
    let totalInvested = config.initialCapital || 0;

    // If initial capital exists, invest it on Day 1
    if (config.initialCapital && config.initialCapital > 0) {
        const startPrice = sortedCandles[0].close;
        totalUnits = config.initialCapital / startPrice;
    }

    const equityCurve: { date: string; value: number }[] = [];

    for (const candle of sortedCandles) {
        const dateStr = candle.timestamp.toISOString().split('T')[0];

        // Every Friday: Invest ₹weeklyDeposit
        if (candle.timestamp.getDay() === 5) {
            const unitsBought = weeklyDeposit / candle.close;
            totalUnits += unitsBought;
            totalInvested += weeklyDeposit;
        }

        // Daily valuation
        const value = totalUnits * candle.close;
        equityCurve.push({
            date: dateStr,
            value: Number(value.toFixed(2))
        });
    }

    const lastPrice = sortedCandles[sortedCandles.length - 1].close;
    const finalValue = totalUnits * lastPrice;
    const absoluteReturn = finalValue - totalInvested;
    const absoluteReturnPercent = (absoluteReturn / totalInvested) * 100;

    return {
        totalInvested,
        finalValue,
        absoluteReturn,
        absoluteReturnPercent,
        units: totalUnits,
        equityCurve
    };
}
