'use client';

import React, { useEffect, useState } from 'react';
import DataTable from '@/components/DataTable';
import StatCard from '@/components/StatCard';
import { formatCurrency, formatPercent } from '@/lib/calculations';

import { Holding, Settings } from '@/types';

interface ETFWithMarketData {
    etfId: number;
    symbol: string;
    yahooSymbol: string;
    name: string;
    category: string;
    cmp: number | null;
    high52w: number | null;
    low52w: number | null;
    prevClose: number | null;
    change: number | null;
    changePercent: number | null;
    volume: number | null;
    dma20: number | null;
    dmaDistance: number | null;
    updatedAt: string | null;
    distanceFromLow: number | null;
    distanceFromHigh: number | null;
}

export default function ETFsListPage() {
    const [etfs, setETFs] = useState<ETFWithMarketData[]>([]);
    const [holdings, setHoldings] = useState<Holding[]>([]);
    const [settings, setSettings] = useState<Settings | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [filter, setFilter] = useState<string>('');
    const [categoryFilter, setCategoryFilter] = useState<string>('All');
    const [lastUpdated, setLastUpdated] = useState<string | null>(null);
    const [showAddModal, setShowAddModal] = useState(false);

    // Form state for adding ETF
    const [newSymbol, setNewSymbol] = useState('');
    const [newName, setNewName] = useState('');
    const [newCategory, setNewCategory] = useState('');

    useEffect(() => {
        fetchETFs();
    }, []);

    const fetchETFs = async () => {
        try {
            setIsLoading(true);
            const [etfsRes, holdingsRes, settingsRes] = await Promise.all([
                fetch('/api/etfs'),
                fetch('/api/holdings'),
                fetch('/api/settings')
            ]);

            const etfsData = await etfsRes.json();
            const holdingsData = await holdingsRes.json();
            const settingsData = await settingsRes.json();

            setETFs(etfsData.etfs || []);
            setLastUpdated(etfsData.lastUpdated);
            setHoldings(holdingsData);
            setSettings(settingsData);
        } catch (error) {
            console.error('Error fetching data:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const refreshMarketData = async () => {
        try {
            setIsRefreshing(true);
            const response = await fetch('/api/market-data');
            const result = await response.json();
            console.log('Refresh result:', result);
            await fetchETFs();
        } catch (error) {
            console.error('Error refreshing market data:', error);
        } finally {
            setIsRefreshing(false);
        }
    };

    const handleAddETF = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const response = await fetch('/api/etfs', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    symbol: newSymbol.toUpperCase(),
                    name: newName,
                    category: newCategory,
                }),
            });

            if (response.ok) {
                setShowAddModal(false);
                setNewSymbol('');
                setNewName('');
                setNewCategory('');
                fetchETFs();
            } else {
                const error = await response.json();
                alert(error.error || 'Failed to add ETF');
            }
        } catch (error) {
            console.error('Error adding ETF:', error);
        }
    };

    const handleDeleteETF = async (etfId: number, symbol: string) => {
        if (!confirm(`Delete ${symbol} from the list?`)) return;

        try {
            const response = await fetch(`/api/etfs?id=${etfId}`, { method: 'DELETE' });
            if (response.ok) fetchETFs();
        } catch (error) {
            console.error('Error deleting ETF:', error);
        }
    };

    const categories = ['All', ...new Set(etfs.map(e => e.category))];
    const uniqueCategories = [...new Set(etfs.map(e => e.category))];


    // Group holdings by ETF Symbol to find the latest buy price
    const holdingsMap = new Map<string, Holding[]>();
    holdings.forEach(h => {
        const list = holdingsMap.get(h.etfSymbol) || [];
        list.push(h);
        holdingsMap.set(h.etfSymbol, list);
    });

    const filteredETFs = etfs.filter(etf => {
        // 1. Basic Filters
        const matchesSearch =
            etf.symbol.toLowerCase().includes(filter.toLowerCase()) ||
            etf.name.toLowerCase().includes(filter.toLowerCase());
        const matchesCategory = categoryFilter === 'All' || etf.category === categoryFilter;

        if (!matchesSearch || !matchesCategory) return false;

        // 2. Averaging Threshold Filter
        // If we hold this ETF, hide it UNLESS price has dropped enough from LAST BUY
        const etfHoldings = holdingsMap.get(etf.symbol);
        if (etfHoldings && etfHoldings.length > 0 && settings?.averagingThreshold && etf.cmp) {
            // Find latest buy (Holdings are typically sorted by date in API, but let's be safe)
            // Actually API returns ordered by buy_date DESC (newest first) or we sort here.
            // Let's assume simplest: find max date or id.
            // API getAllHoldings sorts by buy_date DESC. So first item is latest.
            // Wait, getAllHoldings in db.ts sorts by buy_date DESC. Correct.

            const latestHolding = etfHoldings[0]; // Most recent buy
            const lastBuyPrice = latestHolding.buyPrice;

            // Calculate drop percentage: (LastBuy - Current) / LastBuy * 100
            // Positive if dropped, Negative if rose.
            const dropPercent = ((lastBuyPrice - etf.cmp) / lastBuyPrice) * 100;

            // IF drop is LESS than threshold (e.g. 1% < 2.5%), HIDE IT.
            // If drop is MORE or EQUAL (e.g. 3% >= 2.5%), SHOW IT.
            if (dropPercent < settings.averagingThreshold) {
                return false;
            }
        }

        return true;
    });

    const formatLastUpdated = (dateStr: string | null) => {
        if (!dateStr) return '--';
        const utcDateStr = dateStr.includes('Z') ? dateStr : `${dateStr.replace(' ', 'T')}Z`;
        const date = new Date(utcDateStr);
        return date.toLocaleString('en-IN', {
            day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', hour12: true,
        });
    };

    const columns = [
        {
            key: 'rank',
            header: 'Rank',
            render: (_row: ETFWithMarketData, index: number) => (
                <span className={`font-bold ${index < 5 ? 'text-emerald-400' : 'text-gray-500'}`}>
                    #{index + 1}
                </span>
            ),
        },
        {
            key: 'symbol',
            header: 'Symbol',
            sortable: true,
            render: (row: ETFWithMarketData) => (
                <div>
                    <p className="font-medium text-white">{row.symbol}</p>
                    <p className="text-xs text-gray-500">{row.yahooSymbol}</p>
                </div>
            ),
        },
        {
            key: 'name',
            header: 'Name',
            sortable: true,
            render: (row: ETFWithMarketData) => (
                <span className="text-gray-300 text-sm">{row.name}</span>
            ),
        },
        {
            key: 'cmp',
            header: 'CMP',
            sortable: true,
            render: (row: ETFWithMarketData) => (
                <span className="text-white font-medium">
                    {row.cmp ? formatCurrency(row.cmp) : '—'}
                </span>
            ),
        },
        {
            key: 'dma20',
            header: '20 DMA',
            sortable: true,
            render: (row: ETFWithMarketData) => (
                <span className="text-gray-400">
                    {row.dma20 ? formatCurrency(row.dma20) : '—'}
                </span>
            ),
        },
        {
            key: 'dmaDistance',
            header: '% From 20 DMA',
            sortable: true,
            render: (row: ETFWithMarketData) => {
                const distance = row.dmaDistance;
                if (distance === null) return <span className="text-gray-500">—</span>;

                // Negative = below DMA (buy signal), Positive = above DMA
                const color = distance < -5
                    ? 'text-emerald-400 font-bold'
                    : distance < 0
                        ? 'text-emerald-300'
                        : distance > 5
                            ? 'text-red-400'
                            : 'text-yellow-400';
                return (
                    <span className={color}>
                        {distance > 0 ? '+' : ''}{distance.toFixed(2)}%
                    </span>
                );
            },
        },
        {
            key: 'volume',
            header: 'Volume',
            sortable: true,
            render: (row: ETFWithMarketData) => (
                <span className="text-gray-400 text-sm">
                    {row.volume ? row.volume.toLocaleString() : '—'}
                </span>
            ),
        },
        {
            key: 'actions',
            header: 'Actions',
            render: (row: ETFWithMarketData) => (
                <div className="flex gap-2">
                    <button
                        onClick={() => window.location.href = `/holdings?buy=${row.symbol}`}
                        className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 rounded text-xs font-medium transition-colors"
                    >
                        Buy
                    </button>
                    <button
                        onClick={() => handleDeleteETF(row.etfId, row.symbol)}
                        className="px-2 py-1 bg-red-600 hover:bg-red-700 rounded text-xs font-medium transition-colors"
                    >
                        🗑️
                    </button>
                </div>
            ),
        },
    ];

    const etfsWithData = filteredETFs.filter(e => e.cmp !== null);
    // ETFs below 20 DMA (negative dmaDistance)
    const belowDMACount = etfsWithData.filter(e => (e.dmaDistance ?? 0) < 0).length;
    // Strong buy signals (more than 5% below DMA)
    const strongBuyCount = etfsWithData.filter(e => (e.dmaDistance ?? 0) < -5).length;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-white">📈 ETFs List (20 DMA Ranking)</h1>
                    <p className="text-gray-400 text-sm">
                        Ranked by distance from 20-day moving average (lowest first)
                    </p>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={() => setShowAddModal(true)}
                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 rounded-lg font-medium transition-colors"
                    >
                        ➕ Add ETF
                    </button>
                    <button
                        onClick={refreshMarketData}
                        disabled={isRefreshing}
                        className={`px-4 py-2 rounded-lg font-medium transition-colors ${isRefreshing ? 'bg-gray-600 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'
                            }`}
                    >
                        {isRefreshing ? '⏳ Refreshing...' : '🔄 Refresh Data'}
                    </button>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatCard title="Total ETFs" value={etfs.length} icon="📊" />
                <StatCard
                    title="Below 20 DMA"
                    value={belowDMACount}
                    icon="📉"
                    variant="success"
                    subtitle="Buy zone"
                />
                <StatCard
                    title="Strong Buys"
                    value={strongBuyCount}
                    icon="🎯"
                    variant="success"
                    subtitle=">5% below DMA"
                />
                <StatCard
                    title="Last Updated"
                    value={formatLastUpdated(lastUpdated)}
                    icon="🕐"
                />
            </div>

            {/* Filters */}
            <div className="flex flex-col md:flex-row gap-4">
                <input
                    type="text"
                    placeholder="Search ETFs..."
                    value={filter}
                    onChange={(e) => setFilter(e.target.value)}
                    className="flex-1 px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-emerald-500"
                />
                <select
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                    className="px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white"
                >
                    {categories.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                    ))}
                </select>
            </div>

            {/* Table */}
            <div className="bg-gray-800/50 rounded-xl border border-gray-700 overflow-hidden">
                <DataTable
                    columns={columns}
                    data={filteredETFs}
                    keyField="etfId"
                    isLoading={isLoading}
                    emptyMessage="No ETFs found"
                />
            </div>

            {/* Strategy Info */}
            <div className="bg-emerald-900/20 border border-emerald-700/50 rounded-xl p-4">
                <p className="text-emerald-300 text-sm">
                    💡 <strong>ETF Shop 3.0 Strategy:</strong> Buy ETFs ranked in the top 5 (most below 20 DMA).
                    Green = below 20 DMA (buy zone). The more negative, the stronger the buy signal.
                </p>
            </div>

            {/* Add ETF Modal */}
            {showAddModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-gray-800 rounded-xl p-6 w-full max-w-md border border-gray-700">
                        <h2 className="text-xl font-bold text-white mb-4">➕ Add New ETF</h2>
                        <form onSubmit={handleAddETF} className="space-y-4">
                            <div>
                                <label className="block text-sm text-gray-400 mb-1">Symbol (NSE)</label>
                                <input
                                    type="text"
                                    value={newSymbol}
                                    onChange={(e) => setNewSymbol(e.target.value.toUpperCase())}
                                    required
                                    placeholder="e.g., GOLDBEES"
                                    className="w-full px-3 py-2 bg-yellow-100 text-gray-900 border border-yellow-400 rounded-lg uppercase"
                                />
                            </div>
                            <div>
                                <label className="block text-sm text-gray-400 mb-1">ETF Name</label>
                                <input
                                    type="text"
                                    value={newName}
                                    onChange={(e) => setNewName(e.target.value)}
                                    required
                                    placeholder="e.g., Nippon India ETF Gold BeES"
                                    className="w-full px-3 py-2 bg-yellow-100 text-gray-900 border border-yellow-400 rounded-lg"
                                />
                            </div>
                            <div>
                                <label className="block text-sm text-gray-400 mb-1">Category</label>
                                <select
                                    value={newCategory}
                                    onChange={(e) => setNewCategory(e.target.value)}
                                    className="w-full px-3 py-2 bg-yellow-100 text-gray-900 border border-yellow-400 rounded-lg"
                                >
                                    <option value="">Select category...</option>
                                    {uniqueCategories.map(cat => (
                                        <option key={cat} value={cat}>{cat}</option>
                                    ))}
                                </select>
                                <input
                                    type="text"
                                    value={newCategory}
                                    onChange={(e) => setNewCategory(e.target.value)}
                                    required
                                    placeholder="Or enter new category..."
                                    className="w-full mt-2 px-3 py-2 bg-yellow-100 text-gray-900 border border-yellow-400 rounded-lg"
                                />
                            </div>
                            <div className="flex gap-3 pt-4">
                                <button
                                    type="button"
                                    onClick={() => setShowAddModal(false)}
                                    className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg font-medium"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 rounded-lg font-medium"
                                >
                                    Add ETF
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
