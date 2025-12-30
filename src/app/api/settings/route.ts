// API route for settings

import { NextRequest, NextResponse } from 'next/server';
// Import getDailyActivity
import { getSettings, updateSetting, getDailyActivity } from '@/lib/db';

export async function GET() {
    try {
        const settings = getSettings();
        // Get today's activity
        const today = new Date().toISOString().split('T')[0];
        const activity = getDailyActivity(today);

        return NextResponse.json({
            ...settings,
            dailyActivity: {
                buys: activity?.buy_count || 0,
                sells: activity?.sell_count || 0
            }
        });
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
        if (body.minVolume !== undefined) {
            updateSetting('min_volume', String(body.minVolume));
        }
        if (body.averagingThreshold !== undefined) {
            updateSetting('averaging_threshold', String(body.averagingThreshold));
        }
        if (body.maxDailyBuys !== undefined) {
            updateSetting('max_daily_buys', String(body.maxDailyBuys));
        }
        if (body.maxDailySells !== undefined) {
            updateSetting('max_daily_sells', String(body.maxDailySells));
        }

        const updatedSettings = getSettings();
        return NextResponse.json(updatedSettings);
    } catch (error) {
        console.error('Error updating settings:', error);
        return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 });
    }
}
