
import { WeeklyStrategyConfig, WeeklyTrade, WeeklySignal } from './types';
import { CandleData } from '../../types/orb';
import { aggregateToWeekly, findWeeklySignals } from './strategy';
import { WeeklyBacktestResult } from './runner';

const THRESHOLD_FOR_DYNAMIC_SIZING = 100000; // ₹1,00,000

export function runSIPBacktest(dailyCandles: CandleData[], config: WeeklyStrategyConfig): WeeklyBacktestResult {
    const sortedCandles = [...dailyCandles].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
    const weeks = aggregateToWeekly(sortedCandles);
    const signals = findWeeklySignals(weeks);

    const signalMap = new Map<string, WeeklySignal>();
    signals.forEach(s => signalMap.set(s.date.toISOString().split('T')[0], s));

    const trades: WeeklyTrade[] = [];
    const log: string[] = [];
    const equityCurve: { date: string; value: number; buyAndHoldValue: number; dematCash: number; deployedValue: number }[] = [];

    // SIP Config
    const weeklyDeposit = config.weeklyDeposit || 10000;
    const allocationDivisor = config.allocationDivisor || 10;

    // Strategy State (Demat Cash Pool)
    let dematCash = config.initialCapital || 0;
    let currentId = 1;

    // Blind SIP State (Benchmark)
    const startPrice = sortedCandles[0].close;
    let benchmarkUnits = (config.initialCapital && startPrice > 0) ? (config.initialCapital / startPrice) : 0;
    let totalInvested = config.initialCapital || 0;

    // Iterate Daily
    for (const candle of sortedCandles) {
        const dateStr = candle.timestamp.toISOString().split('T')[0];

        // --- 1. Weekly Deposit Logic (Friday = Day 5) ---
        const isDepositDay = candle.timestamp.getDay() === 5;

        if (isDepositDay) {
            // Add Cash to Demat Pool
            dematCash += weeklyDeposit;

            // Benchmark: Immediate Buy (regardless of trend)
            const unitsBought = weeklyDeposit / candle.close;
            benchmarkUnits += unitsBought;

            totalInvested += weeklyDeposit;
        }

        // --- 2. Strategy Trade Logic ---
        if (signalMap.has(dateStr)) {
            const signal = signalMap.get(dateStr)!;

            if (signal.type === 'BUY') {
                // UPTREND detected. Time to deploy.

                // Master Prompt Sizing Logic:
                // Before ₹1L: Use all available accumulated cash.
                // At ₹1L+: TradeSize = TotalDematCash / 10

                let tradeSize: number;

                if (dematCash < THRESHOLD_FOR_DYNAMIC_SIZING) {
                    // Below threshold: deploy all available cash
                    tradeSize = dematCash;
                } else {
                    // At or above threshold: dynamic sizing
                    tradeSize = dematCash / allocationDivisor;
                }

                // Cap at available cash
                tradeSize = Math.min(tradeSize, dematCash);

                // Minimum trade size sanity check (₹500)
                if (tradeSize > 500) {
                    const entryPrice = candle.close;
                    const quantity = tradeSize / entryPrice;

                    const trade: WeeklyTrade = {
                        id: currentId.toString(),
                        entryDate: candle.timestamp,
                        entryPrice: entryPrice,
                        quantity: quantity,
                        subsequentHigh: entryPrice,
                        status: 'OPEN',
                        accumulationMultiplier: 1
                    };

                    trades.push(trade);
                    dematCash -= tradeSize;
                    currentId++;

                    log.push(`[${dateStr}] BUY: Deployed ₹${tradeSize.toFixed(0)}. Demat Cash: ₹${dematCash.toFixed(0)}`);
                }
            }
            // If SKIP (Downtrend), cash accumulates in Demat pool.
        }

        // --- 3. Manage Open Trades (6% Target Exit) ---
        for (const trade of trades) {
            if (trade.status === 'OPEN') {
                const targetPrice = trade.entryPrice * (1 + config.targetPercent / 100);

                // Check if target hit
                if (candle.high >= targetPrice) {
                    trade.status = 'CLOSED';
                    trade.exitDate = candle.timestamp;
                    trade.exitPrice = targetPrice;
                    trade.exitReason = 'TARGET';

                    const proceeds = trade.quantity * targetPrice;
                    const profit = proceeds - (trade.quantity * trade.entryPrice);
                    trade.profit = profit;
                    trade.profitPercent = config.targetPercent;

                    // Recycle Capital + Profit back to Demat Cash
                    dematCash += proceeds;

                    log.push(`[${dateStr}] SELL (Target +${config.targetPercent}%): +₹${profit.toFixed(0)}. Demat Cash: ₹${dematCash.toFixed(0)}`);
                }
            }
        }

        // --- 4. Daily Valuation ---
        let deployedValue = 0;
        trades.forEach(t => {
            if (t.status === 'OPEN') {
                deployedValue += t.quantity * candle.close;
            }
        });
        const strategyTotalValue = dematCash + deployedValue;

        const benchmarkTotalValue = benchmarkUnits * candle.close;

        equityCurve.push({
            date: dateStr,
            value: Number(strategyTotalValue.toFixed(2)),
            buyAndHoldValue: Number(benchmarkTotalValue.toFixed(2)),
            dematCash: Number(dematCash.toFixed(2)),
            deployedValue: Number(deployedValue.toFixed(2))
        });
    }

    // Force Close remaining trades at end
    const lastPrice = sortedCandles[sortedCandles.length - 1].close;
    trades.forEach(t => {
        if (t.status === 'OPEN') {
            t.status = 'CLOSED';
            t.exitDate = sortedCandles[sortedCandles.length - 1].timestamp;
            t.exitPrice = lastPrice;
            t.exitReason = 'END_OF_DATA';
            t.profit = (t.quantity * lastPrice) - (t.quantity * t.entryPrice);
            dematCash += (t.quantity * lastPrice);
        }
    });

    const completedTrades = trades.filter(t => t.exitReason === 'TARGET');
    const winners = completedTrades.filter(t => (t.profit || 0) > 0);
    const winRate = completedTrades.length > 0 ? (winners.length / completedTrades.length) * 100 : 0;
    const totalProfit = trades.reduce((sum, t) => sum + (t.profit || 0), 0);

    return {
        trades,
        metrics: {
            totalTrades: trades.length,
            winRate,
            totalProfit,
            finalCapital: dematCash
        },
        log,
        equityCurve
    };
}
