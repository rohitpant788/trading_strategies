// Type definitions for ORB Backtesting Engine

export interface CandleData {
    timestamp: Date;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
}

export interface OrbLevels {
    date: string; // YYYY-MM-DD
    orbHigh: number;
    orbLow: number;
    orbOpen: number;
    orbClose: number;
    orbVolume: number;
    orbTimestamp: Date;
}

export type Direction = 'LONG' | 'SHORT' | 'BOTH';
export type ConfirmationType = 'IMMEDIATE' | 'CANDLE_CLOSE';
export type TargetType = 'FIXED_AMOUNT' | 'PERCENTAGE' | 'ATR';
export type StopLossType = 'ORB_LOW' | 'FIXED_AMOUNT' | 'ADAPTIVE';
export type ExitReason = 'TARGET' | 'SL' | 'EOD';

export interface StrategyConfig {
    // Stock selection
    selectedSymbols: string[];

    // Timeframe
    timeframe: number; // in minutes (15 for ORB)

    // Date range
    startDate: string; // YYYY-MM-DD
    endDate: string; // YYYY-MM-DD

    // Entry rules
    direction: Direction;
    confirmationType: ConfirmationType;
    maxTradesPerDay: number; // Maximum trades allowed per day

    // Target
    targetType: TargetType;
    targetValue: number;

    // Stop Loss
    slType: StopLossType;
    slFixedAmount: number;
    slBigCandleThreshold: number; // When candle range > this, use fixed SL

    // Exit rules
    eodSquareOffTime: string; // HH:MM format
    trailingSL: boolean;

    // Slippage & Capital
    slippagePercent: number; // Percentage slippage (e.g., 0.1 for 0.1%)
    startingCapital: number; // Starting capital in rupees
    capitalAllocationPercent: number; // % of capital to use per trade (e.g., 100 for full capital)
}

export interface Signal {
    timestamp: Date;
    type: 'ENTRY' | 'EXIT';
    price: number;
    reason: 'BREAKOUT' | 'TARGET' | 'SL' | 'EOD';
}

export interface Trade {
    id: string;
    symbol: string;
    entryDate: Date;
    entryPrice: number;
    exitDate?: Date;
    exitPrice?: number;
    quantity: number;
    direction: 'LONG' | 'SHORT';

    // Strategy parameters
    orbHigh: number;
    orbLow: number;
    target: number;
    stopLoss: number;

    // Results
    profit?: number;
    profitPercent?: number;
    exitReason?: ExitReason;
    holdingMinutes?: number;

    // Metadata
    isOpen: boolean;
}

export interface BacktestMetrics {
    // Basic stats
    totalTrades: number;
    winningTrades: number;
    losingTrades: number;
    breakEvenTrades: number;

    // Performance
    winRate: number; // percentage
    avgWin: number;
    avgLoss: number;
    expectancy: number;

    // Risk metrics
    maxDrawdown: number;
    maxDrawdownPercent: number;
    profitFactor: number;
    sharpeRatio: number;

    // Extremes
    largestWin: number;
    largestLoss: number;
    maxConsecutiveWins: number;
    maxConsecutiveLosses: number;

    // Equity
    totalProfit: number;
    totalLoss: number;
    netProfit: number;

    // Capital tracking
    startingCapital: number;
    finalCapital: number;
    returnPercent: number; // (finalCapital - startingCapital) / startingCapital * 100

    // Additional
    avgHoldingMinutes: number;
    avgWinHoldingMinutes: number;
    avgLossHoldingMinutes: number;
}

export interface EquityPoint {
    date: Date;
    equity: number;
    drawdown: number;
}

export interface BacktestResult {
    symbol: string;
    config: StrategyConfig;
    trades: Trade[];
    metrics: BacktestMetrics;
    equityCurve: EquityPoint[];
    orbLevels: OrbLevels[];
    startDate: Date;
    endDate: Date;
    runTimestamp: Date;
}

export interface ScannerResult {
    symbol: string;
    totalTrades: number;
    winRate: number;
    netProfit: number;
    expectancy: number;
    profitFactor: number;
    maxDrawdown: number;
    suitabilityScore: number; // 0-100
}
