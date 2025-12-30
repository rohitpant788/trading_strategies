// API route for fetching and persisting market data from Yahoo Finance
// ETF Shop 3.0 - Calculates 20 DMA and distance from DMA

import { NextResponse } from 'next/server';
import { getAllETFs, upsertMarketData, getETFBySymbol } from '@/lib/db';

interface MarketDataWith20DMA {
    symbol: string;
    cmp: number;
    high52w: number;
    low52w: number;
    change: number;
    changePercent: number;
    prevClose: number;
    volume: number;
    dma20: number;
    dmaDistance: number;
}

// Fetch market data from Yahoo Finance API with 20 DMA calculation
async function fetchYahooFinanceDataWith20DMA(yahooSymbol: string): Promise<MarketDataWith20DMA | null> {
    try {
        // Fetch 1 month of data to ensure we have at least 20 trading days
        const url = `https://query1.finance.yahoo.com/v8/finance/chart/${yahooSymbol}?interval=1d&range=1mo`;

        const response = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            },
        });

        if (!response.ok) {
            console.error(`Failed to fetch ${yahooSymbol}: ${response.status}`);
            return null;
        }

        const data = await response.json();
        const result = data.chart?.result?.[0];

        if (!result) return null;

        const quote = result.meta;
        const indicators = result.indicators?.quote?.[0];

        // Get closing prices for 20 DMA calculation
        const closePrices = indicators?.close?.filter((c: number | null) => c !== null) || [];

        // Calculate 20 DMA (use last 20 closing prices)
        let dma20 = 0;
        if (closePrices.length >= 20) {
            const last20 = closePrices.slice(-20);
            dma20 = last20.reduce((sum: number, price: number) => sum + price, 0) / 20;
        } else if (closePrices.length > 0) {
            // Use available data if less than 20 days
            dma20 = closePrices.reduce((sum: number, price: number) => sum + price, 0) / closePrices.length;
        }

        const cmp = quote.regularMarketPrice || 0;

        // Calculate DMA distance: (CMP - 20DMA) / 20DMA * 100
        // Negative means price is below 20 DMA (potential buy signal)
        const dmaDistance = dma20 > 0 ? ((cmp - dma20) / dma20) * 100 : 0;

        // Get high and low from available data for 52W reference
        const highs = indicators?.high?.filter((h: number | null) => h !== null) || [];
        const lows = indicators?.low?.filter((l: number | null) => l !== null) || [];

        const high52w = highs.length > 0 ? Math.max(...highs) : cmp;
        const low52w = lows.length > 0 ? Math.min(...lows) : cmp;

        return {
            symbol: yahooSymbol.replace('.NS', ''),
            cmp,
            high52w,
            low52w,
            change: cmp - quote.previousClose || 0,
            changePercent: ((cmp - quote.previousClose) / quote.previousClose) * 100 || 0,
            prevClose: quote.previousClose || 0,
            volume: quote.regularMarketVolume || 0,
            dma20,
            dmaDistance,
        };
    } catch (error) {
        console.error(`Error fetching ${yahooSymbol}:`, error);
        return null;
    }
}

export async function GET() {
    try {
        const etfs = getAllETFs();
        const results: { success: number; failed: number; errors: string[] } = {
            success: 0,
            failed: 0,
            errors: [],
        };

        // Fetch data for all ETFs and save to database
        const promises = etfs.map(async (etf) => {
            try {
                const data = await fetchYahooFinanceDataWith20DMA(etf.yahooSymbol);
                if (data) {
                    const etfRecord = getETFBySymbol(data.symbol);
                    if (etfRecord) {
                        upsertMarketData(
                            etfRecord.id,
                            data.cmp,
                            data.high52w,
                            data.low52w,
                            data.prevClose,
                            data.change,
                            data.changePercent,
                            data.volume,
                            data.dma20,
                            data.dmaDistance
                        );
                        results.success++;
                    }
                } else {
                    results.failed++;
                    results.errors.push(etf.symbol);
                }
            } catch (error) {
                results.failed++;
                results.errors.push(`${etf.symbol}: ${error}`);
            }
        });

        await Promise.all(promises);

        return NextResponse.json({
            message: `Refreshed ${results.success} ETFs with 20 DMA, ${results.failed} failed`,
            ...results,
        });
    } catch (error) {
        console.error('Error fetching market data:', error);
        return NextResponse.json(
            { error: 'Failed to fetch market data' },
            { status: 500 }
        );
    }
}
