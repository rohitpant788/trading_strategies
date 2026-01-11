
'use client';

import React, { useState } from 'react';
import { WeeklyStrategyConfig, WeeklyTrade } from '@/lib/weekly-close/types';
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
    ReferenceLine,
    AreaChart,
    Area
} from 'recharts';

const SUPPORTED_INDICES = [
    { label: 'Bitcoin (BTC-USD)', value: 'BTC-USD' },
    { label: 'Ethereum (ETH-USD)', value: 'ETH-USD' },
    { label: 'Nifty 50 (^NSEI)', value: '^NSEI' },
    { label: 'Nifty Bank (^NSEBANK)', value: '^NSEBANK' },
    { label: 'S&P 500 (^GSPC)', value: '^GSPC' },
    { label: 'Custom...', value: 'CUSTOM' }
];

export default function WeeklyStrategyPage() {
    const [config, setConfig] = useState<WeeklyStrategyConfig>({
        symbol: '^NSEI', // Default to Nifty 50
        startDate: '2020-01-01',
        endDate: '2024-12-31',
        targetPercent: 6.0,
        initialCapital: 100000,
        allocationPerTrade: 10000,
        mode: 'SIP',
        weeklyDeposit: 10000,
        allocationDivisor: 10
    });

    const [isCustomSymbol, setIsCustomSymbol] = useState(false);
    const [file, setFile] = useState<File | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [result, setResult] = useState<any>(null);
    const [error, setError] = useState<string | null>(null);

    React.useEffect(() => {
        const isKnown = SUPPORTED_INDICES.some(i => i.value === config.symbol);
        setIsCustomSymbol(!isKnown && config.symbol !== '');
    }, []);

    const handleSymbolChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        if (e.target.value === 'CUSTOM') {
            setIsCustomSymbol(true);
            setConfig({ ...config, symbol: '' });
        } else {
            setIsCustomSymbol(false);
            setConfig({ ...config, symbol: e.target.value });
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            setFile(e.target.files[0]);
        }
    };

    const handleRunBacktest = async () => {
        setIsLoading(true);
        setError(null);
        setResult(null);

        try {
            let csvContent = null;
            if (file) {
                csvContent = await file.text();
            }

            const response = await fetch('/api/weekly-strategy/backtest', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ config, csvContent })
            });

            const data = await response.json();

            if (!data.success) {
                throw new Error(data.error || 'Backtest failed');
            }

            setResult(data.result);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An error occurred');
        } finally {
            setIsLoading(false);
        }
    };

    const currentSelectValue = isCustomSymbol ? 'CUSTOM' : (SUPPORTED_INDICES.some(i => i.value === config.symbol) ? config.symbol : 'CUSTOM');

    return (
        <div className="p-6 space-y-6">
            <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-pink-500 bg-clip-text text-transparent">
                Weekly SIP Strategy Comparison
            </h1>

            {/* Configuration Panel */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6 bg-gray-900/50 rounded-xl border border-gray-800">
                <div className="space-y-4">
                    <h2 className="text-xl font-semibold mb-4">Configuration</h2>

                    <div>
                        <label className="block text-sm text-gray-400 mb-1">Symbol / Index</label>
                        {!isCustomSymbol ? (
                            <select
                                value={currentSelectValue}
                                onChange={handleSymbolChange}
                                className="w-full bg-gray-800 border border-gray-700 rounded p-2 text-white"
                            >
                                {SUPPORTED_INDICES.map(idx => (
                                    <option key={idx.value} value={idx.value}>{idx.label}</option>
                                ))}
                            </select>
                        ) : (
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={config.symbol}
                                    onChange={(e) => setConfig({ ...config, symbol: e.target.value })}
                                    className="w-full bg-gray-800 border border-gray-700 rounded p-2"
                                    placeholder="Enter symbol"
                                    autoFocus
                                />
                                <button
                                    onClick={() => { setIsCustomSymbol(false); setConfig({ ...config, symbol: '^NSEI' }); }}
                                    className="px-3 bg-gray-700 hover:bg-gray-600 rounded text-sm"
                                >Cancel</button>
                            </div>
                        )}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm text-gray-400 mb-1">Start Date</label>
                            <input type="date" value={config.startDate} onChange={(e) => setConfig({ ...config, startDate: e.target.value })} className="w-full bg-gray-800 border border-gray-700 rounded p-2" />
                        </div>
                        <div>
                            <label className="block text-sm text-gray-400 mb-1">End Date</label>
                            <input type="date" value={config.endDate} onChange={(e) => setConfig({ ...config, endDate: e.target.value })} className="w-full bg-gray-800 border border-gray-700 rounded p-2" />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="col-span-2">
                            <label className="block text-sm text-purple-300 mb-1">Initial Capital</label>
                            <input type="number" value={config.initialCapital} onChange={(e) => setConfig({ ...config, initialCapital: parseFloat(e.target.value) })} className="w-full bg-gray-800 border border-purple-500/50 rounded p-2" placeholder="e.g. 100000" />
                        </div>
                        <div>
                            <label className="block text-sm text-purple-300 mb-1">Weekly Deposit</label>
                            <input type="number" value={config.weeklyDeposit} onChange={(e) => setConfig({ ...config, weeklyDeposit: parseFloat(e.target.value) })} className="w-full bg-gray-800 border border-purple-500/50 rounded p-2" />
                        </div>
                        <div>
                            <label className="block text-sm text-purple-300 mb-1">Dynamic Divisor</label>
                            <input type="number" value={config.allocationDivisor} onChange={(e) => setConfig({ ...config, allocationDivisor: parseFloat(e.target.value) })} className="w-full bg-gray-800 border border-purple-500/50 rounded p-2" placeholder="e.g. 10" />
                            <p className="text-[10px] text-gray-500 mt-1">Invest TotalVal / {config.allocationDivisor} (when ≥₹1L)</p>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm text-gray-400 mb-1">Target Profit (%)</label>
                        <input type="number" value={config.targetPercent} onChange={(e) => setConfig({ ...config, targetPercent: parseFloat(e.target.value) })} className="w-full bg-gray-800 border border-gray-700 rounded p-2" />
                    </div>
                </div>

                <div className="space-y-4">
                    <h2 className="text-xl font-semibold mb-4">Data Source</h2>
                    <div className="p-4 bg-gray-800 rounded-lg border border-gray-700">
                        <label className="block text-sm text-gray-300 mb-2">Upload CSV (Optional)</label>
                        <p className="text-xs text-gray-500 mb-3">Upload daily OHLC data. Columns: Date, Open, High, Low, Close.</p>
                        <input type="file" accept=".csv" onChange={handleFileChange} className="w-full text-sm text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-600 file:text-white hover:file:bg-blue-700" />
                    </div>

                    <button onClick={handleRunBacktest} disabled={isLoading} className={`w-full py-3 rounded-lg font-bold text-lg transition-all ${isLoading ? 'bg-gray-700 text-gray-500 cursor-not-allowed' : 'bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 text-white shadow-lg shadow-purple-900/20'}`}>
                        {isLoading ? 'Running Comparison...' : 'Run Strategy Comparison'}
                    </button>
                    {error && <div className="p-3 bg-red-900/30 border border-red-800 rounded text-red-200 text-sm">{error}</div>}
                </div>
            </div>

            {/* Results Section */}
            {result && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">

                    {/* Performance Comparison Cards */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <MetricCard label="Strategy 1: Final Value" value={`₹${result.metrics?.finalCapital?.toLocaleString() || 0}`} color="text-green-400" />
                        <MetricCard label="Strategy 2: Final Value" value={`₹${result.equityCurve?.[result.equityCurve.length - 1]?.buyAndHoldValue?.toLocaleString() || 0}`} color="text-gray-400" />
                        <MetricCard label="Total Trades" value={result.metrics?.totalTrades || 0} />
                        <MetricCard label="Win Rate" value={`${result.metrics?.winRate?.toFixed(2) || 0}%`} color={result.metrics?.winRate > 50 ? 'text-green-400' : 'text-red-400'} />
                    </div>

                    {/* Equity Curve Comparison */}
                    <div className="bg-gray-900/50 rounded-xl border border-gray-800 p-6">
                        <h3 className="text-lg font-semibold mb-4 text-emerald-400">Equity Curve: Strategy 1 vs Strategy 2</h3>
                        <div className="h-[350px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={result.equityCurve}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                                    <XAxis dataKey="date" stroke="#9CA3AF" tickFormatter={(val) => { const d = new Date(val); return `${d.getMonth() + 1}/${d.getFullYear().toString().substring(2)}`; }} minTickGap={30} />
                                    <YAxis stroke="#9CA3AF" domain={['auto', 'auto']} tickFormatter={(val) => `₹${(val / 1000).toFixed(0)}k`} />
                                    <Tooltip contentStyle={{ backgroundColor: '#1F2937', borderColor: '#4B5563' }} formatter={(value: any) => `₹${Number(value).toLocaleString()}`} labelFormatter={(label) => new Date(label).toLocaleDateString()} />
                                    <Legend />
                                    <Line type="monotone" dataKey="value" name="Strategy 1 (Trend-Filtered)" stroke="#10B981" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
                                    <Line type="monotone" dataKey="buyAndHoldValue" name="Strategy 2 (Blind SIP)" stroke="#6B7280" strokeWidth={2} strokeDasharray="5 5" dot={false} />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Capital Deployment Chart */}
                    <div className="bg-gray-900/50 rounded-xl border border-gray-800 p-6">
                        <h3 className="text-lg font-semibold mb-4 text-blue-400">Capital Deployment: Deployed vs Idle Cash</h3>
                        <div className="h-[250px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={result.equityCurve}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                                    <XAxis dataKey="date" stroke="#9CA3AF" tickFormatter={(val) => { const d = new Date(val); return `${d.getMonth() + 1}/${d.getFullYear().toString().substring(2)}`; }} minTickGap={50} />
                                    <YAxis stroke="#9CA3AF" tickFormatter={(val) => `₹${(val / 1000).toFixed(0)}k`} />
                                    <Tooltip contentStyle={{ backgroundColor: '#1F2937', borderColor: '#4B5563' }} formatter={(value: any) => `₹${Number(value).toLocaleString()}`} />
                                    <Legend />
                                    <Area type="monotone" dataKey="deployedValue" name="Deployed (Holdings)" stackId="1" stroke="#8B5CF6" fill="#8B5CF6" fillOpacity={0.6} />
                                    <Area type="monotone" dataKey="dematCash" name="Idle Cash" stackId="1" stroke="#6B7280" fill="#6B7280" fillOpacity={0.3} />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Trade Log */}
                    <div className="bg-gray-900/50 rounded-xl border border-gray-800 overflow-hidden">
                        <div className="p-4 border-b border-gray-800"><h3 className="text-lg font-semibold">Strategy 1: Trade Log</h3></div>
                        <div className="overflow-x-auto max-h-[400px]">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-gray-800/50 text-gray-400 sticky top-0">
                                    <tr>
                                        <th className="p-3">ID</th><th className="p-3">Entry Date</th><th className="p-3">Entry Price</th><th className="p-3">Exit Date</th><th className="p-3">Exit Price</th><th className="p-3">Profit</th><th className="p-3">Reason</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-800">
                                    {result.trades.map((trade: WeeklyTrade) => (
                                        <tr key={trade.id} className="hover:bg-gray-800/30">
                                            <td className="p-3 text-gray-500">#{trade.id}</td>
                                            <td className="p-3">{new Date(trade.entryDate).toLocaleDateString()}</td>
                                            <td className="p-3 font-mono">{trade.entryPrice.toFixed(2)}</td>
                                            <td className="p-3">{trade.exitDate ? new Date(trade.exitDate).toLocaleDateString() : '-'}</td>
                                            <td className="p-3 font-mono">{trade.exitPrice?.toFixed(2) || '-'}</td>
                                            <td className={`p-3 font-mono font-bold ${(trade.profit || 0) > 0 ? 'text-green-400' : 'text-red-400'}`}>{trade.profit?.toFixed(2) || '-'}</td>
                                            <td className="p-3"><span className={`px-2 py-1 rounded-full text-xs ${trade.exitReason === 'TARGET' ? 'bg-green-900/30 text-green-300' : 'bg-gray-800 text-gray-400'}`}>{trade.exitReason || 'OPEN'}</span></td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

function MetricCard({ label, value, color = 'text-white' }: { label: string, value: string | number, color?: string }) {
    return (
        <div className="bg-gray-900/50 p-4 rounded-xl border border-gray-800">
            <p className="text-sm text-gray-500 mb-1">{label}</p>
            <p className={`text-2xl font-bold ${color}`}>{value}</p>
        </div>
    );
}
