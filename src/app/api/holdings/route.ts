// API route for holdings CRUD operations

import { NextRequest, NextResponse } from 'next/server';
import { getAllHoldings, addHolding, updateHolding, deleteHolding, getETFBySymbol, getDailyActivity, incrementDailyBuy, getSettings } from '@/lib/db';

export async function GET() {
    try {
        const holdings = getAllHoldings();
        return NextResponse.json(holdings);
    } catch (error) {
        console.error('Error fetching holdings:', error);
        return NextResponse.json({ error: 'Failed to fetch holdings' }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { etfSymbol, buyDate, buyPrice, quantity } = body;

        // Check daily buy limit
        const settings = getSettings();

        // Use the buyDate from the request to check limits for that specific day
        const activity = getDailyActivity(buyDate);
        const buyCount = activity?.buy_count || 0;

        if (settings.maxDailyBuys && buyCount >= settings.maxDailyBuys) {
            // Recommendation only - allow it but maybe log it?
            console.warn(`Daily buy limit of ${settings.maxDailyBuys} reached for ${buyDate}, but proceeding as it's a soft limit.`);
        }

        // Get ETF ID from symbol
        const etf = getETFBySymbol(etfSymbol);
        if (!etf) {
            return NextResponse.json({ error: 'ETF not found' }, { status: 404 });
        }

        const id = addHolding(etf.id, buyDate, buyPrice, quantity);

        // Increment daily buy count for the specific buy date
        incrementDailyBuy(buyDate);

        return NextResponse.json({ id, success: true });
    } catch (error) {
        console.error('Error adding holding:', error);
        return NextResponse.json({ error: 'Failed to add holding' }, { status: 500 });
    }
}

export async function PUT(request: NextRequest) {
    try {
        const body = await request.json();
        const { id, buyPrice, quantity, buyDate } = body;

        updateHolding(id, buyPrice, quantity, buyDate);
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error updating holding:', error);
        return NextResponse.json({ error: 'Failed to update holding' }, { status: 500 });
    }
}

export async function DELETE(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const id = parseInt(searchParams.get('id') || '0');

        if (!id) {
            return NextResponse.json({ error: 'ID is required' }, { status: 400 });
        }

        deleteHolding(id);
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error deleting holding:', error);
        return NextResponse.json({ error: 'Failed to delete holding' }, { status: 500 });
    }
}
