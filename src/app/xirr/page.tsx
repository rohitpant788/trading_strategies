'use client';

import React, { useEffect, useState } from 'react';
import StatCard from '@/components/StatCard';
import { formatCurrency, formatDate, calculateXIRR } from '@/lib/calculations';
import { CashFlow } from '@/types';

export default function XIRRPage() {
    const [cashFlows, setCashFlows] = useState<CashFlow[]>([]);
    const [holdings, setHoldings] = useState<{ buyPrice: number; quantity: number; buyDate: string }[]>([]);
    const [trades, setTrades] = useState<{ profit: number; sellDate: string; buyPrice: number; quantity: number; buyDate: string }[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            setIsLoading(true);
            const [holdingsRes, tradesRes] = await Promise.all([
                fetch('/api/holdings'),
                fetch('/api/trades'),
            ]);

            const [holdingsData, tradesData] = await Promise.all([
                holdingsRes.json(),
                tradesRes.json(),
            ]);

            setHoldings(holdingsData);
            setTrades(tradesData);

            // Build cash flows
            const flows: CashFlow[] = [];

            // Investments (negative cash flows)
            holdingsData.forEach((h: { buyPrice: number; quantity: number; buyDate: string }) => {
                flows.push({
                    date: h.buyDate,
                    amount: h.buyPrice * h.quantity,
                    type: 'INVESTMENT',
                });
            });

            // Original investments for sold holdings
            tradesData.forEach((t: { buyPrice: number; quantity: number; buyDate: string }) => {
                flows.push({
                    date: t.buyDate,
                    amount: t.buyPrice * t.quantity,
                    type: 'INVESTMENT',
                });
            });

            // Returns from trades (positive cash flows)
            tradesData.forEach((t: { sellDate: string; buyPrice: number; quantity: number; profit: number }) => {
                flows.push({
                    date: t.sellDate,
                    amount: t.buyPrice * t.quantity + t.profit, // Total sell value
                    type: 'RETURN',
                });
            });

            setCashFlows(flows.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()));
        } catch (error) {
            console.error('Error fetching data:', error);
        } finally {
            setIsLoading(false);
        }
    };

    // Calculate current portfolio value
    const currentPortfolioValue = holdings.reduce(
        (sum, h) => sum + h.buyPrice * h.quantity,
        0
    );

    // Calculate XIRR
    const xirr = calculateXIRR(cashFlows, currentPortfolioValue);

    // Calculate total invested and returned
    const totalInvested = cashFlows
        .filter(cf => cf.type === 'INVESTMENT')
        .reduce((sum, cf) => sum + cf.amount, 0);

    const totalReturned = cashFlows
        .filter(cf => cf.type === 'RETURN')
        .reduce((sum, cf) => sum + cf.amount, 0);

    const absoluteProfit = totalReturned + currentPortfolioValue - totalInvested;
    const absoluteReturn = totalInvested > 0 ? (absoluteProfit / totalInvested) * 100 : 0;

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-400"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold text-white">📊 XIRR Calculator</h1>
                <p className="text-gray-400 text-sm">Extended Internal Rate of Return for your portfolio</p>
            </div>

            {/* Main Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatCard
                    title="XIRR"
                    value={xirr}
                    icon="📈"
                    isPercentage
                    variant={xirr >= 0 ? 'success' : 'danger'}
                />
                <StatCard
                    title="Absolute Return"
                    value={absoluteReturn}
                    icon="💹"
                    isPercentage
                    variant={absoluteReturn >= 0 ? 'success' : 'danger'}
                />
                <StatCard
                    title="Total Invested"
                    value={totalInvested}
                    icon="💵"
                    isCurrency
                />
                <StatCard
                    title="Current Value"
                    value={currentPortfolioValue + totalReturned}
                    icon="💰"
                    isCurrency
                />
            </div>

            {/* XIRR Explanation */}
            <div className="bg-gradient-to-r from-purple-900/30 to-blue-900/30 rounded-xl p-6 border border-purple-700/50">
                <h3 className="text-lg font-bold text-white mb-2">What is XIRR?</h3>
                <p className="text-gray-300 text-sm mb-4">
                    XIRR (Extended Internal Rate of Return) is the annualized return on your investments,
                    accounting for the timing of each cash flow. Unlike simple returns, XIRR accurately
                    reflects the performance when you make multiple investments at different times.
                </p>
                <div className="flex items-center gap-4">
                    <div className="text-center">
                        <p className="text-3xl font-bold text-emerald-400">{xirr.toFixed(2)}%</p>
                        <p className="text-xs text-gray-500">Annualized Return</p>
                    </div>
                    <div className="flex-1 bg-gray-800/50 rounded-lg p-3">
                        <p className="text-xs text-gray-400">Interpretation</p>
                        <p className="text-sm text-white">
                            {xirr >= 15
                                ? '🌟 Excellent! Outperforming most market indices.'
                                : xirr >= 10
                                    ? '✅ Good performance, aligned with long-term equity returns.'
                                    : xirr >= 5
                                        ? '📊 Moderate returns, comparable to debt instruments.'
                                        : xirr >= 0
                                            ? '⚠️ Low returns, consider reviewing your strategy.'
                                            : '❌ Negative returns, portfolio is in loss.'}
                        </p>
                    </div>
                </div>
            </div>

            {/* Cash Flow Timeline */}
            <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
                <h3 className="text-lg font-bold text-white mb-4">Cash Flow Timeline</h3>

                {cashFlows.length === 0 ? (
                    <p className="text-gray-400 text-center py-8">
                        No cash flows yet. Add holdings and complete trades to see your XIRR.
                    </p>
                ) : (
                    <div className="space-y-3 max-h-96 overflow-y-auto">
                        {cashFlows.map((cf, index) => (
                            <div
                                key={index}
                                className={`flex items-center justify-between p-3 rounded-lg ${cf.type === 'INVESTMENT'
                                        ? 'bg-red-900/20 border border-red-700/30'
                                        : 'bg-emerald-900/20 border border-emerald-700/30'
                                    }`}
                            >
                                <div className="flex items-center gap-3">
                                    <span className="text-xl">
                                        {cf.type === 'INVESTMENT' ? '📤' : '📥'}
                                    </span>
                                    <div>
                                        <p className="text-white font-medium">
                                            {cf.type === 'INVESTMENT' ? 'Investment' : 'Return'}
                                        </p>
                                        <p className="text-xs text-gray-500">{formatDate(cf.date)}</p>
                                    </div>
                                </div>
                                <span className={`font-bold ${cf.type === 'INVESTMENT' ? 'text-red-400' : 'text-emerald-400'
                                    }`}>
                                    {cf.type === 'INVESTMENT' ? '-' : '+'}{formatCurrency(cf.amount)}
                                </span>
                            </div>
                        ))}

                        {/* Current portfolio value */}
                        {currentPortfolioValue > 0 && (
                            <div className="flex items-center justify-between p-3 rounded-lg bg-blue-900/20 border border-blue-700/30">
                                <div className="flex items-center gap-3">
                                    <span className="text-xl">💼</span>
                                    <div>
                                        <p className="text-white font-medium">Current Holdings</p>
                                        <p className="text-xs text-gray-500">Present Value</p>
                                    </div>
                                </div>
                                <span className="font-bold text-blue-400">
                                    {formatCurrency(currentPortfolioValue)}
                                </span>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Summary */}
            <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700">
                <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                        <p className="text-red-400 text-xl font-bold">
                            -{formatCurrency(totalInvested)}
                        </p>
                        <p className="text-xs text-gray-500">Total Outflow</p>
                    </div>
                    <div>
                        <p className="text-emerald-400 text-xl font-bold">
                            +{formatCurrency(totalReturned)}
                        </p>
                        <p className="text-xs text-gray-500">Total Inflow</p>
                    </div>
                    <div>
                        <p className={`text-xl font-bold ${absoluteProfit >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                            {absoluteProfit >= 0 ? '+' : ''}{formatCurrency(absoluteProfit)}
                        </p>
                        <p className="text-xs text-gray-500">Net Profit/Loss</p>
                    </div>
                </div>
            </div>
        </div>
    );
}
