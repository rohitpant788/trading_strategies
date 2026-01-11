
import { WeeklyStrategyConfig, WeeklyTrade, WeeklySignal } from './types';
import { CandleData } from '../../types/orb';
import { aggregateToWeekly, findWeeklySignals } from './strategy';

export interface WeeklyBacktestResult {
    trades: WeeklyTrade[];
    metrics: {
        totalTrades: number;
        winRate: number;
        totalProfit: number;
        finalCapital: number;
    };
    log: string[];
    equityCurve: { date: string; value: number; buyAndHoldValue: number }[];
}

export function runWeeklyBacktest(dailyCandles: CandleData[], config: WeeklyStrategyConfig): WeeklyBacktestResult {
    const sortedCandles = [...dailyCandles].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

    // 1. Aggregate to Weekly
    const weeks = aggregateToWeekly(sortedCandles);

    // 2. Get Signals (BUY and SKIP)
    const signals = findWeeklySignals(weeks);

    // 3. Execute Trades
    const trades: WeeklyTrade[] = [];
    let currentId = 1;
    const log: string[] = [];
    const equityCurve: { date: string; value: number; buyAndHoldValue: number }[] = [];

    const signalMap = new Map<string, WeeklySignal>();
    signals.forEach(s => signalMap.set(s.date.toISOString().split('T')[0], s));

    let capital = config.initialCapital;
    let accumulatedCapital = 0; // Funds accumulated from skipped trades
    const allocationPerTrade = config.allocationPerTrade || 10000;

    // Buy & Hold Calculation Baseline
    // Assume we buy at Open of Day 1
    const startPrice = sortedCandles[0].open;
    const initialUnits = config.initialCapital / startPrice;

    // Iterate daily
    for (const candle of sortedCandles) {
        const dateStr = candle.timestamp.toISOString().split('T')[0];

        // --- Calculate Mark-to-Market Equity ---
        // Equity = Base Capital + Realized PnL (from this run) + Unrealized PnL (Open Trades)
        // Note: 'capital' variable currently tracks Initial. We need to sum Realized PnL.

        let realizedPnL = 0;
        let unrealizedPnL = 0;

        // --- Manage Open Trades ---
        for (const trade of trades) {
            // Calculate Realized PnL
            if (trade.status === 'CLOSED') {
                realizedPnL += (trade.profit || 0); // Profit is already total profit for the trade
            }

            if (trade.status === 'OPEN') {
                // TP is +6%
                const tpPrice = trade.entryPrice * (1 + config.targetPercent / 100);

                if (candle.high >= tpPrice) {
                    // TP Hit
                    trade.status = 'CLOSED';
                    trade.exitDate = candle.timestamp;
                    trade.exitPrice = tpPrice;
                    trade.exitReason = 'TARGET';
                    // Profit is based on QUANTITY derived from total capital deployed
                    const totalValue = trade.quantity * tpPrice;
                    const entryValue = trade.quantity * trade.entryPrice;
                    trade.profit = totalValue - entryValue;
                    trade.profitPercent = config.targetPercent;

                    realizedPnL += trade.profit; // Add to realized for this loop calculation

                    log.push(`[${dateStr}] Trade #${trade.id} TP HIT at ${tpPrice.toFixed(2)} (+6%). Profit: ${trade.profit.toFixed(2)}`);
                } else {
                    // Still Open - Calculate Unrealized PnL
                    const currentValue = trade.quantity * candle.close;
                    const entryValue = trade.quantity * trade.entryPrice;
                    unrealizedPnL += (currentValue - entryValue);
                }

                trade.subsequentHigh = Math.max(trade.subsequentHigh, candle.high);
            }
        }

        // --- Process Signals ---
        if (signalMap.has(dateStr)) {
            const signal = signalMap.get(dateStr)!;

            if (signal.type === 'BUY') {
                // Determine Capital to Deploy
                const capitalToDeploy = allocationPerTrade + accumulatedCapital;
                const entryPrice = signal.price;
                const quantity = capitalToDeploy / entryPrice; // Fractional shares

                // Calculate Multiplier (e.g., 20k / 10k = 2x)
                const multiplier = Math.round(capitalToDeploy / allocationPerTrade);

                const trade: WeeklyTrade = {
                    id: currentId.toString(),
                    entryDate: candle.timestamp,
                    entryPrice: entryPrice,
                    quantity: quantity, // Now actual quantity based on price
                    subsequentHigh: entryPrice,
                    status: 'OPEN',
                    accumulationMultiplier: multiplier
                };

                trades.push(trade);
                currentId++;
                log.push(`[${dateStr}] BUY Signal: ${entryPrice.toFixed(2)} (${signal.reason}). Deployed: ${capitalToDeploy.toFixed(2)} (${multiplier}x)`);

                // Reset accumulation
                accumulatedCapital = 0;

            } else if (signal.type === 'SKIP') {
                // Accumulate Capital
                accumulatedCapital += allocationPerTrade;
                log.push(`[${dateStr}] SKIP Signal: ${signal.reason}. Accumulated +${allocationPerTrade} (Total: ${accumulatedCapital})`);
            }
        }

        // Record Equity for the day
        const currentEquity = config.initialCapital + realizedPnL + unrealizedPnL;
        const buyAndHoldVal = initialUnits * candle.close;

        equityCurve.push({
            date: dateStr,
            value: Number(currentEquity.toFixed(2)),
            buyAndHoldValue: Number(buyAndHoldVal.toFixed(2))
        });
    }

    // Close open trades at end
    const lastPrice = sortedCandles[sortedCandles.length - 1].close;
    for (const trade of trades) {
        if (trade.status === 'OPEN') {
            trade.status = 'CLOSED';
            trade.exitDate = sortedCandles[sortedCandles.length - 1].timestamp;
            trade.exitPrice = lastPrice;
            trade.exitReason = 'END_OF_DATA';

            const totalValue = trade.quantity * lastPrice;
            const entryValue = trade.quantity * trade.entryPrice;
            trade.profit = totalValue - entryValue;
            trade.profitPercent = ((lastPrice - trade.entryPrice) / trade.entryPrice) * 100;
        }
    }

    // Metrics
    const completedTrades = trades.filter(t => t.exitReason === 'TARGET' || t.exitReason === 'END_OF_DATA');
    const winners = completedTrades.filter(t => (t.profit || 0) > 0);
    const totalProfit = completedTrades.reduce((sum, t) => sum + (t.profit || 0), 0);
    const winRate = completedTrades.length > 0 ? (winners.length / completedTrades.length) * 100 : 0;

    return {
        trades,
        metrics: {
            totalTrades: trades.length,
            winRate,
            totalProfit,
            finalCapital: capital + totalProfit
        },
        log,
        equityCurve
    };
}
