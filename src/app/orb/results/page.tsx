'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useOrbStore } from '@/store/orbStore';
import StatCard from '@/components/StatCard';
import { format } from 'date-fns';

// Pagination component
interface PaginationProps {
    currentPage: number;
    totalPages: number;
    onPageChange: (page: number) => void;
    itemsPerPage: number;
    onItemsPerPageChange: (items: number) => void;
    totalItems: number;
}

function Pagination({ currentPage, totalPages, onPageChange, itemsPerPage, onItemsPerPageChange, totalItems }: PaginationProps) {
    const startItem = (currentPage - 1) * itemsPerPage + 1;
    const endItem = Math.min(currentPage * itemsPerPage, totalItems);

    const getPageNumbers = () => {
        const pages: (number | string)[] = [];
        const maxVisible = 5;

        if (totalPages <= maxVisible) {
            for (let i = 1; i <= totalPages; i++) {
                pages.push(i);
            }
        } else {
            if (currentPage <= 3) {
                for (let i = 1; i <= 4; i++) pages.push(i);
                pages.push('...');
                pages.push(totalPages);
            } else if (currentPage >= totalPages - 2) {
                pages.push(1);
                pages.push('...');
                for (let i = totalPages - 3; i <= totalPages; i++) pages.push(i);
            } else {
                pages.push(1);
                pages.push('...');
                pages.push(currentPage - 1);
                pages.push(currentPage);
                pages.push(currentPage + 1);
                pages.push('...');
                pages.push(totalPages);
            }
        }

        return pages;
    };

    return (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-4 pt-4 border-t border-gray-700">
            {/* Items per page selector */}
            <div className="flex items-center gap-2">
                <span className="text-sm text-gray-400">Show</span>
                <select
                    value={itemsPerPage}
                    onChange={(e) => onItemsPerPageChange(Number(e.target.value))}
                    className="px-3 py-1 bg-gray-700 text-white rounded-lg border border-gray-600 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                    <option value={20}>20</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                    <option value={250}>250</option>
                </select>
                <span className="text-sm text-gray-400">per page</span>
            </div>

            {/* Page info */}
            <div className="text-sm text-gray-400">
                Showing <span className="text-white font-medium">{startItem}</span> to{' '}
                <span className="text-white font-medium">{endItem}</span> of{' '}
                <span className="text-white font-medium">{totalItems}</span> trades
            </div>

            {/* Page navigation */}
            <div className="flex items-center gap-1">
                <button
                    onClick={() => onPageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="px-3 py-1 bg-gray-700 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-600 transition-colors"
                >
                    ← Previous
                </button>

                {getPageNumbers().map((page, idx) => (
                    typeof page === 'number' ? (
                        <button
                            key={idx}
                            onClick={() => onPageChange(page)}
                            className={`px-3 py-1 rounded-lg transition-colors ${currentPage === page
                                ? 'bg-blue-600 text-white'
                                : 'bg-gray-700 text-white hover:bg-gray-600'
                                }`}
                        >
                            {page}
                        </button>
                    ) : (
                        <span key={idx} className="px-2 text-gray-500">
                            {page}
                        </span>
                    )
                ))}

                <button
                    onClick={() => onPageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className="px-3 py-1 bg-gray-700 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-600 transition-colors"
                >
                    Next →
                </button>
            </div>
        </div>
    );
}

export default function OrbResultsPage() {
    const router = useRouter();
    const { results, isBacktesting } = useOrbStore();

    // Pagination state for each symbol
    const [paginationState, setPaginationState] = useState<Record<string, { page: number; itemsPerPage: number }>>({});

    // Initialize pagination for all symbols
    useEffect(() => {
        if (results.length > 0) {
            const initialState: Record<string, { page: number; itemsPerPage: number }> = {};
            results.forEach(result => {
                initialState[result.symbol] = { page: 1, itemsPerPage: 50 };
            });
            setPaginationState(initialState);
        }
    }, [results]);

    // If no results, redirect to config
    useEffect(() => {
        if (!isBacktesting && results.length === 0) {
            // No results available, go back to config
            // router.push('/orb');
        }
    }, [results, isBacktesting, router]);

    if (isBacktesting || results.length === 0) {
        return (
            <div className="space-y-6">
                <div className="bg-gradient-to-r from-emerald-900/30 to-blue-900/30 rounded-xl p-6 border border-emerald-700/50">
                    <h1 className="text-2xl font-bold text-white mb-2">📊 Backtest Results</h1>
                    <p className="text-gray-300">
                        {isBacktesting ? 'Running backtest...' : 'No results available. Please run a backtest first.'}
                    </p>
                </div>

                {isBacktesting && (
                    <div className="flex items-center justify-center py-12">
                        <div className="text-center">
                            <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                            <p className="text-white text-lg">Running backtest...</p>
                            <p className="text-gray-400 text-sm">This may take a few moments</p>
                        </div>
                    </div>
                )}

                {!isBacktesting && results.length === 0 && (
                    <div className="text-center py-12">
                        <p className="text-gray-400 mb-4">Run a backtest from the Config page to see results</p>
                        <button
                            onClick={() => router.push('/orb')}
                            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                        >
                            Go to Config
                        </button>
                    </div>
                )}
            </div>
        );
    }

    // Get the first result for overall summary (or aggregate if multiple)
    const aggregatedMetrics = results.reduce((acc, result) => ({
        totalTrades: acc.totalTrades + result.metrics.totalTrades,
        winningTrades: acc.winningTrades + result.metrics.winningTrades,
        losingTrades: acc.losingTrades + result.metrics.losingTrades,
        netProfit: acc.netProfit + result.metrics.netProfit,
        totalProfit: acc.totalProfit + result.metrics.totalProfit,
        totalLoss: acc.totalLoss + result.metrics.totalLoss,
    }), { totalTrades: 0, winningTrades: 0, losingTrades: 0, netProfit: 0, totalProfit: 0, totalLoss: 0 });

    const avgWinRate = results.reduce((sum, r) => sum + r.metrics.winRate, 0) / results.length;
    const avgExpectancy = results.reduce((sum, r) => sum + r.metrics.expectancy, 0) / results.length;
    const maxDrawdown = Math.max(...results.map(r => r.metrics.maxDrawdown));

    const handlePageChange = (symbol: string, page: number) => {
        setPaginationState(prev => ({
            ...prev,
            [symbol]: { ...prev[symbol], page }
        }));
    };

    const handleItemsPerPageChange = (symbol: string, itemsPerPage: number) => {
        setPaginationState(prev => ({
            ...prev,
            [symbol]: { page: 1, itemsPerPage } // Reset to page 1 when changing items per page
        }));
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="bg-gradient-to-r from-emerald-900/30 to-blue-900/30 rounded-xl p-6 border border-emerald-700/50">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-white mb-2">📊 Backtest Results</h1>
                        <p className="text-gray-300">
                            Results for {results.length} symbol{results.length > 1 ? 's' : ''} ({results.map(r => r.symbol).join(', ')})
                        </p>
                    </div>
                    <button
                        onClick={() => router.push('/orb')}
                        className="px-6 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors flex items-center gap-2"
                    >
                        <span>←</span>
                        <span>Go Back to Config</span>
                    </button>
                </div>
            </div>

            {/* Summary KPIs */}
            <section>
                <h2 className="text-xl font-bold text-white mb-4">📈 Performance Summary</h2>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                    <StatCard
                        title="Total Trades"
                        value={aggregatedMetrics.totalTrades}
                        icon="📊"
                        variant="info"
                    />
                    <StatCard
                        title="Win Rate"
                        value={`${avgWinRate.toFixed(1)}%`}
                        icon="✅"
                        variant={avgWinRate >= 50 ? 'success' : 'danger'}
                    />
                    <StatCard
                        title="Net Profit"
                        value={aggregatedMetrics.netProfit}
                        icon="💰"
                        isCurrency
                        variant={aggregatedMetrics.netProfit >= 0 ? 'success' : 'danger'}
                    />
                    <StatCard
                        title="Expectancy"
                        value={avgExpectancy}
                        icon="🎯"
                        isCurrency
                        variant={avgExpectancy >= 0 ? 'success' : 'danger'}
                    />
                    <StatCard
                        title="Final Capital"
                        value={results[0]?.metrics.finalCapital || 0}
                        icon="💵"
                        isCurrency
                        variant={results[0]?.metrics.returnPercent >= 0 ? 'success' : 'danger'}
                    />
                    <StatCard
                        title="Return %"
                        value={`${(results[0]?.metrics.returnPercent || 0).toFixed(2)}%`}
                        icon="📈"
                        variant={results[0]?.metrics.returnPercent >= 0 ? 'success' : 'danger'}
                    />
                </div>
            </section>

            {/* Per-Symbol Results */}
            {results.map((result) => {
                const pagination = paginationState[result.symbol] || { page: 1, itemsPerPage: 50 };
                const totalPages = Math.ceil(result.trades.length / pagination.itemsPerPage);
                const startIdx = (pagination.page - 1) * pagination.itemsPerPage;
                const endIdx = startIdx + pagination.itemsPerPage;
                const paginatedTrades = result.trades.slice(startIdx, endIdx);

                return (
                    <section key={result.symbol} className="bg-gray-800 rounded-xl p-6 border border-gray-700">
                        <h2 className="text-xl font-bold text-white mb-4">📌 {result.symbol}</h2>

                        {/* Metrics Grid */}
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-6">
                            <div className="bg-gray-700/50 rounded-lg p-3">
                                <p className="text-xs text-gray-400">Total Trades</p>
                                <p className="text-lg font-bold text-white">{result.metrics.totalTrades}</p>
                            </div>
                            <div className="bg-gray-700/50 rounded-lg p-3">
                                <p className="text-xs text-gray-400">Win Rate</p>
                                <p className={`text-lg font-bold ${result.metrics.winRate >= 50 ? 'text-emerald-400' : 'text-red-400'}`}>
                                    {result.metrics.winRate.toFixed(2)}%
                                </p>
                            </div>
                            <div className="bg-gray-700/50 rounded-lg p-3">
                                <p className="text-xs text-gray-400">Avg Win</p>
                                <p className="text-lg font-bold text-emerald-400">₹{result.metrics.avgWin.toFixed(2)}</p>
                            </div>
                            <div className="bg-gray-700/50 rounded-lg p-3">
                                <p className="text-xs text-gray-400">Avg Loss</p>
                                <p className="text-lg font-bold text-red-400">₹{result.metrics.avgLoss.toFixed(2)}</p>
                            </div>
                            <div className="bg-gray-700/50 rounded-lg p-3">
                                <p className="text-xs text-gray-400">Expectancy</p>
                                <p className={`text-lg font-bold ${result.metrics.expectancy >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                    ₹{result.metrics.expectancy.toFixed(2)}
                                </p>
                            </div>
                            <div className="bg-gray-700/50 rounded-lg p-3">
                                <p className="text-xs text-gray-400">Profit Factor</p>
                                <p className="text-lg font-bold text-blue-400">{result.metrics.profitFactor.toFixed(2)}</p>
                            </div>
                            <div className="bg-gray-700/50 rounded-lg p-3">
                                <p className="text-xs text-gray-400">Max Drawdown</p>
                                <p className="text-lg font-bold text-yellow-400">₹{result.metrics.maxDrawdown.toFixed(2)}</p>
                            </div>
                            <div className="bg-gray-700/50 rounded-lg p-3">
                                <p className="text-xs text-gray-400">Net Profit</p>
                                <p className={`text-lg font-bold ${result.metrics.netProfit >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                    ₹{result.metrics.netProfit.toFixed(2)}
                                </p>
                            </div>
                        </div>

                        {/* Trade List */}
                        <div>
                            <h3 className="text-lg font-semibold text-white mb-3">Trade List ({result.trades.length.toLocaleString()} trades)</h3>
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b border-gray-700">
                                            <th className="text-left py-2 px-3 text-gray-400 font-medium">#</th>
                                            <th className="text-left py-2 px-3 text-gray-400 font-medium">Entry Date</th>
                                            <th className="text-right py-2 px-3 text-gray-400 font-medium">Entry</th>
                                            <th className="text-right py-2 px-3 text-gray-400 font-medium">Exit</th>
                                            <th className="text-right py-2 px-3 text-gray-400 font-medium">P&L</th>
                                            <th className="text-right py-2 px-3 text-gray-400 font-medium">%</th>
                                            <th className="text-center py-2 px-3 text-gray-400 font-medium">Exit Reason</th>
                                            <th className="text-right py-2 px-3 text-gray-400 font-medium">Duration</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {paginatedTrades.map((trade, idx) => (
                                            <tr key={trade.id} className="border-b border-gray-800 hover:bg-gray-700/30">
                                                <td className="py-2 px-3 text-gray-300">{startIdx + idx + 1}</td>
                                                <td className="py-2 px-3 text-gray-300">
                                                    {format(new Date(trade.entryDate), 'MMM dd, yyyy')}
                                                </td>
                                                <td className="py-2 px-3 text-right text-gray-300">₹{trade.entryPrice.toFixed(2)}</td>
                                                <td className="py-2 px-3 text-right text-gray-300">
                                                    {trade.exitPrice ? `₹${trade.exitPrice.toFixed(2)}` : '--'}
                                                </td>
                                                <td className={`py-2 px-3 text-right font-medium ${(trade.profit || 0) >= 0 ? 'text-emerald-400' : 'text-red-400'
                                                    }`}>
                                                    {trade.profit ? `₹${trade.profit.toFixed(2)}` : '--'}
                                                </td>
                                                <td className={`py-2 px-3 text-right font-medium ${(trade.profitPercent || 0) >= 0 ? 'text-emerald-400' : 'text-red-400'
                                                    }`}>
                                                    {trade.profitPercent ? `${trade.profitPercent.toFixed(2)}%` : '--'}
                                                </td>
                                                <td className="py-2 px-3 text-center">
                                                    <span className={`px-2 py-1 rounded text-xs font-medium ${trade.exitReason === 'TARGET' ? 'bg-emerald-900/30 text-emerald-400' :
                                                        trade.exitReason === 'SL' ? 'bg-red-900/30 text-red-400' :
                                                            'bg-yellow-900/30 text-yellow-400'
                                                        }`}>
                                                        {trade.exitReason || 'OPEN'}
                                                    </span>
                                                </td>
                                                <td className="py-2 px-3 text-right text-gray-300">
                                                    {trade.holdingMinutes ? `${trade.holdingMinutes}m` : '--'}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {/* Pagination Controls */}
                            {result.trades.length > 0 && (
                                <Pagination
                                    currentPage={pagination.page}
                                    totalPages={totalPages}
                                    onPageChange={(page) => handlePageChange(result.symbol, page)}
                                    itemsPerPage={pagination.itemsPerPage}
                                    onItemsPerPageChange={(items) => handleItemsPerPageChange(result.symbol, items)}
                                    totalItems={result.trades.length}
                                />
                            )}
                        </div>
                    </section>
                );
            })}
        </div>
    );
}
