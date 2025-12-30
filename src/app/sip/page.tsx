'use client';

import React, { useEffect, useState } from 'react';
import DataTable from '@/components/DataTable';
import StatCard from '@/components/StatCard';
import { ETF, SIPEntry } from '@/types';
import { formatCurrency, formatDate } from '@/lib/calculations';

export default function SIPPage() {
    const [sipEntries, setSIPEntries] = useState<SIPEntry[]>([]);
    const [etfs, setETFs] = useState<ETF[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [showAddModal, setShowAddModal] = useState(false);

    // Form state
    const [selectedETF, setSelectedETF] = useState('');
    const [amount, setAmount] = useState('');
    const [frequency, setFrequency] = useState<'WEEKLY' | 'MONTHLY'>('MONTHLY');
    const [nextDate, setNextDate] = useState('');

    useEffect(() => {
        fetchData();
        // Set default next date to next month's 1st
        const next = new Date();
        next.setMonth(next.getMonth() + 1);
        next.setDate(1);
        setNextDate(next.toISOString().split('T')[0]);
    }, []);

    const fetchData = async () => {
        try {
            setIsLoading(true);
            const [sipRes, etfsRes] = await Promise.all([
                fetch('/api/sip'),
                fetch('/api/etfs'),
            ]);

            if (sipRes.ok) {
                const sipData = await sipRes.json();
                setSIPEntries(sipData);
            }

            const etfsData = await etfsRes.json();
            setETFs(etfsData);
        } catch (error) {
            console.error('Error fetching data:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleAddSIP = async (e: React.FormEvent) => {
        e.preventDefault();

        try {
            const etf = etfs.find(e => e.symbol === selectedETF);
            if (!etf) return;

            const response = await fetch('/api/sip', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    etfId: etf.id,
                    amount: parseFloat(amount),
                    frequency,
                    nextDate,
                }),
            });

            if (response.ok) {
                setShowAddModal(false);
                setSelectedETF('');
                setAmount('');
                fetchData();
            }
        } catch (error) {
            console.error('Error adding SIP:', error);
        }
    };

    const handleToggleSIP = async (id: number, isActive: boolean) => {
        try {
            await fetch('/api/sip', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id, isActive: !isActive }),
            });
            fetchData();
        } catch (error) {
            console.error('Error toggling SIP:', error);
        }
    };

    const handleDeleteSIP = async (id: number) => {
        if (!confirm('Delete this SIP?')) return;

        try {
            await fetch(`/api/sip?id=${id}`, { method: 'DELETE' });
            fetchData();
        } catch (error) {
            console.error('Error deleting SIP:', error);
        }
    };

    // Summary calculations
    const activeSIPs = sipEntries.filter(s => s.isActive);
    const monthlyTotal = activeSIPs
        .filter(s => s.frequency === 'MONTHLY')
        .reduce((sum, s) => sum + s.amount, 0);
    const weeklyTotal = activeSIPs
        .filter(s => s.frequency === 'WEEKLY')
        .reduce((sum, s) => sum + s.amount, 0);
    const effectiveMonthly = monthlyTotal + (weeklyTotal * 4);

    // Upcoming SIPs (next 30 days)
    const today = new Date();
    const thirtyDaysLater = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);
    const upcomingSIPs = activeSIPs.filter(s => {
        const sipDate = new Date(s.nextDate);
        return sipDate >= today && sipDate <= thirtyDaysLater;
    });

    const columns = [
        {
            key: 'etfSymbol',
            header: 'ETF',
            sortable: true,
            render: (row: SIPEntry) => (
                <span className="font-medium text-white">{row.etfSymbol}</span>
            ),
        },
        {
            key: 'amount',
            header: 'Amount',
            sortable: true,
            render: (row: SIPEntry) => (
                <span className="text-emerald-400">{formatCurrency(row.amount)}</span>
            ),
        },
        {
            key: 'frequency',
            header: 'Frequency',
            render: (row: SIPEntry) => (
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${row.frequency === 'MONTHLY'
                        ? 'bg-blue-600/20 text-blue-400'
                        : 'bg-purple-600/20 text-purple-400'
                    }`}>
                    {row.frequency}
                </span>
            ),
        },
        {
            key: 'nextDate',
            header: 'Next Date',
            sortable: true,
            render: (row: SIPEntry) => (
                <span className="text-gray-300">{formatDate(row.nextDate)}</span>
            ),
        },
        {
            key: 'isActive',
            header: 'Status',
            render: (row: SIPEntry) => (
                <button
                    onClick={() => handleToggleSIP(row.id, row.isActive)}
                    className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${row.isActive
                            ? 'bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600/30'
                            : 'bg-gray-600/20 text-gray-400 hover:bg-gray-600/30'
                        }`}
                >
                    {row.isActive ? '✅ Active' : '⏸️ Paused'}
                </button>
            ),
        },
        {
            key: 'actions',
            header: 'Actions',
            render: (row: SIPEntry) => (
                <button
                    onClick={() => handleDeleteSIP(row.id)}
                    className="px-2 py-1 bg-red-600 hover:bg-red-700 rounded text-xs font-medium transition-colors"
                >
                    🗑️
                </button>
            ),
        },
    ];

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-white">📅 SIP Calendar</h1>
                    <p className="text-gray-400 text-sm">Manage your Systematic Investment Plans</p>
                </div>
                <button
                    onClick={() => setShowAddModal(true)}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 rounded-lg font-medium transition-colors flex items-center gap-2"
                >
                    ➕ Add SIP
                </button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatCard title="Active SIPs" value={activeSIPs.length} icon="🔄" variant="success" />
                <StatCard title="Monthly Investment" value={effectiveMonthly} icon="📅" isCurrency />
                <StatCard title="Upcoming (30d)" value={upcomingSIPs.length} icon="📆" />
                <StatCard title="Yearly Total" value={effectiveMonthly * 12} icon="📊" isCurrency />
            </div>

            {/* Upcoming SIPs */}
            {upcomingSIPs.length > 0 && (
                <div className="bg-gradient-to-r from-emerald-900/30 to-blue-900/30 rounded-xl p-4 border border-emerald-700/50">
                    <h3 className="text-lg font-bold text-white mb-3">🔔 Upcoming SIPs (Next 30 Days)</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        {upcomingSIPs.map((sip) => (
                            <div
                                key={sip.id}
                                className="bg-gray-800/50 rounded-lg p-3 flex items-center justify-between"
                            >
                                <div>
                                    <p className="text-white font-medium">{sip.etfSymbol}</p>
                                    <p className="text-xs text-gray-400">{formatDate(sip.nextDate)}</p>
                                </div>
                                <p className="text-emerald-400 font-bold">{formatCurrency(sip.amount)}</p>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* SIP Table */}
            <div className="bg-gray-800/50 rounded-xl border border-gray-700 overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-700">
                    <h3 className="font-medium text-white">All SIPs</h3>
                </div>
                <DataTable
                    columns={columns}
                    data={sipEntries}
                    keyField="id"
                    isLoading={isLoading}
                    emptyMessage="No SIPs configured yet. Click 'Add SIP' to get started!"
                />
            </div>

            {/* Add Modal */}
            {showAddModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-gray-800 rounded-xl p-6 w-full max-w-md border border-gray-700">
                        <h2 className="text-xl font-bold text-white mb-4">➕ Add New SIP</h2>

                        <form onSubmit={handleAddSIP} className="space-y-4">
                            <div>
                                <label className="block text-sm text-gray-400 mb-1">ETF</label>
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
                                <label className="block text-sm text-gray-400 mb-1">Amount (₹)</label>
                                <input
                                    type="number"
                                    value={amount}
                                    onChange={(e) => setAmount(e.target.value)}
                                    required
                                    placeholder="Enter SIP amount"
                                    className="w-full px-3 py-2 bg-yellow-100 text-gray-900 border border-yellow-400 rounded-lg"
                                />
                            </div>

                            <div>
                                <label className="block text-sm text-gray-400 mb-2">Frequency</label>
                                <div className="grid grid-cols-2 gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setFrequency('MONTHLY')}
                                        className={`px-4 py-2 rounded-lg font-medium transition-colors ${frequency === 'MONTHLY'
                                                ? 'bg-blue-600 text-white'
                                                : 'bg-gray-700 text-gray-300'
                                            }`}
                                    >
                                        📅 Monthly
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setFrequency('WEEKLY')}
                                        className={`px-4 py-2 rounded-lg font-medium transition-colors ${frequency === 'WEEKLY'
                                                ? 'bg-purple-600 text-white'
                                                : 'bg-gray-700 text-gray-300'
                                            }`}
                                    >
                                        📆 Weekly
                                    </button>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm text-gray-400 mb-1">Next SIP Date</label>
                                <input
                                    type="date"
                                    value={nextDate}
                                    onChange={(e) => setNextDate(e.target.value)}
                                    required
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
                                    Add SIP
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
