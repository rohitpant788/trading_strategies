'use client';

import React, { useEffect, useState } from 'react';
import StatCard from '@/components/StatCard';
import { Settings, CapitalSummary } from '@/types';

interface ShopSettings extends Settings {
  minVolume?: number;
  averagingThreshold?: number;
  maxDailyBuys?: number;
  maxDailySells?: number;
}

// ETF Shop 3.0 Strategy Steps
const strategySteps = [
  {
    step: 1,
    title: 'Rank by 20 DMA',
    description: 'ETFs ranked by distance below 20-day moving average (most negative = best buy)',
    icon: '📊',
  },
  {
    step: 2,
    title: 'Buy Top Ranked',
    description: 'Buy from top 5 ranked ETFs that you don\'t already own',
    icon: '🎯',
  },
  {
    step: 3,
    title: 'Max 1 Buy/Day',
    description: 'Only 1 new ETF purchase allowed per trading day',
    icon: '📅',
  },
  {
    step: 4,
    title: 'Average Down (2.5%)',
    description: 'If already holding, buy more only if price fell 2.5% from last purchase',
    icon: '📉',
  },
  {
    step: 5,
    title: 'LIFO Selling',
    description: 'Sell most recent purchases first (Last-In-First-Out) at 3% profit',
    icon: '🔄',
  },
  {
    step: 6,
    title: 'Max 1 Sell/Day',
    description: 'Only 1 sell transaction allowed per trading day',
    icon: '✅',
  },
];

