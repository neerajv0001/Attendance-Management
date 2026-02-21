import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { UserRole } from '@/lib/types';
import { getSessionUser } from '@/lib/auth';

export async function POST(req: Request) {
    try {
        const session = await getSessionUser();
        if (!session || session.role !== UserRole.TEACHER) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { date, records } = await req.json(); // records: { studentId: string, status: 'PRESENT' | 'ABSENT' }[]

        if (!date || !records || !Array.isArray(records)) {
            return NextResponse.json({ error: 'Invalid data' }, { status: 400 });
        }

        const currentRecords = await db.attendance.getAll();

        const newRecords = records.map((r: any) => ({
            ...r,
            date,
            teacherId: session.id
        }));

        // Remove existing records that conflict with newRecords.
        // Match by date + studentId + subject (if provided). If incoming record has no subject, remove any record for that student/date.
        const shouldKeep = (existing: any) => {
            for (const nr of newRecords) {
                if (existing.date === nr.date && existing.studentId === nr.studentId) {
                    if (nr.subject) {
                        if (existing.subject === nr.subject) return false; // conflict: same student/date/subject
                    } else {
                        return false; // incoming has no subject -> replace any student/date record
                    }
                }
            }
            return true;
        };

        const filtered = currentRecords.filter((r: any) => shouldKeep(r));

        // Save combined set (filtered existing + new records)
        await db.attendance.save([...filtered, ...newRecords]);

        return NextResponse.json({ success: true, message: 'Attendance marked' });
    } catch (error) {
        console.error('Attendance error:', error);
        return NextResponse.json({ error: 'Failed' }, { status: 500 });
    }
}

export async function GET(req: Request) {
    const session = await getSessionUser();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    let studentId = searchParams.get('studentId');

    // If student role, force query to own ID
    if (session.role === UserRole.STUDENT) {
        studentId = session.id;
    }

    const records = await db.attendance.getAll();

    if (studentId) {
        return NextResponse.json(records.filter((r: any) => r.studentId === studentId));
    }

    if (session.role === UserRole.ADMIN || session.role === UserRole.TEACHER) {
        return NextResponse.json(records);
    }

    return NextResponse.json([]);
}
