'use client';

import React, { useEffect, useState } from 'react';
import DataTable from '@/components/DataTable';
import StatCard from '@/components/StatCard';
import ConfirmationModal from '@/components/ConfirmationModal';
import { Trade } from '@/types';
import { formatCurrency, formatPercent, formatDate } from '@/lib/calculations';

export default function TradesPage() {
    const [trades, setTrades] = useState<Trade[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [dateFilter, setDateFilter] = useState<'all' | '30d' | '90d' | '1y'>('all');

    // Confirm Modal State
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [confirmStep, setConfirmStep] = useState<1 | 2>(1);
    const [tradeToDelete, setTradeToDelete] = useState<number | null>(null);

    useEffect(() => {
        fetchTrades();
    }, []);

    const fetchTrades = async () => {
        try {
            setIsLoading(true);
            const response = await fetch('/api/trades');
            const data = await response.json();
            setTrades(data);
        } catch (error) {
            console.error('Error fetching trades:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const filterTrades = () => {
        if (dateFilter === 'all') return trades;

        const now = new Date();
        const days = dateFilter === '30d' ? 30 : dateFilter === '90d' ? 90 : 365;
        const cutoff = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

        return trades.filter(t => new Date(t.sellDate) >= cutoff);
    };

    const filteredTrades = filterTrades();

    const handleDeleteClick = (id: number) => {
        setTradeToDelete(id);
        setConfirmStep(1);
        setConfirmOpen(true);
    };

    const confirmDelete = async () => {
        if (!tradeToDelete) return;

        if (confirmStep === 1) {
            setConfirmStep(2);
            return;
        }

        try {
            await fetch(`/api/trades?id=${tradeToDelete}`, { method: 'DELETE' });
            fetchTrades();
            setConfirmOpen(false);
            setTradeToDelete(null);
        } catch (error) {
            console.error('Error deleting trade:', error);
        }
    };

    const cancelDelete = () => {
        setConfirmOpen(false);
        setTradeToDelete(null);
        setConfirmStep(1);
    };

    // Summary calculations
    const totalProfit = filteredTrades.reduce((sum, t) => sum + t.profit, 0);
    const totalTrades = filteredTrades.length;
    const winningTrades = filteredTrades.filter(t => t.profit > 0).length;
    const winRate = totalTrades > 0 ? (winningTrades / totalTrades) * 100 : 0;
    const avgProfit = totalTrades > 0 ? totalProfit / totalTrades : 0;
    const avgHoldingDays = totalTrades > 0
        ? filteredTrades.reduce((sum, t) => sum + t.holdingDays, 0) / totalTrades
        : 0;

    // Monthly Summary Calculation
    const monthlySummary = filteredTrades.reduce((acc, trade) => {
        const date = new Date(trade.sellDate);
        const key = `${date.getFullYear()}-${date.toLocaleString('default', { month: 'short' })}`; // "2024-Oct"

        if (!acc[key]) {
            acc[key] = {
                month: key,
                profit: 0,
                invested: 0,
                brokerage: 0,
                tax: 0,
                incentive: 0,
                growth: 0,
                sortKey: date.getTime() // For sorting
            };
        }

        const invested = trade.buyPrice * trade.quantity;
        acc[key].profit += trade.profit;
        acc[key].invested += invested;
        acc[key].growth += trade.profit; // Currently just profit as expenses are 0

        return acc;
    }, {} as Record<string, any>);

    const summaryRows = Object.values(monthlySummary).sort((a, b) => a.sortKey - b.sortKey);

    // Grand Totals for Summary
    const grandTotal = summaryRows.reduce((acc, row) => ({
        profit: acc.profit + row.profit,
        invested: acc.invested + row.invested,
        brokerage: 0,
        tax: 0,
        incentive: 0,
        growth: acc.growth + row.growth
    }), { profit: 0, invested: 0, brokerage: 0, tax: 0, incentive: 0, growth: 0 });

    const summaryColumns = [
        { key: 'month', header: 'Sell Date (Year-Month)' },
        {
            key: 'profit',
            header: 'SUM of Profit Amount',
            render: (row: any) => <span className={row.profit >= 0 ? 'text-emerald-400 font-medium' : 'text-red-400'}>{formatCurrency(row.profit)}</span>
        },
        {
            key: 'invested',
            header: 'MAX of Invested amt', // Label as requested
            render: (row: any) => <span className="text-gray-300">{formatCurrency(row.invested)}</span>
        },
        {
            key: 'brokerage',
            header: 'Brokerage + Charges',
            render: () => <span className="text-gray-500">0</span>
        },
        {
            key: 'tax',
            header: 'Income Tax',
            render: () => <span className="text-gray-500">0</span>
        },
        {
            key: 'incentive',
            header: 'Incentive to Self',
            render: () => <span className="text-gray-500">0</span>
        },
        {
            key: 'growth',
            header: 'Net Growth',
            render: (row: any) => <span className={row.growth >= 0 ? 'text-emerald-400 font-bold' : 'text-red-400'}>{formatCurrency(row.growth)}</span>
        },
    ];

    const columns = [
        {
            key: 'etfSymbol',
            header: 'ETF',
            sortable: true,
            render: (row: Trade) => (
                <div>
                    <p className="font-medium text-white">{row.etfSymbol}</p>
                    <p className="text-xs text-gray-500">{row.etfName}</p>
                </div>
            ),
        },
        {
            key: 'buyDate',
            header: 'Buy Date',
            sortable: true,
            render: (row: Trade) => (
                <span className="text-gray-300">{formatDate(row.buyDate)}</span>
            ),
        },
        {
            key: 'sellDate',
            header: 'Sell Date',
            sortable: true,
            render: (row: Trade) => (
                <span className="text-gray-300">{formatDate(row.sellDate)}</span>
            ),
        },
        {
            key: 'buyPrice',
            header: 'Buy Price',
            sortable: true,
            render: (row: Trade) => (
                <span className="text-gray-400">{formatCurrency(row.buyPrice)}</span>
            ),
        },
        {
            key: 'sellPrice',
            header: 'Sell Price',
            sortable: true,
            render: (row: Trade) => (
                <span className="text-white">{formatCurrency(row.sellPrice)}</span>
            ),
        },
        {
            key: 'quantity',
            header: 'Qty',
            sortable: true,
        },
        {
            key: 'profit',
            header: 'Profit',
            sortable: true,
            render: (row: Trade) => (
                <span className={row.profit >= 0 ? 'text-emerald-400' : 'text-red-400'}>
                    {formatCurrency(row.profit)}
                </span>
            ),
        },
        {
            key: 'profitPercent',
            header: 'Profit %',
            sortable: true,
            render: (row: Trade) => (
                <span className={row.profitPercent >= 0 ? 'text-emerald-400' : 'text-red-400'}>
                    {formatPercent(row.profitPercent)}
                </span>
            ),
        },
        {
            key: 'holdingDays',
            header: 'Days Held',
            sortable: true,
            render: (row: Trade) => (
                <span className="text-gray-400">{row.holdingDays}</span>
            ),
        },
        {
            key: 'actions',
            header: 'Actions',
            render: (row: Trade) => (
                <button
                    onClick={() => handleDeleteClick(row.id)}
                    className="px-2 py-1 bg-red-600 hover:bg-red-700 rounded text-xs font-medium transition-colors"
                >
                    ✕
                </button>
            ),
        },
    ];

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-white">✅ Bika Hua Maal (Sold Trades)</h1>
                    <p className="text-gray-400 text-sm">History of completed trades</p>
                </div>

                {/* Date Filter */}
                <div className="flex gap-2">
                    {(['all', '30d', '90d', '1y'] as const).map((filter) => (
                        <button
                            key={filter}
                            onClick={() => setDateFilter(filter)}
                            className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${dateFilter === filter
                                ? 'bg-emerald-600 text-white'
                                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                                }`}
                        >
                            {filter === 'all' ? 'All Time' : filter.toUpperCase()}
                        </button>
                    ))}
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <StatCard
                    title="Total Profit"
                    value={totalProfit}
                    icon="💰"
                    isCurrency
                    variant={totalProfit >= 0 ? 'success' : 'danger'}
                />
                <StatCard title="Total Trades" value={totalTrades} icon="📊" />
                <StatCard
                    title="Win Rate"
                    value={winRate}
                    icon="🎯"
                    isPercentage
                    variant={winRate >= 60 ? 'success' : winRate >= 40 ? 'warning' : 'danger'}
                />
                <StatCard
                    title="Avg Profit/Trade"
                    value={avgProfit}
                    icon="📈"
                    isCurrency
                />
                <StatCard
                    title="Avg Holding Days"
                    value={Math.round(avgHoldingDays)}
                    icon="📅"
                />
            </div>

            {/* Monthly Performance Summary */}
            {
                summaryRows.length > 0 && (
                    <div className="bg-gray-800/50 rounded-xl border border-gray-700 overflow-hidden mb-6">
                        <div className="p-4 border-b border-gray-700">
                            <h2 className="text-xl font-bold text-white flex items-center gap-2">
                                🗓️ Monthly Performance Report
                            </h2>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm text-gray-400">
                                <thead className="bg-gray-900/50 text-gray-200 uppercase font-medium">
                                    <tr>
                                        <th className="px-4 py-3">Sell Date (Year-Month)</th>
                                        <th className="px-4 py-3">Profit Amount</th>
                                        <th className="px-4 py-3">Invested Amt (Cost)</th>
                                        <th className="px-4 py-3">Charges</th>
                                        <th className="px-4 py-3">Tax</th>
                                        <th className="px-4 py-3">Incentive</th>
                                        <th className="px-4 py-3">Net Growth</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-700">
                                    {summaryRows.map((row) => (
                                        <tr key={row.month} className="hover:bg-gray-700/30 transition-colors">
                                            <td className="px-4 py-3 font-medium text-white">{row.month}</td>
                                            <td className={`px-4 py-3 ${row.profit >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                                {formatCurrency(row.profit)}
                                            </td>
                                            <td className="px-4 py-3 text-gray-300">{formatCurrency(row.invested)}</td>
                                            <td className="px-4 py-3 text-gray-500">0</td>
                                            <td className="px-4 py-3 text-gray-500">0</td>
                                            <td className="px-4 py-3 text-gray-500">0</td>
                                            <td className={`px-4 py-3 font-bold ${row.growth >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                                {formatCurrency(row.growth)}
                                            </td>
                                        </tr>
                                    ))}
                                    <tr className="bg-emerald-900/20 font-bold border-t-2 border-emerald-500/30">
                                        <td className="px-4 py-3 text-emerald-300">Grand Total</td>
                                        <td className="px-4 py-3 text-emerald-400">{formatCurrency(grandTotal.profit)}</td>
                                        <td className="px-4 py-3 text-emerald-300">{formatCurrency(grandTotal.invested)}</td>
                                        <td className="px-4 py-3 text-gray-400">0</td>
                                        <td className="px-4 py-3 text-gray-400">0</td>
                                        <td className="px-4 py-3 text-gray-400">0</td>
                                        <td className="px-4 py-3 text-emerald-400 text-lg">{formatCurrency(grandTotal.growth)}</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
                )
            }

            {/* Profit Summary Bar */}
            {
                totalTrades > 0 && (
                    <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-gray-400 text-sm">Win/Loss Distribution</span>
                            <span className="text-gray-300 text-sm">
                                {winningTrades} wins / {totalTrades - winningTrades} losses
                            </span>
                        </div>
                        <div className="h-3 bg-gray-700 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400"
                                style={{ width: `${winRate}%` }}
                            />
                        </div>
                    </div>
                )
            }

            {/* Table */}
            <div className="bg-gray-800/50 rounded-xl border border-gray-700 overflow-hidden">
                <DataTable
                    columns={columns}
                    data={filteredTrades}
                    keyField="id"
                    isLoading={isLoading}
                    emptyMessage="No completed trades yet. Sell holdings to see them here."
                />
            </div>

            {/* Confirmation Modal */}
            <ConfirmationModal
                isOpen={confirmOpen}
                title={confirmStep === 1 ? "Confirm Trade Deletion" : "⚠️ Final Warning"}
                message={
                    confirmStep === 1
                        ? "Are you sure you want to DELETE this trade record?"
                        : "Double Check: This action CANNOT be undone. Do you really want to delete this historical trade?"
                }
                onConfirm={confirmDelete}
                onCancel={cancelDelete}
                confirmText={confirmStep === 1 ? "Yes, Delete" : "I Understand, DELETE IT"}
                cancelText="Cancel"
                isDanger={true}
            />
        </div >
    );
}
