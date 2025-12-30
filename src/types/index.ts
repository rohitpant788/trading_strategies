// Core TypeScript types for ETF Shop 4.0

export interface ETF {
  id: number;
  symbol: string;        // e.g., "GOLDBEES"
  yahooSymbol: string;   // e.g., "GOLDBEES.NS"
  name: string;
  category: string;
}

export interface ETFWithMarketData extends ETF {
  cmp: number;           // Current Market Price
  high52w: number;       // 52-week high
  low52w: number;        // 52-week low
  volume: number;
  distanceFromLow: number;  // % above 52w low
  distanceFromHigh: number; // % below 52w high
  prevClose: number;
  change: number;        // Today's change
  changePercent: number;
}

export interface Holding {
  id: number;
  etfId: number;
  etfSymbol: string;
  etfName: string;
  buyDate: string;       // ISO date string
  buyPrice: number;
  quantity: number;
  createdAt: string;
}

export interface HoldingWithCalculations extends Holding {
  cmp: number;
  avgPrice: number;
  totalQuantity: number;
  targetPrice: number;
  currentValue: number;
  investedValue: number;
  notionalPL: number;
  notionalPLPercent: number;
  shouldAverage: boolean;  // >5% drop
  shouldSIP: boolean;      // >10% drop
}

export interface Trade {
  id: number;
  etfId: number;
  etfSymbol: string;
  etfName: string;
  buyDate: string;
  sellDate: string;
  buyPrice: number;
  sellPrice: number;
  quantity: number;
  profit: number;
  profitPercent: number;
  holdingDays: number;
}

export interface CapitalTransaction {
  id: number;
  type: 'ADD' | 'WITHDRAW';
  amount: number;
  date: string;
  notes?: string;
}

export interface Settings {
  profitTargetPercent: number;    // Default 6%
  minProfitAmount: number;        // Default 500
  perTransactionAmount: number;   // Default 10000
  totalCapital: number;           // Default 500000
  minVolume?: number;             // Default 15000
  averagingThreshold?: number;    // Default 2.5%
  maxDailyBuys?: number;          // Default 1
  maxDailySells?: number;         // Default 1
}

export interface CapitalSummary {
  totalCapital: number;
  totalInvested: number;
  availableCapital: number;
  usedPercent: number;
  totalRealizedProfit: number;
  totalNotionalPL: number;
}

export interface CashFlow {
  date: string;
  amount: number;  // Negative for investments, positive for returns
  type: 'INVESTMENT' | 'RETURN' | 'CAPITAL_ADD' | 'CAPITAL_WITHDRAW';
}

export interface SIPEntry {
  id: number;
  etfId: number;
  etfSymbol: string;
  amount: number;
  frequency: 'WEEKLY' | 'MONTHLY';
  nextDate: string;
  isActive: boolean;
}

export interface MarketDataRow {
  id: number;
  etfId: number;
  symbol: string;
  yahooSymbol: string;
  name: string;
  category: string;
  cmp: number | null;
  high52w: number | null;
  low52w: number | null;
  prevClose: number | null;
  change: number | null;
  changePercent: number | null;
  volume: number | null;
  dma20: number | null;
  dmaDistance: number | null;
  updatedAt: string | null;
  distanceFromLow: number | null;
  distanceFromHigh: number | null;
}

export interface HoldingWithCalc extends Holding {
  avgPrice: number;
  targetPrice: number;
  notionalPL: number;
  notionalPLPercent: number;
}
