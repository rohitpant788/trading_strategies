'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import StatCard from '@/components/StatCard';
import { useOrbStore } from '@/store/orbStore';
import { StrategyConfig, Direction, ConfirmationType } from '@/types/orb';

// Strategy steps for ORB
const orbStrategySteps = [
    {
        step: 1,
        title: 'Identify Opening Range',
        description: 'Mark the High and Low of the first 15-minute candle (9:15-9:30 AM)',
        icon: '📍',
    },
    {
        step: 2,
        title: 'Wait for Breakout',
        description: 'Monitor price for breakout above ORB High',
        icon: '⏱️',
    },
    {
        step: 3,
        title: 'Enter Long',
        description: 'Buy immediately when price breaks above ORB High',
        icon: '🎯',
    },
    {
        step: 4,
        title: 'Set Target',
        description: 'Fixed ₹1 profit target or percentage-based',
        icon: '🎁',
    },
    {
        step: 5,
        title: 'Adaptive Stop Loss',
        description: 'SL = ORB Low (if small candle) OR Fixed ₹7-8 (if big candle)',
        icon: '🛡️',
    },
    {
        step: 6,
        title: 'Exit & Repeat',
        description: 'Exit at target/SL/EOD (3:15 PM)',
        icon: '✅',
    },
];

