// API route for SIP entries

import { NextRequest, NextResponse } from 'next/server';
import { getAllSIPEntries, addSIPEntry, toggleSIPEntry, deleteSIPEntry } from '@/lib/db';

export async function GET() {
    try {
        const entries = getAllSIPEntries();
        return NextResponse.json(entries);
    } catch (error) {
        console.error('Error fetching SIP entries:', error);
        return NextResponse.json({ error: 'Failed to fetch SIP entries' }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { etfId, amount, frequency, nextDate } = body;

        if (!etfId || !amount || !frequency || !nextDate) {
            return NextResponse.json(
                { error: 'etfId, amount, frequency, and nextDate are required' },
                { status: 400 }
            );
        }

        const id = addSIPEntry(etfId, amount, frequency, nextDate);
        return NextResponse.json({ id, success: true });
    } catch (error) {
        console.error('Error adding SIP entry:', error);
        return NextResponse.json({ error: 'Failed to add SIP entry' }, { status: 500 });
    }
}

export async function PUT(request: NextRequest) {
    try {
        const body = await request.json();
        const { id, isActive } = body;

        if (id === undefined || isActive === undefined) {
            return NextResponse.json({ error: 'id and isActive are required' }, { status: 400 });
        }

        toggleSIPEntry(id, isActive);
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error toggling SIP entry:', error);
        return NextResponse.json({ error: 'Failed to toggle SIP entry' }, { status: 500 });
    }
}

export async function DELETE(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const id = parseInt(searchParams.get('id') || '0');

        if (!id) {
            return NextResponse.json({ error: 'ID is required' }, { status: 400 });
        }

        deleteSIPEntry(id);
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error deleting SIP entry:', error);
        return NextResponse.json({ error: 'Failed to delete SIP entry' }, { status: 500 });
    }
}
