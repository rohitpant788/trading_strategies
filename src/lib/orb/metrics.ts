// Metrics Calculator for Backtest Results
// Calculates performance metrics from completed trades

import { Trade, BacktestMetrics, EquityPoint } from '@/types/orb';

/**
 * Calculate comprehensive backtest metrics from trades
 */
export function calculateMetrics(trades: Trade[], startingCapital: number = 100000): BacktestMetrics {
    const closedTrades = trades.filter(t => !t.isOpen && t.profit !== undefined);

    if (closedTrades.length === 0) {
        return getEmptyMetrics(startingCapital);
    }

    // Separate winning and losing trades
    const winningTrades = closedTrades.filter(t => t.profit! > 0);
    const losingTrades = closedTrades.filter(t => t.profit! < 0);
    const breakEvenTrades = closedTrades.filter(t => t.profit! === 0);

    // Basic stats
    const totalTrades = closedTrades.length;
    const winningTradesCount = winningTrades.length;
    const losingTradesCount = losingTrades.length;
    const winRate = (winningTradesCount / totalTrades) * 100;

    // Profit/Loss calculations
    const totalProfit = winningTrades.reduce((sum, t) => sum + t.profit!, 0);
    const totalLoss = Math.abs(losingTrades.reduce((sum, t) => sum + t.profit!, 0));
    const netProfit = totalProfit - totalLoss;

    // Capital tracking
    const finalCapital = startingCapital + netProfit;
    const returnPercent = ((finalCapital - startingCapital) / startingCapital) * 100;

    // Average calculations
    const avgWin = winningTradesCount > 0 ? totalProfit / winningTradesCount : 0;
    const avgLoss = losingTradesCount > 0 ? totalLoss / losingTradesCount : 0;

    // Risk metrics
    const expectancy = (winRate / 100) * avgWin - ((100 - winRate) / 100) * avgLoss;
    const profitFactor = totalLoss > 0 ? totalProfit / totalLoss : totalProfit;

    // Find extremes
    const largestWin = winningTrades.length > 0
        ? Math.max(...winningTrades.map(t => t.profit!))
        : 0;
    const largestLoss = losingTrades.length > 0
        ? Math.min(...losingTrades.map(t => t.profit!))
        : 0;

    // Consecutive wins/losses
    const { maxConsecutiveWins, maxConsecutiveLosses } = calculateConsecutiveWinLoss(closedTrades);

    // Drawdown
    const { maxDrawdown, maxDrawdownPercent } = calculateDrawdown(closedTrades);

    // Sharpe ratio (simplified - assumes risk-free rate = 0)
    const returns = closedTrades.map(t => t.profitPercent!);
    const avgReturn = returns.reduce((sum, r) => sum + r, 0) / returns.length;
    const stdDev = calculateStandardDeviation(returns);
    const sharpeRatio = stdDev > 0 ? avgReturn / stdDev : 0;

    // Holding time analysis
    const avgHoldingMinutes = closedTrades.reduce((sum, t) => sum + (t.holdingMinutes || 0), 0) / totalTrades;
    const avgWinHoldingMinutes = winningTradesCount > 0
        ? winningTrades.reduce((sum, t) => sum + (t.holdingMinutes || 0), 0) / winningTradesCount
        : 0;
    const avgLossHoldingMinutes = losingTradesCount > 0
        ? losingTrades.reduce((sum, t) => sum + (t.holdingMinutes || 0), 0) / losingTradesCount
        : 0;

    return {
        totalTrades,
        winningTrades: winningTradesCount,
        losingTrades: losingTradesCount,
        breakEvenTrades: breakEvenTrades.length,
        winRate,
        avgWin,
        avgLoss,
        expectancy,
        maxDrawdown,
        maxDrawdownPercent,
        profitFactor,
        sharpeRatio,
        largestWin,
        largestLoss,
        maxConsecutiveWins,
        maxConsecutiveLosses,
        totalProfit,
        totalLoss,
        netProfit,
        startingCapital,
        finalCapital,
        returnPercent,
        avgHoldingMinutes,
        avgWinHoldingMinutes,
        avgLossHoldingMinutes,
    };
}

/**
 * Calculate equity curve from trades
 */
export function calculateEquityCurve(trades: Trade[], startingCapital: number = 0): EquityPoint[] {
    const closedTrades = trades
        .filter(t => !t.isOpen && t.exitDate)
        .sort((a, b) => a.exitDate!.getTime() - b.exitDate!.getTime());

    const equityCurve: EquityPoint[] = [];
    let runningEquity = startingCapital;
    let peakEquity = startingCapital;

    for (const trade of closedTrades) {
        runningEquity += trade.profit || 0;
        peakEquity = Math.max(peakEquity, runningEquity);

        const drawdown = peakEquity - runningEquity;

        equityCurve.push({
            date: trade.exitDate!,
            equity: runningEquity,
            drawdown,
        });
    }

    return equityCurve;
}