export default function OrbConfigPage() {
    const router = useRouter();
    const { runBacktest, isBacktesting, error, config: storedConfig, setConfig: setStoreConfig } = useOrbStore();

    const [config, setConfig] = useState<StrategyConfig>(
        storedConfig || {
            selectedSymbols: ['ICICIBANK'],
            timeframe: 15,
            startDate: '2024-01-01',
            endDate: '2024-12-31',
            direction: 'LONG',
            confirmationType: 'IMMEDIATE',
            maxTradesPerDay: 1,
            targetType: 'FIXED_AMOUNT',
            targetValue: 1,
            slType: 'ADAPTIVE',
            slFixedAmount: 7,
            slBigCandleThreshold: 10,
            eodSquareOffTime: '15:15',
            trailingSL: false,
            slippagePercent: 0.1,
            startingCapital: 100000,
            capitalAllocationPercent: 100,
        }
    );

    // Sync config changes to store for persistence
    useEffect(() => {
        setStoreConfig(config);
    }, [config, setStoreConfig]);

    const [availableSymbols] = useState([
        'ICICIBANK',
        'HDFCBANK',
        'SBIN',
        'AXISBANK',
        'KOTAKBANK',
        'RELIANCE',
        'TCS',
        'INFY',
        'TATAMOTORS',
        'BAJFINANCE',
    ]);

    const handleRunBacktest = async () => {
        if (config.selectedSymbols.length === 0) {
            alert('Please select at least one script');
            return;
        }

        await runBacktest(config);

        // Navigate to results page
        router.push('/orb/results');
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-900/30 to-purple-900/30 rounded-xl p-6 border border-blue-700/50">
                <h1 className="text-2xl font-bold text-white mb-2">🎯 ORB Tester - Strategy Configuration</h1>
                <p className="text-gray-300">
                    15-Minute Opening Range Breakout with <strong className="text-blue-400">adaptive</strong> stop loss logic
                </p>
            </div>

            {/* Quick Stats */}
            <section>
                <h2 className="text-xl font-bold text-white mb-4">📊 Strategy Overview</h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <StatCard
                        title="Scripts Selected"
                        value={config.selectedSymbols.length}
                        icon="📈"
                        variant="info"
                    />
                    <StatCard
                        title="Timeframe"
                        value={`${config.timeframe}m`}
                        icon="⏱️"
                        variant="success"
                    />
                    <StatCard
                        title="Target"
                        value={config.targetValue}
                        icon="🎯"
                        isCurrency={config.targetType === 'FIXED_AMOUNT'}
                        subtitle={config.targetType === 'PERCENTAGE' ? '%' : '₹'}
                    />
                    <StatCard
                        title="SL Type"
                        value={config.slType === 'ADAPTIVE' ? 'Adaptive' : 'Fixed'}
                        icon="🛡️"
                        variant="info"
                    />
                </div>
            </section>

            {/* Configuration Form */}
            <section className="bg-gray-800 rounded-xl p-6 border border-gray-700">
                <h2 className="text-xl font-bold text-white mb-4">⚙️ Backtest Configuration</h2>

                {/* Stock Selection */}
                <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                        Select Scripts (Multiple Selection)
                    </label>
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                        {availableSymbols.map((symbol) => (
                            <button
                                key={symbol}
                                onClick={() => {
                                    if (config.selectedSymbols.includes(symbol)) {
                                        setConfig({ ...config, selectedSymbols: config.selectedSymbols.filter(s => s !== symbol) });
                                    } else {
                                        setConfig({ ...config, selectedSymbols: [...config.selectedSymbols, symbol] });
                                    }
                                }}
                                className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${config.selectedSymbols.includes(symbol)
                                    ? 'bg-emerald-600 text-white'
                                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                                    }`}
                            >
                                {symbol}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Date Range */}
                <div className="grid grid-cols-2 gap-4 mb-6">
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">Start Date</label>
                        <input
                            type="date"
                            value={config.startDate}
                            onChange={(e) => setConfig({ ...config, startDate: e.target.value })}
                            className="w-full px-3 py-2 rounded-lg bg-gray-700 text-white border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">End Date</label>
                        <input
                            type="date"
                            value={config.endDate}
                            onChange={(e) => setConfig({ ...config, endDate: e.target.value })}
                            className="w-full px-3 py-2 rounded-lg bg-gray-700 text-white border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
                </div>

                {/* Target Configuration */}
                <div className="grid grid-cols-3 gap-4 mb-6">
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">Target Type</label>
                        <select
                            value={config.targetType}
                            onChange={(e) => setConfig({ ...config, targetType: e.target.value as any })}
                            className="w-full px-3 py-2 rounded-lg bg-gray-700 text-white border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="FIXED_AMOUNT">Fixed ₹</option>
                            <option value="PERCENTAGE">Percentage %</option>
                            <option value="ATR">ATR Multiple</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">Target Value</label>
                        <input
                            type="number"
                            step="0.1"
                            value={config.targetValue}
                            onChange={(e) => setConfig({ ...config, targetValue: parseFloat(e.target.value) })}
                            className="w-full px-3 py-2 rounded-lg bg-gray-700 text-white border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
                </div>

                {/* Entry Rules */}
                <div className="grid grid-cols-2 gap-4 mb-6">
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">Direction</label>
                        <select
                            value={config.direction}
                            onChange={(e) => setConfig({ ...config, direction: e.target.value as Direction })}
                            className="w-full px-3 py-2 rounded-lg bg-gray-700 text-white border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="LONG">Long Only</option>
                            <option value="SHORT">Short Only</option>
                            <option value="BOTH">Both (Long & Short)</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">Confirmation</label>
                        <select
                            value={config.confirmationType}
                            onChange={(e) => setConfig({ ...config, confirmationType: e.target.value as ConfirmationType })}
                            className="w-full px-3 py-2 rounded-lg bg-gray-700 text-white border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="IMMEDIATE">Immediate (Breakout)</option>
                            <option value="CANDLE_CLOSE">On Candle Close</option>
                        </select>
                    </div>
                </div>

                {/* Max Trades Per Day */}
                <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                        Max Trades Per Day
                    </label>
                    <input
                        type="number"
                        min="1"
                        max="10"
                        value={config.maxTradesPerDay}
                        onChange={(e) => setConfig({ ...config, maxTradesPerDay: parseInt(e.target.value) })}
                        className="w-full px-3 py-2 rounded-lg bg-gray-700 text-white border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                        Limit number of trades per day (1 = only first breakout)
                    </p>
                </div>

                {/* Stop Loss Configuration */}
                <div className="grid grid-cols-3 gap-4 mb-6">
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">SL Type</label>
                        <select
                            value={config.slType}
                            onChange={(e) => setConfig({ ...config, slType: e.target.value as any })}
                            className="w-full px-3 py-2 rounded-lg bg-gray-700 text-white border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="ORB_LOW">ORB Low</option>
                            <option value="FIXED_AMOUNT">Fixed ₹</option>
                            <option value="ADAPTIVE">Adaptive (Recommended)</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">Fixed SL (₹)</label>
                        <input
                            type="number"
                            step="0.5"
                            value={config.slFixedAmount}
                            onChange={(e) => setConfig({ ...config, slFixedAmount: parseFloat(e.target.value) })}
                            disabled={config.slType === 'ORB_LOW'}
                            className="w-full px-3 py-2 rounded-lg bg-gray-700 text-white border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">Big Candle Threshold (₹)</label>
                        <input
                            type="number"
                            step="1"
                            value={config.slBigCandleThreshold}
                            onChange={(e) => setConfig({ ...config, slBigCandleThreshold: parseFloat(e.target.value) })}
                            disabled={config.slType !== 'ADAPTIVE'}
                            className="w-full px-3 py-2 rounded-lg bg-gray-700 text-white border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                        />
                    </div>
                </div>

                {/* Exit Rules */}
                <div className="grid grid-cols-2 gap-4 mb-6">
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">EOD Square-off Time</label>
                        <input
                            type="time"
                            value={config.eodSquareOffTime}
                            onChange={(e) => setConfig({ ...config, eodSquareOffTime: e.target.value })}
                            className="w-full px-3 py-2 rounded-lg bg-gray-700 text-white border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
                    <div className="flex items-end">
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={config.trailingSL}
                                onChange={(e) => setConfig({ ...config, trailingSL: e.target.checked })}
                                className="w-5 h-5 rounded bg-gray-700 border-gray-600 text-blue-600 focus:ring-2 focus:ring-blue-500"
                            />
                            <span className="text-sm text-gray-300">Enable Trailing SL</span>
                        </label>
                    </div>
                </div>

                {/* Slippage & Capital */}
                <div className="border-t border-gray-700 pt-6 mb-6">
                    <h3 className="text-md font-semibold text-white mb-3">💰 Capital & Slippage</h3>
                    <div className="grid grid-cols-3 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">
                                Starting Capital (₹)
                            </label>
                            <input
                                type="number"
                                step="10000"
                                value={config.startingCapital}
                                onChange={(e) => setConfig({ ...config, startingCapital: parseFloat(e.target.value) })}
                                className="w-full px-3 py-2 rounded-lg bg-gray-700 text-white border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                            <p className="text-xs text-gray-500 mt-1">
                                Initial capital for portfolio tracking
                            </p>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">
                                Capital per Trade (%)
                            </label>
                            <input
                                type="number"
                                step="5"
                                min="1"
                                max="100"
                                value={config.capitalAllocationPercent}
                                onChange={(e) => setConfig({ ...config, capitalAllocationPercent: parseFloat(e.target.value) })}
                                className="w-full px-3 py-2 rounded-lg bg-gray-700 text-white border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                            <p className="text-xs text-gray-500 mt-1">
                                % of capital to use (100 = full capital)
                            </p>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">
                                Slippage (%)
                            </label>
                            <input
                                type="number"
                                step="0.05"
                                min="0"
                                max="1"
                                value={config.slippagePercent}
                                onChange={(e) => setConfig({ ...config, slippagePercent: parseFloat(e.target.value) })}
                                className="w-full px-3 py-2 rounded-lg bg-gray-700 text-white border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                            <p className="text-xs text-gray-500 mt-1">
                                Entry slippage for fast-moving candles
                            </p>
                        </div>
                    </div>
                </div>

                {/* Error Message */}
                {error && (
                    <div className="mb-4 bg-red-900/20 border border-red-700/50 rounded-lg p-3">
                        <p className="text-red-400 text-sm">❌ Error: {error}</p>
                    </div>
                )}

                {/* Run Backtest Button */}
                <button
                    onClick={handleRunBacktest}
                    disabled={isBacktesting || config.selectedSymbols.length === 0}
                    className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-bold py-3 px-6 rounded-lg transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center gap-2"
                >
                    {isBacktesting ? (
                        <>
                            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            <span>Running Backtest...</span>
                        </>
                    ) : (
                        <>
                            <span>🚀</span>
                            <span>Run Backtest</span>
                        </>
                    )}
                </button>
            </section>

            {/* Strategy Steps */}
            <section>
                <h2 className="text-xl font-bold text-white mb-4">📋 ORB Strategy Rules</h2>
                <div className="grid gap-4">
                    {orbStrategySteps.map((step) => (
                        <div
                            key={step.step}
                            className="flex items-start gap-4 bg-gray-800/50 rounded-xl p-4 border border-gray-700 hover:border-blue-600/50 transition-colors"
                        >
                            <div className="flex-shrink-0 w-10 h-10 bg-blue-600/20 rounded-full flex items-center justify-center text-xl">
                                {step.icon}
                            </div>
                            <div>
                                <div className="flex items-center gap-2">
                                    <span className="text-blue-400 font-medium">Step {step.step}</span>
                                    <h3 className="text-white font-semibold">{step.title}</h3>
                                </div>
                                <p className="text-gray-400 text-sm mt-1">{step.description}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            {/* Key Info */}
            <section className="bg-blue-900/20 border border-blue-700/50 rounded-xl p-6">
                <h3 className="text-lg font-bold text-white mb-3">💡 Strategy Highlights</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div className="bg-gray-800/50 rounded-lg p-3">
                        <p className="text-gray-400">Success Rate (Manual Testing)</p>
                        <p className="text-emerald-400 font-bold text-lg">~95%</p>
                        <p className="text-xs text-gray-500">On ICICI Bank</p>
                    </div>
                    <div className="bg-gray-800/50 rounded-lg p-3">
                        <p className="text-gray-400">Risk-Reward Ratio</p>
                        <p className="text-yellow-400 font-bold text-lg">Asymmetric</p>
                        <p className="text-xs text-gray-500">Small target, large SL (drawback)</p>
                    </div>
                    <div className="bg-gray-800/50 rounded-lg p-3">
                        <p className="text-gray-400">Best Used On</p>
                        <p className="text-blue-400 font-bold">High-Liquidity Stocks</p>
                        <p className="text-xs text-gray-500">Bank Nifty components ideal</p>
                    </div>
                    <div className="bg-gray-800/50 rounded-lg p-3">
                        <p className="text-gray-400">Data Source</p>
                        <p className="text-purple-400 font-bold">Yahoo Finance / CSV</p>
                        <p className="text-xs text-gray-500">NSE minute data recommended</p>
                    </div>
                </div>
            </section>
        </div>
    );
}