export default function StrategyPage() {
  const [settings, setSettings] = useState<ShopSettings>({
    profitTargetPercent: 3,
    minProfitAmount: 300,
    perTransactionAmount: 10000,
    totalCapital: 500000,
    minVolume: 15000,
    averagingThreshold: 2.5,
    maxDailyBuys: 1,
    maxDailySells: 1,
  });

  const [capitalSummary, setCapitalSummary] = useState<CapitalSummary>({
    totalCapital: 500000,
    totalInvested: 0,
    availableCapital: 500000,
    usedPercent: 0,
    totalRealizedProfit: 0,
    totalNotionalPL: 0,
  });

  const [editMode, setEditMode] = useState(false);
  const [tempSettings, setTempSettings] = useState(settings);

  useEffect(() => {
    Promise.all([
      fetch('/api/settings').then(r => r.json()),
      fetch('/api/holdings').then(r => r.json()),
      fetch('/api/trades').then(r => r.json()),
    ]).then(([settingsData, holdings, trades]) => {
      const fullSettings = { ...settings, ...settingsData };
      setSettings(fullSettings);
      setTempSettings(fullSettings);

      const totalInvested = holdings.reduce(
        (sum: number, h: { buyPrice: number; quantity: number }) =>
          sum + h.buyPrice * h.quantity,
        0
      );
      const totalRealizedProfit = trades.reduce(
        (sum: number, t: { profit: number }) => sum + t.profit,
        0
      );

      setCapitalSummary({
        totalCapital: settingsData.totalCapital,
        totalInvested,
        availableCapital: settingsData.totalCapital - totalInvested + totalRealizedProfit,
        usedPercent: settingsData.totalCapital > 0
          ? (totalInvested / settingsData.totalCapital) * 100
          : 0,
        totalRealizedProfit,
        totalNotionalPL: 0,
      });
    }).catch(console.error);
  }, []);

  const handleSaveSettings = async () => {
    try {
      const response = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(tempSettings),
      });
      const updated = await response.json();
      setSettings({ ...settings, ...updated });
      setEditMode(false);
    } catch (error) {
      console.error('Failed to save settings:', error);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-emerald-900/30 to-blue-900/30 rounded-xl p-6 border border-emerald-700/50">
        <h1 className="text-2xl font-bold text-white mb-2">📊 ETF Shop 3.0 Strategy</h1>
        <p className="text-gray-300">
          20-Day Moving Average (DMA) ranking with <strong className="text-emerald-400">LIFO</strong> selling logic
        </p>
      </div>

      {/* Capital Overview */}
      <section>
        <h2 className="text-xl font-bold text-white mb-4">💰 Capital Overview</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard
            title="Total Capital"
            value={capitalSummary.totalCapital}
            icon="💵"
            isCurrency
            variant="info"
          />
          <StatCard
            title="Invested"
            value={capitalSummary.totalInvested}
            icon="📊"
            isCurrency
            subtitle={`${capitalSummary.usedPercent.toFixed(1)}% used`}
          />
          <StatCard
            title="Available"
            value={capitalSummary.availableCapital}
            icon="🏦"
            isCurrency
            variant="success"
          />
          <StatCard
            title="Realized P&L"
            value={capitalSummary.totalRealizedProfit}
            icon="✅"
            isCurrency
            variant={capitalSummary.totalRealizedProfit >= 0 ? 'success' : 'danger'}
          />
        </div>
      </section>

      {/* Settings */}
      <section className="bg-gray-800 rounded-xl p-6 border border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-white">⚙️ Settings (ETF Shop 3.0)</h2>
          <button
            onClick={() => editMode ? handleSaveSettings() : setEditMode(true)}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${editMode
              ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
              : 'bg-gray-700 hover:bg-gray-600 text-gray-200'
              }`}
          >
            {editMode ? 'Save' : 'Edit'}
          </button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm text-gray-400 mb-1">Profit Target %</label>
            <input
              type="number"
              step="0.1"
              value={editMode ? tempSettings.profitTargetPercent : settings.profitTargetPercent}
              onChange={(e) => setTempSettings({ ...tempSettings, profitTargetPercent: parseFloat(e.target.value) })}
              disabled={!editMode}
              className={`w-full px-3 py-2 rounded-lg border ${editMode
                ? 'bg-yellow-100 text-gray-900 border-yellow-400'
                : 'bg-gray-700 text-white border-gray-600'
                }`}
            />
            <p className="text-xs text-gray-500 mt-1">LIFO: 3%</p>
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">Averaging Threshold %</label>
            <input
              type="number"
              step="0.5"
              value={editMode ? tempSettings.averagingThreshold : settings.averagingThreshold}
              onChange={(e) => setTempSettings({ ...tempSettings, averagingThreshold: parseFloat(e.target.value) })}
              disabled={!editMode}
              className={`w-full px-3 py-2 rounded-lg border ${editMode
                ? 'bg-yellow-100 text-gray-900 border-yellow-400'
                : 'bg-gray-700 text-white border-gray-600'
                }`}
            />
            <p className="text-xs text-gray-500 mt-1">Buy more if fell 2.5%</p>
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">Max Daily Buys</label>
            <input
              type="number"
              value={editMode ? tempSettings.maxDailyBuys : settings.maxDailyBuys}
              onChange={(e) => setTempSettings({ ...tempSettings, maxDailyBuys: parseInt(e.target.value) })}
              disabled={!editMode}
              className={`w-full px-3 py-2 rounded-lg border ${editMode
                ? 'bg-yellow-100 text-gray-900 border-yellow-400'
                : 'bg-gray-700 text-white border-gray-600'
                }`}
            />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">Max Daily Sells</label>
            <input
              type="number"
              value={editMode ? tempSettings.maxDailySells : settings.maxDailySells}
              onChange={(e) => setTempSettings({ ...tempSettings, maxDailySells: parseInt(e.target.value) })}
              disabled={!editMode}
              className={`w-full px-3 py-2 rounded-lg border ${editMode
                ? 'bg-yellow-100 text-gray-900 border-yellow-400'
                : 'bg-gray-700 text-white border-gray-600'
                }`}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
          <div>
            <label className="block text-sm text-gray-400 mb-1">Total Capital ₹</label>
            <input
              type="number"
              value={editMode ? tempSettings.totalCapital : settings.totalCapital}
              onChange={(e) => setTempSettings({ ...tempSettings, totalCapital: parseFloat(e.target.value) })}
              disabled={!editMode}
              className={`w-full px-3 py-2 rounded-lg border ${editMode
                ? 'bg-yellow-100 text-gray-900 border-yellow-400'
                : 'bg-gray-700 text-white border-gray-600'
                }`}
            />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">Per Transaction ₹</label>
            <input
              type="number"
              value={editMode ? tempSettings.perTransactionAmount : settings.perTransactionAmount}
              onChange={(e) => setTempSettings({ ...tempSettings, perTransactionAmount: parseFloat(e.target.value) })}
              disabled={!editMode}
              className={`w-full px-3 py-2 rounded-lg border ${editMode
                ? 'bg-yellow-100 text-gray-900 border-yellow-400'
                : 'bg-gray-700 text-white border-gray-600'
                }`}
            />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">Min Volume</label>
            <input
              type="number"
              value={editMode ? tempSettings.minVolume : settings.minVolume}
              onChange={(e) => setTempSettings({ ...tempSettings, minVolume: parseInt(e.target.value) })}
              disabled={!editMode}
              className={`w-full px-3 py-2 rounded-lg border ${editMode
                ? 'bg-yellow-100 text-gray-900 border-yellow-400'
                : 'bg-gray-700 text-white border-gray-600'
                }`}
            />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">Min Profit ₹</label>
            <input
              type="number"
              value={editMode ? tempSettings.minProfitAmount : settings.minProfitAmount}
              onChange={(e) => setTempSettings({ ...tempSettings, minProfitAmount: parseFloat(e.target.value) })}
              disabled={!editMode}
              className={`w-full px-3 py-2 rounded-lg border ${editMode
                ? 'bg-yellow-100 text-gray-900 border-yellow-400'
                : 'bg-gray-700 text-white border-gray-600'
                }`}
            />
          </div>
        </div>

        {editMode && (
          <p className="text-yellow-400 text-sm mt-3">
            💡 Yellow fields are editable. Click Save when done.
          </p>
        )}
      </section>

      {/* Strategy Steps */}
      <section>
        <h2 className="text-xl font-bold text-white mb-4">📋 ETF Shop 3.0 Rules</h2>
        <div className="grid gap-4">
          {strategySteps.map((step) => (
            <div
              key={step.step}
              className="flex items-start gap-4 bg-gray-800/50 rounded-xl p-4 border border-gray-700 hover:border-emerald-600/50 transition-colors"
            >
              <div className="flex-shrink-0 w-10 h-10 bg-emerald-600/20 rounded-full flex items-center justify-center text-xl">
                {step.icon}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-emerald-400 font-medium">Step {step.step}</span>
                  <h3 className="text-white font-semibold">{step.title}</h3>
                </div>
                <p className="text-gray-400 text-sm mt-1">{step.description}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Key Differences from 4.0 */}
      <section className="bg-blue-900/20 border border-blue-700/50 rounded-xl p-6">
        <h3 className="text-lg font-bold text-white mb-3">🔄 Key Differences from ETF Shop 4.0</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div className="bg-gray-800/50 rounded-lg p-3">
            <p className="text-gray-400">Ranking Basis</p>
            <p className="text-emerald-400 font-bold">20-Day Moving Average</p>
            <p className="text-xs text-gray-500">vs 52-Week Low in 4.0</p>
          </div>
          <div className="bg-gray-800/50 rounded-lg p-3">
            <p className="text-gray-400">Sell Order</p>
            <p className="text-emerald-400 font-bold">LIFO (Last-In-First-Out)</p>
            <p className="text-xs text-gray-500">vs FIFO in 4.0</p>
          </div>
          <div className="bg-gray-800/50 rounded-lg p-3">
            <p className="text-gray-400">Profit Target</p>
            <p className="text-emerald-400 font-bold">3%</p>
            <p className="text-xs text-gray-500">vs 6% in 4.0</p>
          </div>
          <div className="bg-gray-800/50 rounded-lg p-3">
            <p className="text-gray-400">Daily Limits</p>
            <p className="text-emerald-400 font-bold">Max 1 Buy / 1 Sell</p>
            <p className="text-xs text-gray-500">vs No limits in 4.0</p>
          </div>
        </div>
      </section>
    </div>
  );
}
