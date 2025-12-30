// API route for settings

import { NextRequest, NextResponse } from 'next/server';
import { getSettings, updateSetting } from '@/lib/db';

export async function GET() {
    try {
        const settings = getSettings();
        return NextResponse.json(settings);
    } catch (error) {
        console.error('Error fetching settings:', error);
        return NextResponse.json({ error: 'Failed to fetch settings' }, { status: 500 });
    }
}

export async function PUT(request: NextRequest) {
    try {
        const body = await request.json();

        // Update each setting
        if (body.profitTargetPercent !== undefined) {
            updateSetting('profit_target_percent', String(body.profitTargetPercent));
        }
        if (body.minProfitAmount !== undefined) {
            updateSetting('min_profit_amount', String(body.minProfitAmount));
        }
        if (body.perTransactionAmount !== undefined) {
            updateSetting('per_transaction_amount', String(body.perTransactionAmount));
        }
        if (body.totalCapital !== undefined) {
            updateSetting('total_capital', String(body.totalCapital));
        }

        const updatedSettings = getSettings();
        return NextResponse.json(updatedSettings);
    } catch (error) {
        console.error('Error updating settings:', error);
        return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 });
    }
}
