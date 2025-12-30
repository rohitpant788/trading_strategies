import { NextRequest, NextResponse } from 'next/server';
import { getProfilesConfig, createProfile, switchProfile, deleteProfile } from '@/lib/db';

export async function GET() {
    try {
        const config = getProfilesConfig();
        return NextResponse.json(config);
    } catch (error) {
        return NextResponse.json({ error: 'Failed to fetch profiles' }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { action, name, id } = body;

        if (action === 'create') {
            if (!name) return NextResponse.json({ error: 'Name is required' }, { status: 400 });
            const profile = createProfile(name);
            return NextResponse.json({ success: true, profile });
        }

        if (action === 'switch') {
            if (!id) return NextResponse.json({ error: 'ID is required' }, { status: 400 });
            const success = switchProfile(id);
            if (!success) return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
            return NextResponse.json({ success: true });
        }

        if (action === 'delete') {
            if (!id) return NextResponse.json({ error: 'ID is required' }, { status: 400 });
            const success = deleteProfile(id);
            if (!success) return NextResponse.json({ error: 'Cannot delete this profile' }, { status: 400 });
            return NextResponse.json({ success: true });
        }

        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });

    } catch (error) {
        console.error('Profile API Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
