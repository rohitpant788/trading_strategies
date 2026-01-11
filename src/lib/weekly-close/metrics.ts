
import { WeeklyTrade } from './types';

export interface PerformanceMetrics {
    totalInvested: number;
    finalValue: number;
    absoluteReturn: number;
    absoluteReturnPercent: number;
    cagr: number;
    maxDrawdown: number;
    maxDrawdownPercent: number;
    volatility: number;
    capitalUtilizationPercent: number;
    idleCashPercent: number;
}

export interface TradeMetrics {
    totalTrades: number;
    targetHits: number;
    winRate: number;
    avgHoldingDays: number;
    avgReturnPerTrade: number;
    maxConcurrentOpenTrades: number;
}

export interface ComprehensiveMetrics {
    performance: PerformanceMetrics;
    trades: TradeMetrics;
}

/**
 * Calculate CAGR (Compound Annual Growth Rate)
 */
function calculateCAGR(initialValue: number, finalValue: number, years: number): number {
    if (initialValue <= 0 || years <= 0) return 0;
    return (Math.pow(finalValue / initialValue, 1 / years) - 1) * 100;
}

/**
 * Calculate Maximum Drawdown
 */
function calculateMaxDrawdown(equityCurve: { value: number }[]): { maxDrawdown: number; maxDrawdownPercent: number } {
    let peak = equityCurve[0]?.value || 0;
    let maxDrawdown = 0;
    let maxDrawdownPercent = 0;

    for (const point of equityCurve) {
        if (point.value > peak) {
            peak = point.value;
        }
        const drawdown = peak - point.value;
        const drawdownPercent = peak > 0 ? (drawdown / peak) * 100 : 0;

        if (drawdown > maxDrawdown) {
            maxDrawdown = drawdown;
            maxDrawdownPercent = drawdownPercent;
        }
    }

    return { maxDrawdown, maxDrawdownPercent };
}

/**
 * Calculate Volatility (Standard Deviation of Daily Returns)
 */
function calculateVolatility(equityCurve: { value: number }[]): number {
    if (equityCurve.length < 2) return 0;

    const returns: number[] = [];
    for (let i = 1; i < equityCurve.length; i++) {
        const prevValue = equityCurve[i - 1].value;
        const currValue = equityCurve[i].value;
        if (prevValue > 0) {
            returns.push((currValue - prevValue) / prevValue);
        }
    }

    if (returns.length === 0) return 0;

    const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
    const variance = returns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / returns.length;
    const dailyVolatility = Math.sqrt(variance);

    // Annualize (approx 252 trading days)
    return dailyVolatility * Math.sqrt(252) * 100;
}

/**
 * Calculate Trade Metrics
 */
function calculateTradeMetrics(trades: WeeklyTrade[]): TradeMetrics {
    const targetHits = trades.filter(t => t.exitReason === 'TARGET').length;
    const winRate = trades.length > 0 ? (targetHits / trades.length) * 100 : 0;

    // Avg Holding Days
    let totalHoldingDays = 0;
    let closedCount = 0;
    for (const trade of trades) {
        if (trade.exitDate) {
            const entry = new Date(trade.entryDate);
            const exit = new Date(trade.exitDate);
            const days = (exit.getTime() - entry.getTime()) / (1000 * 60 * 60 * 24);
            totalHoldingDays += days;
            closedCount++;
        }
    }
    const avgHoldingDays = closedCount > 0 ? totalHoldingDays / closedCount : 0;

    // Avg Return per Trade
    const totalProfit = trades.reduce((sum, t) => sum + (t.profit || 0), 0);
    const avgReturnPerTrade = trades.length > 0 ? totalProfit / trades.length : 0;

    // Max Concurrent Open Trades (simplified: just count max open at any time)
    // This requires tracking state day-by-day, which is complex. 
    // For now, return trades.length as upper bound.
    const maxConcurrentOpenTrades = trades.length;

    return {
        totalTrades: trades.length,
        targetHits,
        winRate,
        avgHoldingDays,
        avgReturnPerTrade,
        maxConcurrentOpenTrades
    };
}

/**
 * Calculate Comprehensive Metrics
 */
export function calculateMetrics(
    equityCurve: { date: string; value: number; dematCash?: number; deployedValue?: number }[],
    trades: WeeklyTrade[],
    totalInvested: number
): ComprehensiveMetrics {
    const finalValue = equityCurve[equityCurve.length - 1]?.value || 0;
    const absoluteReturn = finalValue - totalInvested;
    const absoluteReturnPercent = totalInvested > 0 ? (absoluteReturn / totalInvested) * 100 : 0;

    // Calculate years from first to last date
    const firstDate = new Date(equityCurve[0]?.date || Date.now());
    const lastDate = new Date(equityCurve[equityCurve.length - 1]?.date || Date.now());
    const years = (lastDate.getTime() - firstDate.getTime()) / (1000 * 60 * 60 * 24 * 365);

    const cagr = calculateCAGR(totalInvested, finalValue, years);
    const { maxDrawdown, maxDrawdownPercent } = calculateMaxDrawdown(equityCurve);
    const volatility = calculateVolatility(equityCurve);

    // Capital Utilization
    let totalDeployed = 0;
    let totalIdle = 0;
    for (const point of equityCurve) {
        totalDeployed += point.deployedValue || 0;
        totalIdle += point.dematCash || 0;
    }
    const avgDeployed = equityCurve.length > 0 ? totalDeployed / equityCurve.length : 0;
    const avgIdle = equityCurve.length > 0 ? totalIdle / equityCurve.length : 0;
    const avgTotal = avgDeployed + avgIdle;
    const capitalUtilizationPercent = avgTotal > 0 ? (avgDeployed / avgTotal) * 100 : 0;
    const idleCashPercent = avgTotal > 0 ? (avgIdle / avgTotal) * 100 : 0;

    return {
        performance: {
            totalInvested,
            finalValue,
            absoluteReturn,
            absoluteReturnPercent,
            cagr,
            maxDrawdown,
            maxDrawdownPercent,
            volatility,
            capitalUtilizationPercent,
            idleCashPercent
        },
        trades: calculateTradeMetrics(trades)
    };
}
