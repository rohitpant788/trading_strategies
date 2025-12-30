// API route for capital transactions

import { NextRequest, NextResponse } from 'next/server';
import { getAllCapitalTransactions, addCapitalTransaction } from '@/lib/db';

export async function GET() {
    try {
        const transactions = getAllCapitalTransactions();
        return NextResponse.json(transactions);
    } catch (error) {
        console.error('Error fetching capital transactions:', error);
        return NextResponse.json({ error: 'Failed to fetch transactions' }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { type, amount, date, notes } = body;

        if (!type || !amount || !date) {
            return NextResponse.json({ error: 'Type, amount, and date are required' }, { status: 400 });
        }

        const id = addCapitalTransaction(type, amount, date, notes);
        return NextResponse.json({ id, success: true });
    } catch (error) {
        console.error('Error adding capital transaction:', error);
        return NextResponse.json({ error: 'Failed to add transaction' }, { status: 500 });
    }
}
