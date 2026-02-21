import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { UserRole } from '@/lib/types';
import { getSessionUser } from '@/lib/auth';

export async function GET(req: Request) {
    const timetable = await db.timetable.getAll();
    return NextResponse.json(timetable);
}

export async function POST(req: Request) {
    try {
        const session = await getSessionUser();
        if (!session || session.role !== UserRole.TEACHER) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { subject, day, startTime, endTime } = await req.json();

        const newEntry = {
            id: `tt-${Date.now()}`,
            subject,
            day,
            startTime,
            endTime,
            teacherId: session.id
        };

        const current = await db.timetable.getAll();
        await db.timetable.save([...current, newEntry]);

        return NextResponse.json({ success: true, entry: newEntry });
    } catch (error) {
        return NextResponse.json({ error: 'Failed' }, { status: 500 });
    }
}
