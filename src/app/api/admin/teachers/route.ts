import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { UserRole } from '@/lib/types';
import { getSessionUser } from '@/lib/auth';

export async function GET(req: Request) {
    const session = await getSessionUser();
    if (!session || session.role !== UserRole.ADMIN) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status'); // 'pending' or 'approved'

    const users = await db.users.getAll();
    let teachers = users.filter((u) => u.role === UserRole.TEACHER);

    if (status === 'pending') {
        teachers = teachers.filter((u) => !u.isApproved);
    } else if (status === 'approved') {
        teachers = teachers.filter((u) => u.isApproved);
    }

    return NextResponse.json(teachers);
}

export async function DELETE(req: Request) {
    try {
        const session = await getSessionUser();
        if (!session || session.role !== UserRole.ADMIN) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { id } = await req.json();
        if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

        await db.users.delete(id);
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Delete teacher error:', error);
        return NextResponse.json({ error: 'Failed' }, { status: 500 });
    }
}