/**
 * Calculate maximum drawdown from trades
 */
function calculateDrawdown(trades: Trade[]): { maxDrawdown: number; maxDrawdownPercent: number } {
    const equityCurve = calculateEquityCurve(trades, 0);

    if (equityCurve.length === 0) {
        return { maxDrawdown: 0, maxDrawdownPercent: 0 };
    }

    let maxDrawdown = 0;
    let maxDrawdownPercent = 0;
    let peak = 0;

    for (const point of equityCurve) {
        peak = Math.max(peak, point.equity);
        const drawdown = peak - point.equity;
        maxDrawdown = Math.max(maxDrawdown, drawdown);

        if (peak > 0) {
            const drawdownPercent = (drawdown / peak) * 100;
            maxDrawdownPercent = Math.max(maxDrawdownPercent, drawdownPercent);
        }
    }

    return { maxDrawdown, maxDrawdownPercent };
}

/**
 * Calculate consecutive wins and losses
 */
function calculateConsecutiveWinLoss(trades: Trade[]): {
    maxConsecutiveWins: number;
    maxConsecutiveLosses: number;
} {
    let maxConsecutiveWins = 0;
    let maxConsecutiveLosses = 0;
    let currentWinStreak = 0;
    let currentLossStreak = 0;

    for (const trade of trades) {
        if (trade.profit! > 0) {
            currentWinStreak++;
            currentLossStreak = 0;
            maxConsecutiveWins = Math.max(maxConsecutiveWins, currentWinStreak);
        } else if (trade.profit! < 0) {
            currentLossStreak++;
            currentWinStreak = 0;
            maxConsecutiveLosses = Math.max(maxConsecutiveLosses, currentLossStreak);
        } else {
            // Break even - reset both streaks
            currentWinStreak = 0;
            currentLossStreak = 0;
        }
    }

    return { maxConsecutiveWins, maxConsecutiveLosses };
}

/**
 * Calculate standard deviation
 */
function calculateStandardDeviation(values: number[]): number {
    if (values.length === 0) return 0;

    const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
    const squaredDiffs = values.map(v => Math.pow(v - mean, 2));
    const variance = squaredDiffs.reduce((sum, v) => sum + v, 0) / values.length;

    return Math.sqrt(variance);
}

/**
 * Get empty metrics (for when there are no trades)
 */
function getEmptyMetrics(startingCapital: number = 100000): BacktestMetrics {
    return {
        totalTrades: 0,
        winningTrades: 0,
        losingTrades: 0,
        breakEvenTrades: 0,
        winRate: 0,
        avgWin: 0,
        avgLoss: 0,
        expectancy: 0,
        maxDrawdown: 0,
        maxDrawdownPercent: 0,
        profitFactor: 0,
        sharpeRatio: 0,
        largestWin: 0,
        largestLoss: 0,
        maxConsecutiveWins: 0,
        maxConsecutiveLosses: 0,
        totalProfit: 0,
        totalLoss: 0,
        netProfit: 0,
        startingCapital,
        finalCapital: startingCapital,
        returnPercent: 0,
        avgHoldingMinutes: 0,
        avgWinHoldingMinutes: 0,
        avgLossHoldingMinutes: 0,
    };
}

/**
 * Format metrics for display
 */
export function formatMetrics(metrics: BacktestMetrics): Record<string, string> {
    return {
        'Total Trades': metrics.totalTrades.toString(),
        'Win Rate': `${metrics.winRate.toFixed(2)}%`,
        'Avg Win': `₹${metrics.avgWin.toFixed(2)}`,
        'Avg Loss': `₹${metrics.avgLoss.toFixed(2)}`,
        'Expectancy': `₹${metrics.expectancy.toFixed(2)}`,
        'Profit Factor': metrics.profitFactor.toFixed(2),
        'Max Drawdown': `₹${metrics.maxDrawdown.toFixed(2)} (${metrics.maxDrawdownPercent.toFixed(2)}%)`,
        'Sharpe Ratio': metrics.sharpeRatio.toFixed(3),
        'Largest Win': `₹${metrics.largestWin.toFixed(2)}`,
        'Largest Loss': `₹${metrics.largestLoss.toFixed(2)}`,
        'Net Profit': `₹${metrics.netProfit.toFixed(2)}`,
    };
}
