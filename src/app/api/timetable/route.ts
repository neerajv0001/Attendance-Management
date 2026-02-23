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

export async function DELETE(req: Request) {
    try {
        const session = await getSessionUser();
        if (!session || session.role !== UserRole.TEACHER) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { id } = await req.json();
        if (!id) {
            return NextResponse.json({ error: 'Missing timetable id' }, { status: 400 });
        }

        const current = await db.timetable.getAll();
        const target = current.find((entry) => entry.id === id);
        if (!target) {
            return NextResponse.json({ error: 'Timetable entry not found' }, { status: 404 });
        }
        const next = current.filter((entry) => entry.id !== id);
        await db.timetable.save(next);

        return NextResponse.json({ success: true, id });
    } catch (error) {
        return NextResponse.json({ error: 'Failed' }, { status: 500 });
    }
}
