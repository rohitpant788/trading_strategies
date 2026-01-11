// Trade Simulator for ORB Strategy
// Simulates trade execution based on ORB breakouts

import { CandleData, OrbLevels, Trade, StrategyConfig, ExitReason, Signal } from '@/types/orb';
import { format, differenceInMinutes, parse } from 'date-fns';
import { v4 as uuidv4 } from 'uuid';

/**
 * Calculate stop loss based on strategy configuration
 */
export function calculateStopLoss(
    orb: OrbLevels,
    config: StrategyConfig,
    direction: 'LONG' | 'SHORT'
): number {
    const orbRange = orb.orbHigh - orb.orbLow;

    switch (config.slType) {
        case 'ORB_LOW':
            return direction === 'LONG' ? orb.orbLow : orb.orbHigh;

        case 'FIXED_AMOUNT':
            return config.slFixedAmount;

        case 'ADAPTIVE':
            // If opening range is big (> threshold), use fixed SL
            if (orbRange >= config.slBigCandleThreshold) {
                return config.slFixedAmount;
            }
            // Otherwise use ORB low
            return direction === 'LONG' ? orb.orbLow : orb.orbHigh;

        default:
            return direction === 'LONG' ? orb.orbLow : orb.orbHigh;
    }
}

/**
 * Calculate target price based on entry and configuration
 */
export function calculateTarget(
    entryPrice: number,
    config: StrategyConfig,
    direction: 'LONG' | 'SHORT'
): number {
    switch (config.targetType) {
        case 'FIXED_AMOUNT':
            return direction === 'LONG'
                ? entryPrice + config.targetValue
                : entryPrice - config.targetValue;

        case 'PERCENTAGE':
            const percentMove = entryPrice * (config.targetValue / 100);
            return direction === 'LONG'
                ? entryPrice + percentMove
                : entryPrice - percentMove;

        case 'ATR':
            // TODO: Implement ATR calculation
            // For now, fall back to fixed amount
            return direction === 'LONG'
                ? entryPrice + config.targetValue
                : entryPrice - config.targetValue;

        default:
            return direction === 'LONG'
                ? entryPrice + config.targetValue
                : entryPrice - config.targetValue;
    }
}

/**
 * Check if EOD square-off time has been reached
 */
export function isEodTime(timestamp: Date, eodTime: string): boolean {
    const hour = timestamp.getHours();
    const minute = timestamp.getMinutes();
    const [eodHour, eodMinute] = eodTime.split(':').map(Number);

    return hour > eodHour || (hour === eodHour && minute >= eodMinute);
}

/**
 * Simulate a single trade from entry to exit
 */
