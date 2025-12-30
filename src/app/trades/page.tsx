'use client';

import React, { useEffect, useState } from 'react';
import DataTable from '@/components/DataTable';
import StatCard from '@/components/StatCard';
import { Trade } from '@/types';
import { formatCurrency, formatPercent, formatDate } from '@/lib/calculations';

export default function TradesPage() {
    const [trades, setTrades] = useState<Trade[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [dateFilter, setDateFilter] = useState<'all' | '30d' | '90d' | '1y'>('all');

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

    // Summary calculations
    const totalProfit = filteredTrades.reduce((sum, t) => sum + t.profit, 0);
    const totalTrades = filteredTrades.length;
    const winningTrades = filteredTrades.filter(t => t.profit > 0).length;
    const winRate = totalTrades > 0 ? (winningTrades / totalTrades) * 100 : 0;
    const avgProfit = totalTrades > 0 ? totalProfit / totalTrades : 0;
    const avgHoldingDays = totalTrades > 0
        ? filteredTrades.reduce((sum, t) => sum + t.holdingDays, 0) / totalTrades
        : 0;

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

            {/* Profit Summary Bar */}
            {totalTrades > 0 && (
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
            )}

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
        </div>
    );
}
