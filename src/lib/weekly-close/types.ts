export interface WeeklyStrategyConfig {
    symbol: string;
    startDate: string;
    endDate: string;
    targetPercent: number; // e.g., 6.0 for 6%
    initialCapital: number;
    allocationPerTrade: number;
    // SIP Specific
    mode?: 'LUMP_SUM' | 'SIP';
    weeklyDeposit?: number; // e.g. 10000
    allocationDivisor?: number; // e.g. 10 for (TotalValue / 10)
}

export interface WeeklyTrade {
    id: string;
    entryDate: Date;
    entryPrice: number;
    quantity: number;
    subsequentHigh: number; // To track if we hit 6%
    exitDate?: Date;
    exitPrice?: number;
    exitReason?: 'TARGET' | 'MANUAL' | 'END_OF_DATA';
    status: 'OPEN' | 'CLOSED';
    profit?: number;
    profitPercent?: number;
    accumulationMultiplier?: number;
}

export interface WeeklySignal {
    date: Date;
    type: 'BUY' | 'SKIP';
    price: number;
    reason: string;
    isTrendChange?: boolean;
}
