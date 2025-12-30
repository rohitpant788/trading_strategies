// API route for trades (sold holdings)

import { NextRequest, NextResponse } from 'next/server';
import { getAllTrades, addTrade, getETFBySymbol } from '@/lib/db';

export async function GET() {
    try {
        const trades = getAllTrades();
        return NextResponse.json(trades);
    } catch (error) {
        console.error('Error fetching trades:', error);
        return NextResponse.json({ error: 'Failed to fetch trades' }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { etfSymbol, buyDate, sellDate, buyPrice, sellPrice, quantity } = body;

        const etf = getETFBySymbol(etfSymbol);
        if (!etf) {
            return NextResponse.json({ error: 'ETF not found' }, { status: 404 });
        }

        const id = addTrade(etf.id, buyDate, sellDate, buyPrice, sellPrice, quantity);
        return NextResponse.json({ id, success: true });
    } catch (error) {
        console.error('Error adding trade:', error);
        return NextResponse.json({ error: 'Failed to add trade' }, { status: 500 });
    }
}
