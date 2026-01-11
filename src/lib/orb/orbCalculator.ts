// ORB Calculation Engine
// Identifies opening range candles and calculates ORB levels

import { CandleData, OrbLevels } from '@/types/orb';
import { format, isWeekend, isSameDay } from 'date-fns';

/**
 * Identifies the first candle of each trading day
 * Assumes market opens at 9:15 AM IST
 */
export function getFirstCandlePerDay(
    candles: CandleData[],
    marketOpenHour: number = 9,
    marketOpenMinute: number = 15
): Map<string, CandleData> {
    const firstCandles = new Map<string, CandleData>();

    for (const candle of candles) {
        const candleDate = new Date(candle.timestamp);

        // Skip weekends
        if (isWeekend(candleDate)) {
            continue;
        }

        const dateKey = format(candleDate, 'yyyy-MM-dd');
        const hour = candleDate.getHours();
        const minute = candleDate.getMinutes();

        // Check if this is the opening candle (9:15 AM for NSE)
        if (hour === marketOpenHour && minute === marketOpenMinute) {
            if (!firstCandles.has(dateKey)) {
                firstCandles.set(dateKey, candle);
            }
        }
    }

    return firstCandles;
}

/**
 * Calculate ORB levels from historical candle data
 * Returns ORB High and Low for each trading day
 */
export function calculateOrbLevels(
    candles: CandleData[],
    timeframeMinutes: number = 15
): OrbLevels[] {
    const firstCandles = getFirstCandlePerDay(candles);
    const orbLevels: OrbLevels[] = [];

    for (const [dateKey, candle] of firstCandles.entries()) {
        orbLevels.push({
            date: dateKey,
            orbHigh: candle.high,
            orbLow: candle.low,
            orbOpen: candle.open,
            orbClose: candle.close,
            orbVolume: candle.volume,
            orbTimestamp: new Date(candle.timestamp),
        });
    }

    return orbLevels.sort((a, b) =>
        new Date(a.date).getTime() - new Date(b.date).getTime()
    );
}

/**
 * Get ORB levels for a specific date
 */
export function getOrbForDate(
    orbLevels: OrbLevels[],
    date: Date
): OrbLevels | undefined {
    const dateKey = format(date, 'yyyy-MM-dd');
    return orbLevels.find(orb => orb.date === dateKey);
}

/**
 * Calculate the range (high - low) of the opening candle
 * Used for adaptive SL logic
 */
export function getOrbRange(orb: OrbLevels): number {
    return orb.orbHigh - orb.orbLow;
}

/**
 * Check if current price has broken above ORB High
 */
export function hasBreakoutAbove(currentPrice: number, orbHigh: number): boolean {
    return currentPrice > orbHigh;
}

/**
 * Check if current price has broken below ORB Low
 */
export function hasBreakoutBelow(currentPrice: number, orbLow: number): boolean {
    return currentPrice < orbLow;
}

/**
 * Group candles by trading day
 */
export function groupCandlesByDay(candles: CandleData[]): Map<string, CandleData[]> {
    const grouped = new Map<string, CandleData[]>();

    for (const candle of candles) {
        const dateKey = format(new Date(candle.timestamp), 'yyyy-MM-dd');

        if (!grouped.has(dateKey)) {
            grouped.set(dateKey, []);
        }

        grouped.get(dateKey)!.push(candle);
    }

    return grouped;
}

/**
 * Filter candles for market hours (9:15 AM - 3:30 PM IST)
 */
export function filterMarketHours(candles: CandleData[]): CandleData[] {
    return candles.filter(candle => {
        const hour = new Date(candle.timestamp).getHours();
        const minute = new Date(candle.timestamp).getMinutes();

        // Market opens at 9:15 AM
        if (hour < 9 || (hour === 9 && minute < 15)) {
            return false;
        }

        // Market closes at 3:30 PM
        if (hour > 15 || (hour === 15 && minute > 30)) {
            return false;
        }

        return true;
    });
}

/**
 * Validate that candles are sorted by timestamp
 */
export function validateCandleOrder(candles: CandleData[]): boolean {
    for (let i = 1; i < candles.length; i++) {
        if (new Date(candles[i].timestamp) < new Date(candles[i - 1].timestamp)) {
            return false;
        }
    }
    return true;
}

/**
 * Sort candles by timestamp ascending
 */
export function sortCandles(candles: CandleData[]): CandleData[] {
    return [...candles].sort((a, b) =>
        new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );
}
