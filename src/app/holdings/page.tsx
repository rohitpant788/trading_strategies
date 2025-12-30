'use client';

import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import DataTable from '@/components/DataTable';
import StatCard from '@/components/StatCard';
import ConfirmationModal from '@/components/ConfirmationModal';
import ConfirmModal from '@/components/ConfirmationModal';
import SellModal from '@/components/SellModal';
import EditHoldingModal from '@/components/EditHoldingModal';
// Assuming etfs list is of type MarketDataRow[] or ETF[] with market data
import { Holding, ETF, Settings, MarketDataRow, HoldingWithCalc } from '@/types';
import { formatCurrency, formatPercent, formatDate, calculateTargetPrice, calculateAveragePrice } from '@/lib/calculations';

interface SellCandidate extends HoldingWithCalc {
    underlyingAsset: string;
    currentValue: number;
    profit: number;
    profitPercent: number;
}

// HoldingWithCalc is imported from types now

export default function HoldingsPage() {
    const searchParams = useSearchParams();
    const buySymbol = searchParams.get('buy');

    const [holdings, setHoldings] = useState<HoldingWithCalc[]>([]);
    // Using MarketDataRow type effectively since we need cmp
    const [etfs, setETFs] = useState<any[]>([]); // Using any for flexibility or better cast to ETF & { cmp?: number }
    const [settings, setSettings] = useState<Settings | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [showAddModal, setShowAddModal] = useState(!!buySymbol);

    // Form state
    const [selectedETF, setSelectedETF] = useState(buySymbol || '');
    const [buyDate, setBuyDate] = useState(new Date().toISOString().split('T')[0]);
    const [buyPrice, setBuyPrice] = useState('');
    const [quantity, setQuantity] = useState('');

    // Confirmation Modal State
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [confirmStep, setConfirmStep] = useState<1 | 2>(1);
    const [holdingToDelete, setHoldingToDelete] = useState<number | null>(null);

    // Sell Modal State
    const [sellModalOpen, setSellModalOpen] = useState(false);
    const [holdingToSell, setHoldingToSell] = useState<HoldingWithCalc | null>(null);

    // Edit Modal State
    const [editModalOpen, setEditModalOpen] = useState(false);
    const [holdingToEdit, setHoldingToEdit] = useState<HoldingWithCalc | null>(null);

    // Generic Warning Confirm State
    const [warningOpen, setWarningOpen] = useState(false);
    const [warningMessage, setWarningMessage] = useState('');
    const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);
    // Type definition for dailyActivity
    interface DailyActivity { buys: number; sells: number; }
    const [dailyActivity, setDailyActivity] = useState<DailyActivity | null>(null);

    // Logic for auto-populating fields on ETF selection
    useEffect(() => {
        if (selectedETF && etfs.length > 0 && settings) {
            const etf = etfs.find(e => e.symbol === selectedETF);
            if (etf && etf.cmp) {
                // Auto-populate price if empty or if it was just selected
                setBuyPrice(etf.cmp.toString());
                // Calculate quantity based on perTransactionAmount
                if (settings.perTransactionAmount) {
                    const qty = Math.floor(settings.perTransactionAmount / etf.cmp);
                    setQuantity(qty > 0 ? qty.toString() : '1');
                }
            }
        }
    }, [selectedETF, etfs.length, settings]); // Dependency on selectedETF change

    // Logic for auto-adjusting quantity when price changes
    // But we must be careful not to override manual quantity unless price changed
    // We can use a handler for price change instead of effect to be more explicit
    const handlePriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newPrice = e.target.value;
        setBuyPrice(newPrice);

        if (newPrice && !isNaN(parseFloat(newPrice)) && settings?.perTransactionAmount) {
            const priceVal = parseFloat(newPrice);
            if (priceVal > 0) {
                const qty = Math.floor(settings.perTransactionAmount / priceVal);
                setQuantity(qty > 0 ? qty.toString() : '1');
            }
        }
    };

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

            // Extract daily activity if available
            if (settingsData.dailyActivity) {
                setDailyActivity(settingsData.dailyActivity);
            }
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

    const handleAddHolding = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();

        // Check Daily Limit (Soft Limit)
        if (settings?.maxDailyBuys && dailyActivity) {
            if (dailyActivity.buys >= settings.maxDailyBuys && !pendingAction) {
                setWarningMessage(`Daily buy limit of ${settings.maxDailyBuys} reached! Continue anyway?`);
                setPendingAction(() => () => submitAddHolding());
                setWarningOpen(true);
                return;
            }
        }

        submitAddHolding();
    };

    const submitAddHolding = async () => {
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
                setPendingAction(null);
                fetchData();
            } else {
                const data = await response.json();
                alert(data.error || 'Failed to add holding');
            }
        } catch (error) {
            console.error('Error adding holding:', error);
        }
    };

    const handleSellClick = (holding: HoldingWithCalc) => {
        setHoldingToSell(holding);
        setSellModalOpen(true);
    };

    const confirmSell = async (sellPrice: number) => {
        if (!holdingToSell) return;

        // Check Daily Limit (Soft Limit)
        if (settings?.maxDailySells && dailyActivity) {
            // We only check this if we haven't already confirmed the warning
            // But wait, confirmSell is called from SellModal which is the confirmation.
            // We should check BEFORE opening SellModal? Or inside confirmSell?
            // Since SellModal is already a "Confirmation", maybe we add a warning there?
            // Or just stick to one warning.
            // User wants "recommendation".
            // Let's force a warning popup if limit reached, before proceeding.

            if (dailyActivity.sells >= settings.maxDailySells && !pendingAction) {
                setWarningMessage(`Daily sell limit of ${settings.maxDailySells} reached! Continue anyway?`);
                setPendingAction(() => () => executeSell(sellPrice));
                setWarningOpen(true);
                // Close sell modal temporarily or keep it open?
                // If we keep it open, the warning modal appears on top.
                setSellModalOpen(false); // Close sell modal to show warning cleanly? Or layer it.
                // Let's layer it.
                return;
            }
        }

        executeSell(sellPrice);
    };

    const executeSell = async (sellPrice: number) => {
        if (!holdingToSell) return;

        try {
            // Add to trades
            const tradeRes = await fetch('/api/trades', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    etfSymbol: holdingToSell.etfSymbol,
                    buyDate: holdingToSell.buyDate,
                    sellDate: new Date().toISOString().split('T')[0],
                    buyPrice: holdingToSell.buyPrice,
                    sellPrice: sellPrice,
                    quantity: holdingToSell.quantity,
                }),
            });

            const tradeData = await tradeRes.json();

            if (!tradeRes.ok) {
                alert(tradeData.error || 'Failed to record trade');
                return;
            }

            // Now delete from holdings
            const deleteRes = await fetch(`/api/holdings?id=${holdingToSell.id}`, { method: 'DELETE' });

            if (!deleteRes.ok) {
                alert('Trade recorded but failed to delete holding. Please delete manually.');
            }

            fetchData();
            setSellModalOpen(false);
            setHoldingToSell(null);

        } catch (error) {
            console.error('Error selling holding:', error);
            alert('An error occurred while selling');
        }
    };

    const handleDeleteClick = (id: number) => {
        setHoldingToDelete(id);
        setConfirmStep(1);
        setConfirmOpen(true);
    };

    const confirmDelete = async () => {
        if (!holdingToDelete) return;

        if (confirmStep === 1) {
            setConfirmStep(2);
            return;
        }

        try {
            await fetch(`/api/holdings?id=${holdingToDelete}`, { method: 'DELETE' });
            fetchData();
            setConfirmOpen(false);
            setHoldingToDelete(null);
        } catch (error) {
            console.error('Error deleting holding:', error);
        }
    };

    const cancelDelete = () => {
        setConfirmOpen(false);
        setHoldingToDelete(null);
        setConfirmStep(1);
    };

    const handleEditClick = (holding: HoldingWithCalc) => {
        setHoldingToEdit(holding);
        setEditModalOpen(true);
    };

    const confirmEdit = async (id: number, newPrice: number, newQty: number, newDate: string) => {
        try {
            const response = await fetch('/api/holdings', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id, buyPrice: newPrice, quantity: newQty, buyDate: newDate }),
            });

            if (response.ok) {
                setEditModalOpen(false);
                setHoldingToEdit(null);
                fetchData();
            } else {
                alert('Failed to update holding');
            }
        } catch (error) {
            console.error('Error updating holding:', error);
        }
    };

    // Summary calculations
    const totalInvested = holdings.reduce((sum, h) => sum + h.buyPrice * h.quantity, 0);
    const uniqueETFs = new Set(holdings.map(h => h.etfSymbol)).size;

    // Filter Eligible Sell Candidates
    // Logic: Current Market Price >= Target Price
    const sellCandidates: SellCandidate[] = holdings.filter(h => {
        // We need CMP. We can find it in 'etfs' (which has market data)
        const etfData = etfs.find(e => e.symbol === h.etfSymbol);
        if (!etfData || !etfData.cmp) return false;

        // Check if CMP >= TargetPrice
        // Note: h.targetPrice is calculated in fetchData. 
        // If targetPrice is based on Average, it's the same for all holdings of that ETF?
        // Wait, calculateTargetPrice typically uses Avg Price. 
        // But the user might want individualized targets?
        // The current implementation of calculateTargetPrice uses AvgPrice.
        // Let's stick to that.
        return etfData.cmp >= h.targetPrice;
    }).map(h => {
        const etfData = etfs.find(e => e.symbol === h.etfSymbol);
        return {
            ...h,
            underlyingAsset: etfData?.category || 'Unknown',
            currentValue: (etfData?.cmp || 0) * h.quantity,
            profit: ((etfData?.cmp || 0) - h.buyPrice) * h.quantity,
            profitPercent: ((etfData?.cmp || 0) - h.buyPrice) / h.buyPrice * 100
        };
    });

    const sellColumns = [
        {
            key: 'buyDate',
            header: 'Buy Date',
            render: (row: SellCandidate) => <span className="text-gray-300">{formatDate(row.buyDate)}</span>
        },
        { key: 'etfSymbol', header: 'ETF Code', sortable: true },
        { key: 'underlyingAsset', header: 'Underlying Asset' },
        {
            key: 'buyPrice',
            header: 'Buy Price',
            render: (row: SellCandidate) => formatCurrency(row.buyPrice)
        },
        { key: 'quantity', header: 'Buy Qty' },
        {
            key: 'invested',
            header: 'Invested amount',
            render: (row: SellCandidate) => formatCurrency(row.buyPrice * row.quantity)
        },
        {
            key: 'targetPrice',
            header: 'Sell Price',
            // Showing Target Price as the "Sell Price" goal
            render: (row: SellCandidate) => <span className="text-emerald-400 font-bold">{formatCurrency(row.targetPrice)}</span>
        },
        {
            key: 'sellDate',
            header: 'Sell Date',
            render: () => <span className="text-gray-500 italic">--</span>
        },
        {
            key: 'totalInvested',
            header: 'Invested amt on this date',
            // User requested total invested amount here
            render: () => <span className="text-gray-400">{formatCurrency(totalInvested)}</span>
        },
        {
            key: 'profit',
            header: 'Profit',
            render: (row: SellCandidate & { profit: number; profitPercent: number }) => (
                <div>
                    <span className="text-emerald-400 font-bold block">{formatCurrency(row.profit)}</span>
                    <span className="text-emerald-500/70 text-xs">({row.profitPercent.toFixed(2)}%)</span>
                </div>
            )
        },
        {
            key: 'actions',
            header: 'Action',
            render: (row: SellCandidate) => (
                <button
                    onClick={() => handleSellClick(row)}
                    className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 rounded text-xs font-bold animate-pulse shadow-lg shadow-emerald-900/50"
                >
                    SELL NOW
                </button>
            )
        }
    ];

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
                        onClick={() => handleSellClick(row)}
                        className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 rounded text-xs font-medium transition-colors"
                    >
                        Sell
                    </button>
                    <button
                        onClick={() => handleEditClick(row)}
                        className="px-2 py-1 bg-blue-600 hover:bg-blue-700 rounded text-xs font-medium transition-colors"
                    >
                        ✏️
                    </button>
                    <button
                        onClick={() => handleDeleteClick(row.id)}
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

            {/* Ready to Sell Section */}
            {sellCandidates.length > 0 && (
                <div className="bg-emerald-900/20 border border-emerald-500/50 rounded-xl overflow-hidden animate-in fade-in slide-in-from-top-4 duration-700">
                    <div className="p-4 bg-emerald-900/40 border-b border-emerald-500/30 flex justify-between items-center">
                        <div>
                            <h2 className="text-xl font-bold text-emerald-400 flex items-center gap-2">
                                🎯 Ready to Sell (Profit Target Reached)
                            </h2>
                            <p className="text-emerald-300/70 text-sm mt-1">
                                These positions have reached your profit target. Time to book profit?
                            </p>
                        </div>
                        <div className="px-3 py-1 bg-emerald-500/20 rounded-full border border-emerald-500/30 text-emerald-300 text-xs font-medium">
                            {sellCandidates.length} Opportunities
                        </div>
                    </div>

                    <DataTable
                        columns={sellColumns}
                        data={sellCandidates}
                        keyField="id"
                        isLoading={false}
                        emptyMessage="No targets reached yet."
                    />
                </div>
            )}

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
                                <label className="block text-sm text-gray-400 mb-1">Price</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    required
                                    value={buyPrice}
                                    onChange={handlePriceChange}
                                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
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
            {/* Confirmation Modal */}
            <ConfirmationModal
                isOpen={confirmOpen}
                title={confirmStep === 1 ? "Confirm Deletion" : "⚠️ Final Warning"}
                message={
                    confirmStep === 1
                        ? "Are you sure you want to DELETE this holding?"
                        : "Double Check: This action CANNOT be undone. Do you really want to delete this position?"
                }
                onConfirm={confirmDelete}
                onCancel={cancelDelete}
                confirmText={confirmStep === 1 ? "Yes, Delete" : "I Understand, DELETE IT"}
                cancelText="Cancel"
                isDanger={true}
            />

            {/* Warning Limit Modal */}
            {/* Warning Limit Modal */}
            <ConfirmationModal
                isOpen={warningOpen}
                title="⚠️ Limit Recommendation"
                message={warningMessage}
                onConfirm={() => {
                    if (pendingAction) pendingAction();
                    setWarningOpen(false);
                    setPendingAction(null);
                }}
                onCancel={() => {
                    setWarningOpen(false);
                    setPendingAction(null);
                }}
                confirmText="Yes, Proceed"
                cancelText="Stop"
                isDanger={false}
            />

            {/* Sell Modal */}
            <SellModal
                isOpen={sellModalOpen}
                holding={holdingToSell}
                onConfirm={confirmSell}
                onCancel={() => {
                    setSellModalOpen(false);
                    setHoldingToSell(null);
                }}
            />

            {/* Edit Modal */}
            <EditHoldingModal
                isOpen={editModalOpen}
                holding={holdingToEdit}
                onConfirm={confirmEdit}
                onCancel={() => {
                    setEditModalOpen(false);
                    setHoldingToEdit(null);
                }}
            />
        </div>
    );
}
