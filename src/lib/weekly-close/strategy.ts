
import { CandleData } from '../../types/orb';
import { WeeklySignal } from './types';
import { startOfWeek, endOfWeek, isSameWeek } from 'date-fns';

/**
 * Helper to aggregate daily candles into weeks
 */
export interface WeeklyCandle {
    weekStart: Date;
    weekEnd: Date;
    open: number;
    close: number;
    high: number;
    low: number;
    isGreen: boolean;
    dailyCandles: CandleData[];
}

export function aggregateToWeekly(dailyCandles: CandleData[]): WeeklyCandle[] {
    const weeks: WeeklyCandle[] = [];
    let currentWeek: WeeklyCandle | null = null;

    // Ensure sorted
    const sorted = [...dailyCandles].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

    for (const candle of sorted) {
        const candleDate = new Date(candle.timestamp);

        // Check if this candle belongs to the current week
        if (!currentWeek || !isSameWeek(currentWeek.weekStart, candleDate, { weekStartsOn: 1 })) {
            // Start new week
            if (currentWeek) {
                weeks.push(currentWeek);
            }
            currentWeek = {
                weekStart: startOfWeek(candleDate, { weekStartsOn: 1 }), // Monday start
                weekEnd: endOfWeek(candleDate, { weekStartsOn: 1 }),
                open: candle.open,
                close: candle.close,
                high: candle.high,
                low: candle.low,
                isGreen: false, // Calc later
                dailyCandles: [candle]
            };
        } else {
            // Update current week
            currentWeek.close = candle.close;
            currentWeek.high = Math.max(currentWeek.high, candle.high);
            currentWeek.low = Math.min(currentWeek.low, candle.low);
            currentWeek.dailyCandles.push(candle);
        }
    }

    if (currentWeek) {
        weeks.push(currentWeek);
    }

    // Calculate stats
    weeks.forEach(w => {
        w.isGreen = w.close > w.open;
    });

    return weeks;
}

/**
 * Master Prompt Trend Detection Logic
 * 
 * UPTREND (BUY Signal):
 *   Case A (Green → Green Continuation):
 *     prevClose > prevOpen AND currClose > currOpen AND currClose > prevClose
 * 
 *   Case B (Red → Green Reversal):
 *     prevClose < prevOpen AND currClose > currOpen AND currClose > prevOpen
 * 
 * All Other Cases → DOWNTREND (SKIP Signal)
 */
export function findWeeklySignals(weeks: WeeklyCandle[]): WeeklySignal[] {
    const signals: WeeklySignal[] = [];

    for (let i = 0; i < weeks.length; i++) {
        const currWeek = weeks[i];
        const date = currWeek.dailyCandles[currWeek.dailyCandles.length - 1].timestamp; // Friday date

        // First week has no previous, cannot generate signal based on trend
        if (i === 0) {
            signals.push({
                date,
                type: 'SKIP',
                price: currWeek.close,
                reason: 'First Week (No Previous Data)'
            });
            continue;
        }

        const prevWeek = weeks[i - 1];

        const prevOpen = prevWeek.open;
        const prevClose = prevWeek.close;
        const currOpen = currWeek.open;
        const currClose = currWeek.close;

        const prevIsGreen = prevClose > prevOpen;
        const currIsGreen = currClose > currOpen;

        let isUptrend = false;
        let reason = '';

        // Case A: Green → Green Continuation
        if (prevIsGreen && currIsGreen && currClose > prevClose) {
            isUptrend = true;
            reason = 'Uptrend (Case A: Green→Green Continuation)';
        }
        // Case B: Red → Green Reversal
        else if (!prevIsGreen && currIsGreen && currClose > prevOpen) {
            isUptrend = true;
            reason = 'Uptrend (Case B: Red→Green Reversal)';
        }
        // All other cases
        else {
            reason = currIsGreen
                ? 'Downtrend (Green but conditions not met)'
                : 'Downtrend (Red Candle)';
        }

        signals.push({
            date,
            type: isUptrend ? 'BUY' : 'SKIP',
            price: currClose,
            reason,
            isTrendChange: !prevIsGreen && currIsGreen && currClose > prevOpen // Case B is a trend change
        });
    }

    return signals;
}
