// Sample Data Service for ORB Backtesting
// Generates sample market data for testing

import { CandleData } from '@/types/orb';
import { addMinutes, addDays, parseISO, differenceInDays, setHours, setMinutes, isWeekend } from 'date-fns';

/**
 * Generate sample stock data with profitable ORB patterns
 * This creates realistic intraday data with clear opening range breakouts
 */
export function generateProfitableOrbSample(
    symbol: string,
    numberOfDays: number = 250,
    startDate?: string,
    endDate?: string
): CandleData[] {
    const candles: CandleData[] = [];

    // Use provided dates or default to 2024
    let currentDate: Date;
    let totalDays: number;

    if (startDate && endDate) {
        currentDate = parseISO(startDate);
        const end = parseISO(endDate);
        totalDays = Math.min(numberOfDays, differenceInDays(end, currentDate) + 1);
    } else {
        currentDate = new Date(2024, 0, 1); // Jan 1, 2024
        totalDays = numberOfDays;
    }

    const basePrice = 800; // Starting price for ICICI Bank style stock
    let lastClose = basePrice;

    for (let day = 0; day < totalDays; day++) {
        // Skip weekends
        while (isWeekend(currentDate)) {
            currentDate = addDays(currentDate, 1);
        }

        // Create a day with clear ORB breakout pattern
        let currentTime = setMinutes(setHours(new Date(currentDate), 9), 15);

        // 1. Opening range candle (9:15-9:30) - narrow range
        const orbOpen = lastClose;
        const orbClose = orbOpen * (1 + (Math.random() - 0.5) * 0.005); // +/- 0.5%
        const orbHigh = Math.max(orbOpen, orbClose) * 1.002;
        const orbLow = Math.min(orbOpen, orbClose) * 0.998;

        candles.push({
            timestamp: new Date(currentTime),
            open: orbOpen,
            high: orbHigh,
            low: orbLow,
            close: orbClose,
            volume: 20000,
        });

        currentTime = addMinutes(currentTime, 15);

        // 2. Breakout candle (9:30-9:45) - breaks above ORB high
        const breakoutOpen = orbClose;
        const breakoutClose = orbHigh * 1.005; // Move above ORB high
        candles.push({
            timestamp: new Date(currentTime),
            open: breakoutOpen,
            high: breakoutClose * 1.002,
            low: orbHigh * 0.999,
            close: breakoutClose,
            volume: 30000,
        });

        currentTime = addMinutes(currentTime, 15);

        // 3. Target hit candle (9:45-10:00) - reaches ₹1 target
        const targetPrice = orbHigh + 1; // ₹1 profit
        candles.push({
            timestamp: new Date(currentTime),
            open: breakoutClose,
            high: targetPrice,
            low: breakoutClose * 0.999,
            close: targetPrice * 0.999,
            volume: 25000,
        });

        currentTime = addMinutes(currentTime, 15);

        // 4. Rest of the day - sideways movement
        let dayClose = targetPrice * 0.999;
        while (currentTime <= setMinutes(setHours(new Date(currentDate), 15), 30)) {
            const candle = generateCandle(currentTime, dayClose, false);
            candles.push(candle);
            dayClose = candle.close;
            currentTime = addMinutes(currentTime, 15);
        }

        lastClose = dayClose;
        currentDate = addDays(currentDate, 1);
    }

    return candles;
}

/**
 * Generate a single candle with realistic price action
 */
function generateCandle(timestamp: Date, prevClose: number, isOpeningCandle: boolean): CandleData {
    // Opening candle tends to have wider range
    const volatilityMultiplier = isOpeningCandle ? 2 : 1;

    // Random price change (-1% to +1%)
    const changePercent = (Math.random() - 0.5) * 2 * volatilityMultiplier;
    const open = prevClose;
    const close = open * (1 + changePercent / 100);

    // Calculate high and low with some randomness
    const range = Math.abs(close - open);
    const high = Math.max(open, close) + (Math.random() * range * 0.5);
    const low = Math.min(open, close) - (Math.random() * range * 0.5);

    // Random volume (10,000 to 50,000)
    const volume = Math.floor(10000 + Math.random() * 40000);

    return {
        timestamp: new Date(timestamp),
        open,
        high,
        low,
        close,
        volume,
    };
}

/**
 * Get predefined sample data for popular stocks
 */
export function getSampleStockData(symbol: string): CandleData[] {
    const basePrices: Record<string, number> = {
        'ICICIBANK': 1000,
        'HDFCBANK': 1600,
        'SBIN': 600,
        'AXISBANK': 1100,
        'KOTAKBANK': 1800,
        'RELIANCE': 2500,
        'TCS': 3600,
        'INFY': 1500,
        'TATAMOTORS': 800,
        'BAJFINANCE': 7000,
    };

    const basePrice = basePrices[symbol] || 1000;

    // Use profitable pattern for demonstration
    return generateProfitableOrbSample(symbol, 250);
}
