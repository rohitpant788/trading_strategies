'use client';

import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import DataTable from '@/components/DataTable';
import StatCard from '@/components/StatCard';
import { Holding, ETF, Settings } from '@/types';
import { formatCurrency, formatPercent, formatDate, calculateTargetPrice, calculateAveragePrice } from '@/lib/calculations';

interface HoldingWithCalc extends Holding {
    avgPrice: number;
    targetPrice: number;
    notionalPL: number;
    notionalPLPercent: number;
}

export default function HoldingsPage() {
    const searchParams = useSearchParams();
    const buySymbol = searchParams.get('buy');

    const [holdings, setHoldings] = useState<HoldingWithCalc[]>([]);
    const [etfs, setETFs] = useState<ETF[]>([]);
    const [settings, setSettings] = useState<Settings | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [showAddModal, setShowAddModal] = useState(!!buySymbol);

    // Form state
    const [selectedETF, setSelectedETF] = useState(buySymbol || '');
    const [buyDate, setBuyDate] = useState(new Date().toISOString().split('T')[0]);
    const [buyPrice, setBuyPrice] = useState('');
    const [quantity, setQuantity] = useState('');

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            setIsLoading(true);
            const [holdingsRes, etfsRes, settingsRes] = await Promise.all([
                fetch('/api/holdings'),
                fetch('/api/etfs'),
                fetch('/api/settings'),
            ]);

            const [holdingsData, etfsData, settingsData] = await Promise.all([
                holdingsRes.json(),
                etfsRes.json(),
                settingsRes.json(),
            ]);

            // etfsData is { etfs: [], lastUpdated, count }
            setETFs(etfsData.etfs || etfsData || []);
            setSettings(settingsData);

            // Calculate additional fields
            const groupedByETF: Record<string, Holding[]> = {};
            holdingsData.forEach((h: Holding) => {
                if (!groupedByETF[h.etfSymbol]) groupedByETF[h.etfSymbol] = [];
                groupedByETF[h.etfSymbol].push(h);
            });

            const holdingsWithCalc = holdingsData.map((h: Holding) => {
                const etfHoldings = groupedByETF[h.etfSymbol] || [];
                const avgPrice = calculateAveragePrice(etfHoldings);
                const totalQty = etfHoldings.reduce((sum, x) => sum + x.quantity, 0);
                const targetPrice = calculateTargetPrice(avgPrice, totalQty, settingsData);
                const notionalPL = (h.buyPrice - avgPrice) * h.quantity; // Placeholder - needs CMP
                const notionalPLPercent = avgPrice > 0 ? ((h.buyPrice - avgPrice) / avgPrice) * 100 : 0;

                return {
                    ...h,
                    avgPrice,
                    targetPrice,
                    notionalPL,
                    notionalPLPercent,
                };
            });

            setHoldings(holdingsWithCalc);
        } catch (error) {
            console.error('Error fetching data:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleAddHolding = async (e: React.FormEvent) => {
        e.preventDefault();

        try {
            const response = await fetch('/api/holdings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    etfSymbol: selectedETF,
                    buyDate,
                    buyPrice: parseFloat(buyPrice),
                    quantity: parseInt(quantity),
                }),
            });

            if (response.ok) {
                setShowAddModal(false);
                setSelectedETF('');
                setBuyPrice('');
                setQuantity('');
                fetchData();
            }
        } catch (error) {
            console.error('Error adding holding:', error);
        }
    };

    const handleSell = async (holding: HoldingWithCalc) => {
        const sellPrice = prompt('Enter sell price:');
        if (!sellPrice) return;

        try {
            // Add to trades
            await fetch('/api/trades', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    etfSymbol: holding.etfSymbol,
                    buyDate: holding.buyDate,
                    sellDate: new Date().toISOString().split('T')[0],
                    buyPrice: holding.buyPrice,
                    sellPrice: parseFloat(sellPrice),
                    quantity: holding.quantity,
                }),
            });

            // Delete holding
            await fetch(`/api/holdings?id=${holding.id}`, { method: 'DELETE' });

            fetchData();
        } catch (error) {
            console.error('Error selling holding:', error);
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm('Delete this holding?')) return;

        try {
            await fetch(`/api/holdings?id=${id}`, { method: 'DELETE' });
            fetchData();
        } catch (error) {
            console.error('Error deleting holding:', error);
        }
    };

    // Summary calculations
    const totalInvested = holdings.reduce((sum, h) => sum + h.buyPrice * h.quantity, 0);
    const uniqueETFs = new Set(holdings.map(h => h.etfSymbol)).size;

    const columns = [
        {
            key: 'etfSymbol',
            header: 'ETF',
            sortable: true,
            render: (row: HoldingWithCalc, _index: number) => (
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
            render: (row: HoldingWithCalc, _index: number) => (
                <span className="text-gray-300">{formatDate(row.buyDate)}</span>
            ),
        },
        {
            key: 'buyPrice',
            header: 'Buy Price',
            sortable: true,
            render: (row: HoldingWithCalc, _index: number) => (
                <span className="text-white">{formatCurrency(row.buyPrice)}</span>
            ),
        },
        {
            key: 'quantity',
            header: 'Qty',
            sortable: true,
        },
        {
            key: 'avgPrice',
            header: 'Avg Price',
            sortable: true,
            render: (row: HoldingWithCalc, _index: number) => (
                <span className="text-gray-300">{formatCurrency(row.avgPrice)}</span>
            ),
        },
        {
            key: 'targetPrice',
            header: 'Target',
            sortable: true,
            render: (row: HoldingWithCalc, _index: number) => (
                <span className="text-emerald-400 font-medium">{formatCurrency(row.targetPrice)}</span>
            ),
        },
        {
            key: 'investedValue',
            header: 'Invested',
            render: (row: HoldingWithCalc, _index: number) => (
                <span className="text-white">{formatCurrency(row.buyPrice * row.quantity)}</span>
            ),
        },
        {
            key: 'actions',
            header: 'Actions',
            render: (row: HoldingWithCalc, _index: number) => (
                <div className="flex gap-2">
                    <button
                        onClick={() => handleSell(row)}
                        className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 rounded text-xs font-medium transition-colors"
                    >
                        Sell
                    </button>
                    <button
                        onClick={() => handleDelete(row.id)}
                        className="px-2 py-1 bg-red-600 hover:bg-red-700 rounded text-xs font-medium transition-colors"
                    >
                        ✕
                    </button>
                </div>
            ),
        },
    ];

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-white">💰 Kharida Hua Maal (Holdings)</h1>
                    <p className="text-gray-400 text-sm">Your active ETF positions</p>
                </div>
                <button
                    onClick={() => setShowAddModal(true)}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 rounded-lg font-medium transition-colors flex items-center gap-2"
                >
                    ➕ Add Purchase
                </button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatCard title="Total Holdings" value={holdings.length} icon="📊" />
                <StatCard title="Unique ETFs" value={uniqueETFs} icon="📁" />
                <StatCard title="Total Invested" value={totalInvested} icon="💵" isCurrency />
                <StatCard
                    title="Profit Target"
                    value={settings?.profitTargetPercent || 6}
                    icon="🎯"
                    isPercentage
                />
            </div>

            {/* Table */}
            <div className="bg-gray-800/50 rounded-xl border border-gray-700 overflow-hidden">
                <DataTable
                    columns={columns}
                    data={holdings}
                    keyField="id"
                    isLoading={isLoading}
                    emptyMessage="No holdings yet. Click 'Add Purchase' to get started!"
                />
            </div>

            {/* Add Modal */}
            {showAddModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-gray-800 rounded-xl p-6 w-full max-w-md border border-gray-700">
                        <h2 className="text-xl font-bold text-white mb-4">➕ Add New Purchase</h2>

                        <form onSubmit={handleAddHolding} className="space-y-4">
                            <div>
                                <label className="block text-sm text-gray-400 mb-1">ETF Symbol</label>
                                <select
                                    value={selectedETF}
                                    onChange={(e) => setSelectedETF(e.target.value)}
                                    required
                                    className="w-full px-3 py-2 bg-yellow-100 text-gray-900 border border-yellow-400 rounded-lg"
                                >
                                    <option value="">Select ETF...</option>
                                    {etfs.map(etf => (
                                        <option key={etf.id} value={etf.symbol}>
                                            {etf.symbol} - {etf.name}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm text-gray-400 mb-1">Buy Date</label>
                                <input
                                    type="date"
                                    value={buyDate}
                                    onChange={(e) => setBuyDate(e.target.value)}
                                    required
                                    className="w-full px-3 py-2 bg-yellow-100 text-gray-900 border border-yellow-400 rounded-lg"
                                />
                            </div>

                            <div>
                                <label className="block text-sm text-gray-400 mb-1">Buy Price (₹)</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    value={buyPrice}
                                    onChange={(e) => setBuyPrice(e.target.value)}
                                    required
                                    placeholder="Enter buy price"
                                    className="w-full px-3 py-2 bg-yellow-100 text-gray-900 border border-yellow-400 rounded-lg"
                                />
                            </div>

                            <div>
                                <label className="block text-sm text-gray-400 mb-1">Quantity</label>
                                <input
                                    type="number"
                                    value={quantity}
                                    onChange={(e) => setQuantity(e.target.value)}
                                    required
                                    placeholder="Enter quantity"
                                    className="w-full px-3 py-2 bg-yellow-100 text-gray-900 border border-yellow-400 rounded-lg"
                                />
                            </div>

                            <div className="flex gap-3 pt-4">
                                <button
                                    type="button"
                                    onClick={() => setShowAddModal(false)}
                                    className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg font-medium transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 rounded-lg font-medium transition-colors"
                                >
                                    Add Purchase
                                </button>
                            </div>
                        </form>

                        <p className="text-yellow-400 text-xs mt-4">
                            💡 Yellow fields are user inputs (like Google Sheet yellow cells)
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
}
