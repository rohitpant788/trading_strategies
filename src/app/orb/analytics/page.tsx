'use client';

import React from 'react';

export default function OrbAnalyticsPage() {
    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="bg-gradient-to-r from-purple-900/30 to-pink-900/30 rounded-xl p-6 border border-purple-700/50">
                <h1 className="text-2xl font-bold text-white mb-2">📈 Analytics Dashboard</h1>
                <p className="text-gray-300">
                    Deep dive into performance patterns and distributions
                </p>
            </div>

            {/* Coming Soon */}
            <div className="bg-gray-800 rounded-xl p-12 border border-gray-700 text-center">
                <div className="text-6xl mb-4">📊</div>
                <h2 className="text-2xl font-bold text-white mb-2">Advanced Analytics Coming Soon!</h2>
                <p className="text-gray-400 mb-6">
                    This page will feature:
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl mx-auto text-left">
                    <div className="bg-gray-700/50 rounded-lg p-4">
                        <p className="text-emerald-400 font-bold mb-1">📊 Distribution Charts</p>
                        <p className="text-sm text-gray-400">Win/loss histogram, SL size vs success rate</p>
                    </div>
                    <div className="bg-gray-700/50 rounded-lg p-4">
                        <p className="text-blue-400 font-bold mb-1">🗓️ Time Analysis</p>
                        <p className="text-sm text-gray-400">Day-of-week heatmap, hourly patterns</p>
                    </div>
                    <div className="bg-gray-700/50 rounded-lg p-4">
                        <p className="text-purple-400 font-bold mb-1">📉 Drawdown Analysis</p>
                        <p className="text-sm text-gray-400">Underwater equity curve, recovery periods</p>
                    </div>
                    <div className="bg-gray-700/50 rounded-lg p-4">
                        <p className="text-yellow-400 font-bold mb-1">🔗 Correlation Matrix</p>
                        <p className="text-sm text-gray-400">Multi-script correlation (for batch tests)</p>
                    </div>
                </div>
            </div>
        </div>
    );
}
