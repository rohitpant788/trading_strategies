// API route for trades (sold holdings)

import { NextRequest, NextResponse } from 'next/server';
import { getAllTrades, addTrade, getETFBySymbol, getDailyActivity, incrementDailySell, getSettings } from '@/lib/db';

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

        // Check daily sell limit using the specific sell date
        const settings = getSettings();
        const activity = getDailyActivity(sellDate);
        const sellCount = activity?.sell_count || 0;

        if (settings.maxDailySells && sellCount >= settings.maxDailySells) {
            // Recommendation only - allow it but maybe log it?
            console.warn(`Daily sell limit of ${settings.maxDailySells} reached for ${sellDate}, but proceeding as it's a soft limit.`);
        }

        const etf = getETFBySymbol(etfSymbol);
        if (!etf) {
            return NextResponse.json({ error: 'ETF not found' }, { status: 404 });
        }

        const id = addTrade(etf.id, buyDate, sellDate, buyPrice, sellPrice, quantity);

        incrementDailySell(sellDate);

        return NextResponse.json({ id, success: true });
    } catch (error) {
        console.error('Error adding trade:', error);
        return NextResponse.json({ error: 'Failed to add trade' }, { status: 500 });
    }
}

export async function DELETE(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');

        if (!id) {
            return NextResponse.json({ error: 'Trade ID is required' }, { status: 400 });
        }

        const { deleteTrade } = require('@/lib/db');
        deleteTrade(parseInt(id));

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error deleting trade:', error);
        return NextResponse.json({ error: 'Failed to delete trade' }, { status: 500 });
    }
}
