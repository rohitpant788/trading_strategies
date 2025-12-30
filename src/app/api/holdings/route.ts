// API route for holdings CRUD operations

import { NextRequest, NextResponse } from 'next/server';
import { getAllHoldings, addHolding, updateHolding, deleteHolding, getETFBySymbol } from '@/lib/db';

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

        // Get ETF ID from symbol
        const etf = getETFBySymbol(etfSymbol);
        if (!etf) {
            return NextResponse.json({ error: 'ETF not found' }, { status: 404 });
        }

        const id = addHolding(etf.id, buyDate, buyPrice, quantity);
        return NextResponse.json({ id, success: true });
    } catch (error) {
        console.error('Error adding holding:', error);
        return NextResponse.json({ error: 'Failed to add holding' }, { status: 500 });
    }
}

export async function PUT(request: NextRequest) {
    try {
        const body = await request.json();
        const { id, buyPrice, quantity } = body;

        updateHolding(id, buyPrice, quantity);
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
