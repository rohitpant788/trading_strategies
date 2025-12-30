// Calculation utilities matching Google Sheet formulas

import { Holding, Settings, Trade, CashFlow } from '@/types';

/**
 * Calculate target price based on settings
 * Formula: Max of (avgPrice * (1 + profitTargetPct), (avgPrice * qty + minProfit) / qty)
 */
export function calculateTargetPrice(
    avgPrice: number,
    quantity: number,
    settings: Settings
): number {
    const targetByPercent = avgPrice * (1 + settings.profitTargetPercent / 100);
    const targetByMinProfit = (avgPrice * quantity + settings.minProfitAmount) / quantity;
    return Math.max(targetByPercent, targetByMinProfit);
}

/**
 * Check if averaging is recommended (>5% drop from last buy)
 */
export function shouldAverage(lastBuyPrice: number, currentPrice: number): boolean {
    const dropPercent = ((lastBuyPrice - currentPrice) / lastBuyPrice) * 100;
    return dropPercent > 5;
}

/**
 * Check if SIP is recommended (>10% drop from last buy)
 */
export function shouldSIP(lastBuyPrice: number, currentPrice: number): boolean {
    const dropPercent = ((lastBuyPrice - currentPrice) / lastBuyPrice) * 100;
    return dropPercent > 10;
}

/**
 * Calculate distance from 52-week low (percentage above)
 */
export function distanceFromLow(currentPrice: number, low52w: number): number {
    if (low52w === 0) return 0;
    return ((currentPrice - low52w) / low52w) * 100;
}

/**
 * Calculate distance from 52-week high (percentage below)
 */
export function distanceFromHigh(currentPrice: number, high52w: number): number {
    if (high52w === 0) return 0;
    return ((high52w - currentPrice) / high52w) * 100;
}

/**
 * FIFO sell logic - returns which holdings to sell
 */
export function sellFIFO(
    holdings: Holding[],
    quantityToSell: number
): { soldHoldings: { holding: Holding; quantitySold: number }[]; remaining: Holding[] } {
    // Sort by buy date (oldest first)
    const sorted = [...holdings].sort(
        (a, b) => new Date(a.buyDate).getTime() - new Date(b.buyDate).getTime()
    );

    const soldHoldings: { holding: Holding; quantitySold: number }[] = [];
    const remaining: Holding[] = [];
    let remainingToSell = quantityToSell;

    for (const holding of sorted) {
        if (remainingToSell <= 0) {
            remaining.push(holding);
            continue;
        }

        if (holding.quantity <= remainingToSell) {
            // Sell entire holding
            soldHoldings.push({ holding, quantitySold: holding.quantity });
            remainingToSell -= holding.quantity;
        } else {
            // Partial sell
            soldHoldings.push({ holding, quantitySold: remainingToSell });
            remaining.push({
                ...holding,
                quantity: holding.quantity - remainingToSell,
            });
            remainingToSell = 0;
        }
    }

    return { soldHoldings, remaining };
}

/**
 * Calculate average price for holdings of same ETF
 */
export function calculateAveragePrice(holdings: Holding[]): number {
    if (holdings.length === 0) return 0;

    const totalValue = holdings.reduce((sum, h) => sum + h.buyPrice * h.quantity, 0);
    const totalQty = holdings.reduce((sum, h) => sum + h.quantity, 0);

    return totalQty > 0 ? totalValue / totalQty : 0;
}

/**
 * Calculate XIRR (Extended Internal Rate of Return)
 * Uses Newton-Raphson method
 */
export function calculateXIRR(cashFlows: CashFlow[], currentValue: number): number {
    if (cashFlows.length === 0) return 0;

    // Add current portfolio value as final positive cash flow
    const allFlows = [
        ...cashFlows.map(cf => ({
            date: new Date(cf.date),
            amount: cf.type === 'INVESTMENT' || cf.type === 'CAPITAL_ADD' ? -Math.abs(cf.amount) : Math.abs(cf.amount)
        })),
        { date: new Date(), amount: currentValue }
    ].sort((a, b) => a.date.getTime() - b.date.getTime());

    if (allFlows.length < 2) return 0;

    const startDate = allFlows[0].date;

    // NPV function
    const npv = (rate: number): number => {
        return allFlows.reduce((sum, flow) => {
            const years = (flow.date.getTime() - startDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000);
            return sum + flow.amount / Math.pow(1 + rate, years);
        }, 0);
    };

    // NPV derivative
    const npvDerivative = (rate: number): number => {
        return allFlows.reduce((sum, flow) => {
            const years = (flow.date.getTime() - startDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000);
            return sum - years * flow.amount / Math.pow(1 + rate, years + 1);
        }, 0);
    };

    // Newton-Raphson iteration
    let rate = 0.1; // Initial guess 10%
    for (let i = 0; i < 100; i++) {
        const f = npv(rate);
        const fPrime = npvDerivative(rate);

        if (Math.abs(fPrime) < 1e-10) break;

        const newRate = rate - f / fPrime;

        if (Math.abs(newRate - rate) < 1e-7) {
            return newRate * 100; // Return as percentage
        }

        rate = newRate;
    }

    return rate * 100;
}

/**
 * Calculate holding period in days
 */
export function calculateHoldingDays(buyDate: string, sellDate: string): number {
    const buy = new Date(buyDate);
    const sell = new Date(sellDate);
    return Math.floor((sell.getTime() - buy.getTime()) / (1000 * 60 * 60 * 24));
}

/**
 * Calculate dynamic profit target based on capital usage
 * As per the sheet: if >90% capital is used, reduce target
 */
export function getDynamicProfitTarget(
    baseTarget: number,
    usedCapitalPercent: number
): number {
    if (usedCapitalPercent > 90) {
        return baseTarget * 0.52; // ~3.14% if base is 6%
    } else if (usedCapitalPercent > 80) {
        return baseTarget * 0.67; // ~4%
    } else if (usedCapitalPercent > 70) {
        return baseTarget * 0.83; // ~5%
    }
    return baseTarget;
}

/**
 * Format currency for display
 */
export function formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(amount);
}

/**
 * Format percentage for display
 */
export function formatPercent(value: number): string {
    return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
}

/**
 * Format date for display
 */
export function formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
    });
}
