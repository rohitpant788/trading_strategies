// Zustand Store for ORB Backtesting
// Manages backtest configuration, results, and loading state

import { create } from 'zustand';
import { BacktestResult, StrategyConfig } from '@/types/orb';
import { persist } from 'zustand/middleware';

interface OrbStore {
    // Configuration
    config: StrategyConfig | null;
    setConfig: (config: StrategyConfig) => void;

    // Results
    results: BacktestResult[];
    setResults: (results: BacktestResult[]) => void;

    // Loading state
    isBacktesting: boolean;
    error: string | null;

    // Actions
    runBacktest: (config: StrategyConfig) => Promise<void>;
    clearResults: () => void;
}

export const useOrbStore = create<OrbStore>()(
    persist(
        (set) => ({
            // Initial state
            config: null,
            results: [],
            isBacktesting: false,
            error: null,

            // Setters
            setConfig: (config) => set({ config }),
            setResults: (results) => set({ results }),

            // Clear results
            clearResults: () => set({ results: [], error: null }),

            // Run backtest
            runBacktest: async (config: StrategyConfig) => {
                set({ isBacktesting: true, error: null, config });

                try {
                    const response = await fetch('/api/orb/backtest', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({ config }),
                    });

                    if (!response.ok) {
                        throw new Error(`HTTP error! status: ${response.status}`);
                    }

                    const data = await response.json();

                    if (!data.success) {
                        throw new Error(data.error || 'Backtest failed');
                    }

                    set({ results: data.results, isBacktesting: false });
                } catch (error) {
                    console.error('Backtest error:', error);
                    set({
                        error: error instanceof Error ? error.message : 'An error occurred',
                        isBacktesting: false,
                    });
                }
            },
        }),
        {
            name: 'orb-storage', // localStorage key
            partialize: (state) => ({ config: state.config }), // Only persist config, not results
        }
    )
);
