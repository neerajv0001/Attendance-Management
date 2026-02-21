import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { UserRole } from '@/lib/types';

export async function POST(req: Request) {
    try {
        const { teacherId, action } = await req.json();

        if (!teacherId || !action) {
            return NextResponse.json({ error: 'Missing teacherId or action' }, { status: 400 });
        }

        if (action === 'APPROVE') {
            await db.users.update(teacherId, { isApproved: true });
            return NextResponse.json({ success: true, message: 'Teacher approved' });
        } else if (action === 'REJECT') {
            await db.users.delete(teacherId);
            return NextResponse.json({ success: true, message: 'Teacher rejected' });
        }

        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    } catch (error) {
        console.error('Approve error:', error);
        return NextResponse.json({ error: 'Operation failed' }, { status: 500 });
    }
}
