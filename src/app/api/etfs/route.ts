// API route for fetching all ETFs WITH market data from database
// Also supports POST (add) and DELETE (remove) ETFs

import { NextRequest, NextResponse } from 'next/server';
import { getAllETFsWithMarketData, getMarketDataLastUpdated, addETF, deleteETF, getETFBySymbol } from '@/lib/db';

export async function GET() {
    try {
        const etfs = getAllETFsWithMarketData();
        const lastUpdated = getMarketDataLastUpdated();

        return NextResponse.json({
            etfs,
            lastUpdated,
            count: etfs.length,
        });
    } catch (error) {
        console.error('Error fetching ETFs:', error);
        return NextResponse.json(
            { error: 'Failed to fetch ETFs', details: String(error) },
            { status: 500 }
        );
    }
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { symbol, name, category } = body;

        if (!symbol || !name || !category) {
            return NextResponse.json(
                { error: 'symbol, name, and category are required' },
                { status: 400 }
            );
        }

        // Check if symbol already exists
        const existing = getETFBySymbol(symbol.toUpperCase());
        if (existing) {
            return NextResponse.json(
                { error: `ETF with symbol ${symbol} already exists` },
                { status: 409 }
            );
        }

        const id = addETF(symbol, name, category);
        return NextResponse.json({ id, success: true });
    } catch (error) {
        console.error('Error adding ETF:', error);
        return NextResponse.json(
            { error: 'Failed to add ETF' },
            { status: 500 }
        );
    }
}

export async function DELETE(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const id = parseInt(searchParams.get('id') || '0');

        if (!id) {
            return NextResponse.json({ error: 'ID is required' }, { status: 400 });
        }

        deleteETF(id);
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error deleting ETF:', error);
        return NextResponse.json(
            { error: 'Failed to delete ETF' },
            { status: 500 }
        );
    }
}
