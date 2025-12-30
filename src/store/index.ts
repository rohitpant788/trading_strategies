// Zustand store for client-side state management
// Syncs with SQLite via API calls

import { create } from 'zustand';
import {
    ETF,
    ETFWithMarketData,
    Holding,
    HoldingWithCalculations,
    Trade,
    CapitalTransaction,
    Settings,
    CapitalSummary,
    SIPEntry
} from '@/types';
import { calculateTargetPrice, calculateAveragePrice, shouldAverage, shouldSIP } from '@/lib/calculations';

interface StoreState {
    // Data
    etfs: ETFWithMarketData[];
    holdings: Holding[];
    trades: Trade[];
    capitalTransactions: CapitalTransaction[];
    sipEntries: SIPEntry[];
    settings: Settings;

    // UI state
    isLoading: boolean;
    error: string | null;
    lastUpdated: Date | null;

    // Actions
    setETFs: (etfs: ETFWithMarketData[]) => void;
    setHoldings: (holdings: Holding[]) => void;
    setTrades: (trades: Trade[]) => void;
    setCapitalTransactions: (transactions: CapitalTransaction[]) => void;
    setSIPEntries: (entries: SIPEntry[]) => void;
    setSettings: (settings: Settings) => void;
    setLoading: (loading: boolean) => void;
    setError: (error: string | null) => void;

    // Computed
    getHoldingsWithCalculations: () => HoldingWithCalculations[];
    getCapitalSummary: () => CapitalSummary;
    getGroupedHoldings: () => Map<string, HoldingWithCalculations[]>;
}

export const useStore = create<StoreState>((set, get) => ({
    // Initial state
    etfs: [],
    holdings: [],
    trades: [],
    capitalTransactions: [],
    sipEntries: [],
    settings: {
        profitTargetPercent: 6,
        minProfitAmount: 500,
        perTransactionAmount: 10000,
        totalCapital: 500000,
    },
    isLoading: false,
    error: null,
    lastUpdated: null,

    // Setters
    setETFs: (etfs) => set({ etfs, lastUpdated: new Date() }),
    setHoldings: (holdings) => set({ holdings }),
    setTrades: (trades) => set({ trades }),
    setCapitalTransactions: (transactions) => set({ capitalTransactions: transactions }),
    setSIPEntries: (entries) => set({ sipEntries: entries }),
    setSettings: (settings) => set({ settings }),
    setLoading: (isLoading) => set({ isLoading }),
    setError: (error) => set({ error }),

    // Computed: Holdings with all calculations
    getHoldingsWithCalculations: () => {
        const { holdings, etfs, settings } = get();

        // Group holdings by ETF
        const groupedByETF = new Map<number, Holding[]>();
        for (const holding of holdings) {
            const existing = groupedByETF.get(holding.etfId) || [];
            existing.push(holding);
            groupedByETF.set(holding.etfId, existing);
        }

        const result: HoldingWithCalculations[] = [];

        for (const holding of holdings) {
            const etf = etfs.find(e => e.symbol === holding.etfSymbol);
            const etfHoldings = groupedByETF.get(holding.etfId) || [];

            const avgPrice = calculateAveragePrice(etfHoldings);
            const totalQuantity = etfHoldings.reduce((sum, h) => sum + h.quantity, 0);
            const cmp = etf?.cmp || holding.buyPrice;
            const targetPrice = calculateTargetPrice(avgPrice, totalQuantity, settings);

            const currentValue = holding.quantity * cmp;
            const investedValue = holding.quantity * holding.buyPrice;
            const notionalPL = currentValue - investedValue;
            const notionalPLPercent = ((cmp - holding.buyPrice) / holding.buyPrice) * 100;

            // Get last buy price for this ETF (most recent)
            const sortedHoldings = [...etfHoldings].sort(
                (a, b) => new Date(b.buyDate).getTime() - new Date(a.buyDate).getTime()
            );
            const lastBuyPrice = sortedHoldings[0]?.buyPrice || holding.buyPrice;

            result.push({
                ...holding,
                cmp,
                avgPrice,
                totalQuantity,
                targetPrice,
                currentValue,
                investedValue,
                notionalPL,
                notionalPLPercent,
                shouldAverage: shouldAverage(lastBuyPrice, cmp),
                shouldSIP: shouldSIP(lastBuyPrice, cmp),
            });
        }

        return result;
    },

    // Computed: Capital summary
    getCapitalSummary: () => {
        const { settings, capitalTransactions, trades } = get();
        const holdingsWithCalc = get().getHoldingsWithCalculations();

        // Calculate total additions and withdrawals
        let totalAdditions = settings.totalCapital; // Base capital
        let totalWithdrawals = 0;

        for (const tx of capitalTransactions) {
            if (tx.type === 'ADD') {
                totalAdditions += tx.amount;
            } else {
                totalWithdrawals += tx.amount;
            }
        }

        const totalCapital = totalAdditions - totalWithdrawals;

        // Calculate total invested
        const totalInvested = holdingsWithCalc.reduce(
            (sum, h) => sum + h.buyPrice * h.quantity,
            0
        );

        // Calculate realized profit from trades
        const totalRealizedProfit = trades.reduce((sum, t) => sum + t.profit, 0);

        // Calculate notional P&L
        const totalNotionalPL = holdingsWithCalc.reduce((sum, h) => sum + h.notionalPL, 0);

        const availableCapital = totalCapital - totalInvested + totalRealizedProfit;
        const usedPercent = totalCapital > 0 ? (totalInvested / totalCapital) * 100 : 0;

        return {
            totalCapital,
            totalInvested,
            availableCapital,
            usedPercent,
            totalRealizedProfit,
            totalNotionalPL,
        };
    },

    // Computed: Group holdings by ETF symbol
    getGroupedHoldings: () => {
        const holdingsWithCalc = get().getHoldingsWithCalculations();
        const grouped = new Map<string, HoldingWithCalculations[]>();

        for (const holding of holdingsWithCalc) {
            const existing = grouped.get(holding.etfSymbol) || [];
            existing.push(holding);
            grouped.set(holding.etfSymbol, existing);
        }

        return grouped;
    },
}));
