
import { CandleData } from '../../types/orb';
import { addDays, startOfWeek, isFriday } from 'date-fns';

export function generateMockData(startDate: Date, days: number): CandleData[] {
    const candles: CandleData[] = [];
    let price = 10000;
    let trend = 1; // 1 for up, -1 for down

    // Generate data
    for (let i = 0; i < days; i++) {
        const date = addDays(startDate, i);

        // Random walk with trend
        const volatility = price * 0.02; // 2% daily volatility
        const movement = (Math.random() - 0.5) * volatility + (trend * volatility * 0.2);

        const open = price;
        const close = price + movement;
        const high = Math.max(open, close) + Math.random() * volatility * 0.5;
        const low = Math.min(open, close) - Math.random() * volatility * 0.5;

        candles.push({
            timestamp: date,
            open,
            high,
            low,
            close,
            volume: 1000 + Math.random() * 1000
        });

        price = close;

        // Flip trend every 30 days roughly
        if (i % 30 === 0 && Math.random() > 0.5) {
            trend *= -1;
        }
    }

    return candles;
}
