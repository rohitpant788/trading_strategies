'use client';

import React from 'react';

export default function OrbScannerPage() {
    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="bg-gradient-to-r from-orange-900/30 to-red-900/30 rounded-xl p-6 border border-orange-700/50">
                <h1 className="text-2xl font-bold text-white mb-2">🔍 Multi-Script Scanner</h1>
                <p className="text-gray-300">
                    Batch backtest across multiple stocks and rank best ORB candidates
                </p>
            </div>

            {/* Coming Soon */}
            <div className="bg-gray-800 rounded-xl p-12 border border-gray-700 text-center">
                <div className="text-6xl mb-4">🔎</div>
                <h2 className="text-2xl font-bold text-white mb-2">Multi-Script Scanner Coming Soon!</h2>
                <p className="text-gray-400 mb-6">
                    Discover the best stocks for ORB strategy across NIFTY 50, Bank Nifty, and more.
                </p>
                <div className="grid grid-cols-1 gap-3 max-w-md mx-auto text-left">
                    <div className="flex items-center gap-3 bg-gray-700/50 rounded-lg p-3">
                        <span className="text-2xl">✅</span>
                        <div>
                            <p className="text-white font-semibold text-sm">Batch Backtesting</p>
                            <p className="text-xs text-gray-400">Run ORB on 50+ stocks simultaneously</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3 bg-gray-700/50 rounded-lg p-3">
                        <span className="text-2xl">📊</span>
                        <div>
                            <p className="text-white font-semibold text-sm">Smart Ranking</p>
                            <p className="text-xs text-gray-400">Rank by success rate, profit, consistency</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3 bg-gray-700/50 rounded-lg p-3">
                        <span className="text-2xl">📁</span>
                        <div>
                            <p className="text-white font-semibold text-sm">Export Results</p>
                            <p className="text-xs text-gray-400">Download as CSV for further analysis</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3 bg-gray-700/50 rounded-lg p-3">
                        <span className="text-2xl">🎯</span>
                        <div>
                            <p className="text-white font-semibold text-sm">ORB Suitability Score</p>
                            <p className="text-xs text-gray-400">ML-based scoring for best candidates</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
