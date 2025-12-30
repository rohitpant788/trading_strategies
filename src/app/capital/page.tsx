'use client';

import React, { useEffect, useState } from 'react';
import DataTable from '@/components/DataTable';
import StatCard from '@/components/StatCard';
import { CapitalTransaction, Settings } from '@/types';
import { formatCurrency, formatDate } from '@/lib/calculations';

export default function CapitalPage() {
    const [transactions, setTransactions] = useState<CapitalTransaction[]>([]);
    const [settings, setSettings] = useState<Settings | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [showAddModal, setShowAddModal] = useState(false);
    const [totalInvested, setTotalInvested] = useState(0);
    const [totalRealizedProfit, setTotalRealizedProfit] = useState(0);

    // Form state
    const [txType, setTxType] = useState<'ADD' | 'WITHDRAW'>('ADD');
    const [amount, setAmount] = useState('');
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [notes, setNotes] = useState('');

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            setIsLoading(true);
            const [txRes, settingsRes, holdingsRes, tradesRes] = await Promise.all([
                fetch('/api/capital'),
                fetch('/api/settings'),
                fetch('/api/holdings'),
                fetch('/api/trades'),
            ]);

            const [txData, settingsData, holdingsData, tradesData] = await Promise.all([
                txRes.json(),
                settingsRes.json(),
                holdingsRes.json(),
                tradesRes.json(),
            ]);

            setTransactions(txData);
            setSettings(settingsData);

            // Calculate total invested and profit
            const invested = holdingsData.reduce(
                (sum: number, h: { buyPrice: number; quantity: number }) =>
                    sum + h.buyPrice * h.quantity,
                0
            );
            const profit = tradesData.reduce(
                (sum: number, t: { profit: number }) => sum + t.profit,
                0
            );

            setTotalInvested(invested);
            setTotalRealizedProfit(profit);
        } catch (error) {
            console.error('Error fetching data:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleAddTransaction = async (e: React.FormEvent) => {
        e.preventDefault();

        try {
            const response = await fetch('/api/capital', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    type: txType,
                    amount: parseFloat(amount),
                    date,
                    notes: notes || undefined,
                }),
            });

            if (response.ok) {
                setShowAddModal(false);
                setAmount('');
                setNotes('');
                fetchData();
            }
        } catch (error) {
            console.error('Error adding transaction:', error);
        }
    };

    // Calculate totals
    const totalAdditions = transactions
        .filter(t => t.type === 'ADD')
        .reduce((sum, t) => sum + t.amount, 0);
    const totalWithdrawals = transactions
        .filter(t => t.type === 'WITHDRAW')
        .reduce((sum, t) => sum + t.amount, 0);

    const baseCapital = settings?.totalCapital || 500000;
    const netCapital = baseCapital + totalAdditions - totalWithdrawals;
    const availableCapital = netCapital - totalInvested + totalRealizedProfit;
    const usedPercent = netCapital > 0 ? (totalInvested / netCapital) * 100 : 0;

    const columns = [
        {
            key: 'date',
            header: 'Date',
            sortable: true,
            render: (row: CapitalTransaction) => (
                <span className="text-gray-300">{formatDate(row.date)}</span>
            ),
        },
        {
            key: 'type',
            header: 'Type',
            sortable: true,
            render: (row: CapitalTransaction) => (
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${row.type === 'ADD'
                        ? 'bg-emerald-600/20 text-emerald-400'
                        : 'bg-red-600/20 text-red-400'
                    }`}>
                    {row.type === 'ADD' ? '➕ Addition' : '➖ Withdrawal'}
                </span>
            ),
        },
        {
            key: 'amount',
            header: 'Amount',
            sortable: true,
            render: (row: CapitalTransaction) => (
                <span className={row.type === 'ADD' ? 'text-emerald-400' : 'text-red-400'}>
                    {row.type === 'ADD' ? '+' : '-'}{formatCurrency(row.amount)}
                </span>
            ),
        },
        {
            key: 'notes',
            header: 'Notes',
            render: (row: CapitalTransaction) => (
                <span className="text-gray-500">{row.notes || '—'}</span>
            ),
        },
    ];

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-white">🏦 Capital Management</h1>
                    <p className="text-gray-400 text-sm">Track your investment capital</p>
                </div>
                <button
                    onClick={() => setShowAddModal(true)}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 rounded-lg font-medium transition-colors flex items-center gap-2"
                >
                    ➕ Add Transaction
                </button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatCard title="Base Capital" value={baseCapital} icon="💵" isCurrency variant="info" />
                <StatCard title="Net Capital" value={netCapital} icon="🏦" isCurrency />
                <StatCard
                    title="Currently Invested"
                    value={totalInvested}
                    icon="📊"
                    isCurrency
                    subtitle={`${usedPercent.toFixed(1)}% of capital`}
                />
                <StatCard
                    title="Available"
                    value={availableCapital}
                    icon="💰"
                    isCurrency
                    variant={availableCapital > 0 ? 'success' : 'danger'}
                />
            </div>

            {/* Capital Usage Chart */}
            <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
                <h3 className="text-lg font-bold text-white mb-4">Capital Allocation</h3>
                <div className="space-y-4">
                    <div>
                        <div className="flex justify-between text-sm mb-1">
                            <span className="text-gray-400">Used Capital</span>
                            <span className="text-white">{formatCurrency(totalInvested)}</span>
                        </div>
                        <div className="h-4 bg-gray-700 rounded-full overflow-hidden">
                            <div
                                className={`h-full rounded-full transition-all ${usedPercent > 90 ? 'bg-red-500' :
                                        usedPercent > 70 ? 'bg-yellow-500' : 'bg-emerald-500'
                                    }`}
                                style={{ width: `${Math.min(usedPercent, 100)}%` }}
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4 text-center">
                        <div>
                            <p className="text-2xl font-bold text-emerald-400">+{formatCurrency(totalAdditions)}</p>
                            <p className="text-xs text-gray-500">Total Additions</p>
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-red-400">-{formatCurrency(totalWithdrawals)}</p>
                            <p className="text-xs text-gray-500">Total Withdrawals</p>
                        </div>
                        <div>
                            <p className={`text-2xl font-bold ${totalRealizedProfit >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                {formatCurrency(totalRealizedProfit)}
                            </p>
                            <p className="text-xs text-gray-500">Realized Profit</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Transactions Table */}
            <div className="bg-gray-800/50 rounded-xl border border-gray-700 overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-700">
                    <h3 className="font-medium text-white">Transaction History</h3>
                </div>
                <DataTable
                    columns={columns}
                    data={transactions}
                    keyField="id"
                    isLoading={isLoading}
                    emptyMessage="No capital transactions yet"
                />
            </div>

            {/* Add Modal */}
            {showAddModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-gray-800 rounded-xl p-6 w-full max-w-md border border-gray-700">
                        <h2 className="text-xl font-bold text-white mb-4">➕ Add Capital Transaction</h2>

                        <form onSubmit={handleAddTransaction} className="space-y-4">
                            <div>
                                <label className="block text-sm text-gray-400 mb-2">Transaction Type</label>
                                <div className="grid grid-cols-2 gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setTxType('ADD')}
                                        className={`px-4 py-2 rounded-lg font-medium transition-colors ${txType === 'ADD'
                                                ? 'bg-emerald-600 text-white'
                                                : 'bg-gray-700 text-gray-300'
                                            }`}
                                    >
                                        ➕ Add
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setTxType('WITHDRAW')}
                                        className={`px-4 py-2 rounded-lg font-medium transition-colors ${txType === 'WITHDRAW'
                                                ? 'bg-red-600 text-white'
                                                : 'bg-gray-700 text-gray-300'
                                            }`}
                                    >
                                        ➖ Withdraw
                                    </button>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm text-gray-400 mb-1">Amount (₹)</label>
                                <input
                                    type="number"
                                    value={amount}
                                    onChange={(e) => setAmount(e.target.value)}
                                    required
                                    placeholder="Enter amount"
                                    className="w-full px-3 py-2 bg-yellow-100 text-gray-900 border border-yellow-400 rounded-lg"
                                />
                            </div>

                            <div>
                                <label className="block text-sm text-gray-400 mb-1">Date</label>
                                <input
                                    type="date"
                                    value={date}
                                    onChange={(e) => setDate(e.target.value)}
                                    required
                                    className="w-full px-3 py-2 bg-yellow-100 text-gray-900 border border-yellow-400 rounded-lg"
                                />
                            </div>

                            <div>
                                <label className="block text-sm text-gray-400 mb-1">Notes (optional)</label>
                                <input
                                    type="text"
                                    value={notes}
                                    onChange={(e) => setNotes(e.target.value)}
                                    placeholder="e.g., Monthly investment"
                                    className="w-full px-3 py-2 bg-gray-700 text-white border border-gray-600 rounded-lg"
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
                                    className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors ${txType === 'ADD'
                                            ? 'bg-emerald-600 hover:bg-emerald-700'
                                            : 'bg-red-600 hover:bg-red-700'
                                        }`}
                                >
                                    {txType === 'ADD' ? 'Add Capital' : 'Withdraw'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