export function simulateTrade(
    candles: CandleData[],
    entryCandle: CandleData,
    entryPrice: number,
    orb: OrbLevels,
    config: StrategyConfig,
    direction: 'LONG' | 'SHORT'
): Trade {
    const entryIndex = candles.findIndex(c => c.timestamp === entryCandle.timestamp);

    // Apply slippage to entry price (for fast-moving candles, you get worse entry)
    // For LONG: entry price is higher, for SHORT: entry price is lower
    const slippageMultiplier = 1 + (config.slippagePercent / 100);
    const actualEntryPrice = direction === 'LONG'
        ? entryPrice * slippageMultiplier
        : entryPrice / slippageMultiplier;

    // Calculate position size based on capital allocation
    const capitalToUse = config.startingCapital * (config.capitalAllocationPercent / 100);
    const quantity = Math.floor(capitalToUse / actualEntryPrice);

    // If quantity is 0, we can't take this trade (capital too low)
    if (quantity === 0) {
        // Return a trade with 0 quantity that will be filtered out
        const failedTrade: Trade = {
            id: uuidv4(),
            symbol: '',
            entryDate: new Date(entryCandle.timestamp),
            entryPrice: actualEntryPrice,
            quantity: 0,
            direction,
            orbHigh: orb.orbHigh,
            orbLow: orb.orbLow,
            target: 0,
            stopLoss: 0,
            isOpen: false,
        };
        return failedTrade;
    }

    // Calculate target and SL (based on actual entry with slippage)
    const target = calculateTarget(actualEntryPrice, config, direction);
    const stopLoss = calculateStopLoss(orb, config, direction);

    const trade: Trade = {
        id: uuidv4(),
        symbol: '', // Will be set by caller
        entryDate: new Date(entryCandle.timestamp),
        entryPrice: actualEntryPrice,
        quantity,
        direction,
        orbHigh: orb.orbHigh,
        orbLow: orb.orbLow,
        target,
        stopLoss,
        isOpen: true,
    };

    // Scan through remaining candles to find exit
    for (let i = entryIndex + 1; i < candles.length; i++) {
        const candle = candles[i];
        const candleDate = new Date(candle.timestamp);

        // Check if we're still on the same day
        if (format(candleDate, 'yyyy-MM-dd') !== format(entryCandle.timestamp, 'yyyy-MM-dd')) {
            // New day, should have squared off
            break;
        }

        // Check for target hit
        if (direction === 'LONG' && candle.high >= target) {
            trade.exitDate = candleDate;
            trade.exitPrice = target;
            trade.exitReason = 'TARGET';
            trade.isOpen = false;
            break;
        } else if (direction === 'SHORT' && candle.low <= target) {
            trade.exitDate = candleDate;
            trade.exitPrice = target;
            trade.exitReason = 'TARGET';
            trade.isOpen = false;
            break;
        }

        // Check for SL hit (for adaptive SL, stopLoss is the ORB low value)
        if (config.slType === 'ADAPTIVE' || config.slType === 'ORB_LOW') {
            if (direction === 'LONG' && candle.low <= stopLoss) {
                trade.exitDate = candleDate;
                trade.exitPrice = stopLoss;
                trade.exitReason = 'SL';
                trade.isOpen = false;
                break;
            } else if (direction === 'SHORT' && candle.high >= stopLoss) {
                trade.exitDate = candleDate;
                trade.exitPrice = stopLoss;
                trade.exitReason = 'SL';
                trade.isOpen = false;
                break;
            }
        } else if (config.slType === 'FIXED_AMOUNT') {
            // For fixed SL, calculate actual SL price
            const slPrice = direction === 'LONG'
                ? actualEntryPrice - stopLoss
                : actualEntryPrice + stopLoss;

            if (direction === 'LONG' && candle.low <= slPrice) {
                trade.exitDate = candleDate;
                trade.exitPrice = slPrice;
                trade.exitReason = 'SL';
                trade.isOpen = false;
                break;
            } else if (direction === 'SHORT' && candle.high >= slPrice) {
                trade.exitDate = candleDate;
                trade.exitPrice = slPrice;
                trade.exitReason = 'SL';
                trade.isOpen = false;
                break;
            }
        }

        // Check for EOD square-off
        if (isEodTime(candleDate, config.eodSquareOffTime)) {
            trade.exitDate = candleDate;
            trade.exitPrice = candle.close;
            trade.exitReason = 'EOD';
            trade.isOpen = false;
            break;
        }
    }

    // Calculate P&L if trade was closed
    if (!trade.isOpen && trade.exitPrice && trade.exitDate) {
        if (direction === 'LONG') {
            trade.profit = (trade.exitPrice - actualEntryPrice) * quantity;
        } else {
            trade.profit = (actualEntryPrice - trade.exitPrice) * quantity;
        }
        trade.profitPercent = (trade.profit / (actualEntryPrice * quantity)) * 100;
        trade.holdingMinutes = differenceInMinutes(trade.exitDate, trade.entryDate);
    }

    return trade;
}

/**
 * Scan for ORB breakout entry signals
 */
export function findOrbBreakouts(
    candles: CandleData[],
    orb: OrbLevels,
    config: StrategyConfig
): Signal[] {
    const signals: Signal[] = [];
    const orbDate = format(new Date(orb.orbTimestamp), 'yyyy-MM-dd');

    for (const candle of candles) {
        const candleDate = format(new Date(candle.timestamp), 'yyyy-MM-dd');

        // Only look at candles on the same day as ORB
        if (candleDate !== orbDate) {
            continue;
        }

        // Skip the opening range candle itself
        if (candle.timestamp === orb.orbTimestamp) {
            continue;
        }

        // Check for long breakout
        if ((config.direction === 'LONG' || config.direction === 'BOTH') &&
            candle.high > orb.orbHigh) {
            signals.push({
                timestamp: new Date(candle.timestamp),
                type: 'ENTRY',
                price: orb.orbHigh,
                reason: 'BREAKOUT',
            });

            // Only take first breakout of the day
            if (config.direction === 'LONG') {
                break;
            }
        }

        // Check for short breakout
        if ((config.direction === 'SHORT' || config.direction === 'BOTH') &&
            candle.low < orb.orbLow) {
            signals.push({
                timestamp: new Date(candle.timestamp),
                type: 'ENTRY',
                price: orb.orbLow,
                reason: 'BREAKOUT',
            });

            // Only take first breakout of the day
            if (config.direction === 'SHORT') {
                break;
            }
        }
    }

    return signals;
}
