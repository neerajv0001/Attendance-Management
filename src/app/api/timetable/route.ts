import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { UserRole } from '@/lib/types';
import { getSessionUser } from '@/lib/auth';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
type LunchOverrideMap = Record<string, { startTime?: string; endTime?: string }>;

const toMinutes = (time: string): number => {
    const match = /^(\d{2}):(\d{2})$/.exec(time);
    if (!match) return Number.NaN;
    const hours = Number(match[1]);
    const minutes = Number(match[2]);
    if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return Number.NaN;
    return (hours * 60) + minutes;
};

const hasTimeOverlap = (startA: string, endA: string, startB: string, endB: string): boolean => {
    const aStart = toMinutes(startA);
    const aEnd = toMinutes(endA);
    const bStart = toMinutes(startB);
    const bEnd = toMinutes(endB);
    if ([aStart, aEnd, bStart, bEnd].some(Number.isNaN)) return false;
    return aStart < bEnd && bStart < aEnd;
};

const getLunchBreakForDay = (
    teacher: { lunchBreakStart?: string; lunchBreakEnd?: string; lunchBreakOverrides?: LunchOverrideMap } | undefined,
    day: string
): { startTime?: string; endTime?: string } => {
    const overrides = teacher?.lunchBreakOverrides || {};
    const dayOverride = overrides?.[day];
    return {
        startTime: dayOverride?.startTime || teacher?.lunchBreakStart,
        endTime: dayOverride?.endTime || teacher?.lunchBreakEnd,
    };
};

export async function GET(req: Request) {
    const session = await getSessionUser();
    if (!session) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const scope = searchParams.get('scope');
    const timetable = (await db.timetable.getAll()).filter((entry) => !entry.isLunchBreak);
    const users = await db.users.getAll();
    const teacherUsers = users.filter((u) => u.role === UserRole.TEACHER);
    const teacherNameById = new Map(
        teacherUsers.map((u) => [u.id, u.name || u.username || u.id] as const)
    );
    const regularWithTeacher = timetable.map((entry) => ({
        ...entry,
        teacherName: teacherNameById.get(entry.teacherId || '') || entry.teacherId || 'N/A',
    }));

    const virtualLunchBreaks = teacherUsers.flatMap((teacher) => {
        if (!teacher.lunchBreakStart || !teacher.lunchBreakEnd) return [];
        const overrides = teacher.lunchBreakOverrides || {};
        return DAYS.map((day) => {
            const override = overrides[day];
            const startTime = override?.startTime || teacher.lunchBreakStart!;
            const endTime = override?.endTime || teacher.lunchBreakEnd!;
            return {
                id: `lunch-${teacher.id}-${day}`,
                subject: 'Lunch Break',
                day,
                startTime,
                endTime,
                teacherId: teacher.id,
                teacherName: teacher.name || teacher.username || teacher.id,
                isLunchBreak: true,
                isCancelled: false,
            };
        });
    });

    if (scope === 'all') {
        if (session.role !== UserRole.TEACHER && session.role !== UserRole.ADMIN && session.role !== UserRole.STUDENT) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }
        return NextResponse.json(regularWithTeacher);
    }

    if (session.role === UserRole.TEACHER) {
        return NextResponse.json(timetable.filter((entry) => entry.teacherId === session.id));
    }

    if (session.role === UserRole.STUDENT) {
        return NextResponse.json([...regularWithTeacher, ...virtualLunchBreaks]);
    }

    return NextResponse.json(regularWithTeacher);
}

export async function POST(req: Request) {
    try {
        const session = await getSessionUser();
        if (!session || session.role !== UserRole.TEACHER) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { subject, day, startTime, endTime, isLunchBreak } = await req.json();
        const nextIsLunchBreak = !!isLunchBreak;
        const nextSubject = nextIsLunchBreak ? 'Lunch Break' : (typeof subject === 'string' ? subject.trim() : '');
        if (!nextSubject || !day || !startTime || !endTime) {
            return NextResponse.json({ error: 'Subject, day and time are required' }, { status: 400 });
        }
        const startMinutes = toMinutes(startTime);
        const endMinutes = toMinutes(endTime);
        if (Number.isNaN(startMinutes) || Number.isNaN(endMinutes) || startMinutes >= endMinutes) {
            return NextResponse.json({ error: 'Invalid time range' }, { status: 400 });
        }

        const current = (await db.timetable.getAll()).filter((entry) => !entry.isLunchBreak);
        const conflicting = current.find((entry) =>
            entry.day === day && hasTimeOverlap(startTime, endTime, entry.startTime, entry.endTime)
        );
        if (conflicting) {
            const users = await db.users.getAll();
            const conflictTeacher = users.find((u) => u.id === conflicting.teacherId);
            const teacherName = conflictTeacher?.name || conflicting.teacherId || 'Another teacher';
            return NextResponse.json({
                error: `Time conflict: ${teacherName} already has class on ${day} from ${conflicting.startTime} to ${conflicting.endTime}.`,
            }, { status: 409 });
        }
        const users = await db.users.getAll();
        const teacher = users.find((u) => u.id === session.id);
        const lunch = getLunchBreakForDay(teacher, day);
        if (lunch.startTime && lunch.endTime && hasTimeOverlap(startTime, endTime, lunch.startTime, lunch.endTime)) {
            return NextResponse.json({
                error: `Time conflict: Lunch break is set on ${day} from ${lunch.startTime} to ${lunch.endTime}.`,
            }, { status: 409 });
        }

        const newEntry = {
            id: `tt-${Date.now()}`,
            subject: nextSubject,
            day,
            startTime,
            endTime,
            teacherId: session.id,
            isLunchBreak: nextIsLunchBreak,
            isCancelled: false,
        };

        await db.timetable.save([...current, newEntry]);

        return NextResponse.json({ success: true, entry: newEntry });
    } catch (error) {
        return NextResponse.json({ error: 'Failed' }, { status: 500 });
    }
}

export async function PUT(req: Request) {
    try {
        const session = await getSessionUser();
        if (!session || session.role !== UserRole.TEACHER) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { id, isCancelled, cancelReason, subject, day, startTime, endTime, isLunchBreak } = await req.json();
        if (!id) return NextResponse.json({ error: 'Missing or invalid payload' }, { status: 400 });

        const current = await db.timetable.getAll();
        const idx = current.findIndex((entry) => entry.id === id);
        if (idx === -1) {
            return NextResponse.json({ error: 'Timetable entry not found' }, { status: 404 });
        }

        const existing = current[idx];
        if (existing.teacherId !== session.id) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const hasCancelToggle = typeof isCancelled === 'boolean';
        const hasScheduleUpdate = [subject, day, startTime, endTime].some(v => typeof v === 'string');
        if (!hasCancelToggle && !hasScheduleUpdate) {
            return NextResponse.json({ error: 'No changes provided' }, { status: 400 });
        }

        const nextDay = typeof day === 'string' ? day.trim() : existing.day;
        const nextStartTime = typeof startTime === 'string' ? startTime : existing.startTime;
        const nextEndTime = typeof endTime === 'string' ? endTime : existing.endTime;
        const nextStartMinutes = toMinutes(nextStartTime);
        const nextEndMinutes = toMinutes(nextEndTime);
        if (Number.isNaN(nextStartMinutes) || Number.isNaN(nextEndMinutes) || nextStartMinutes >= nextEndMinutes) {
            return NextResponse.json({ error: 'Invalid time range' }, { status: 400 });
        }

        const conflicting = current.find((entry) =>
            entry.id !== existing.id
            && !entry.isLunchBreak
            && entry.day === nextDay
            && hasTimeOverlap(nextStartTime, nextEndTime, entry.startTime, entry.endTime)
        );
        if (conflicting) {
            const users = await db.users.getAll();
            const conflictTeacher = users.find((u) => u.id === conflicting.teacherId);
            const teacherName = conflictTeacher?.name || conflicting.teacherId || 'Another teacher';
            return NextResponse.json({
                error: `Time conflict: ${teacherName} already has class on ${nextDay} from ${conflicting.startTime} to ${conflicting.endTime}.`,
            }, { status: 409 });
        }
        const users = await db.users.getAll();
        const teacher = users.find((u) => u.id === session.id);
        const lunch = getLunchBreakForDay(teacher, nextDay);
        if (lunch.startTime && lunch.endTime && hasTimeOverlap(nextStartTime, nextEndTime, lunch.startTime, lunch.endTime)) {
            return NextResponse.json({
                error: `Time conflict: Lunch break is set on ${nextDay} from ${lunch.startTime} to ${lunch.endTime}.`,
            }, { status: 409 });
        }

        const nextEntry = {
            ...existing,
            subject: typeof subject === 'string' && subject.trim()
                ? subject.trim()
                : (existing.isLunchBreak ? 'Lunch Break' : existing.subject),
            day: nextDay,
            startTime: nextStartTime,
            endTime: nextEndTime,
            isLunchBreak: typeof isLunchBreak === 'boolean' ? isLunchBreak : !!existing.isLunchBreak,
            isCancelled: hasCancelToggle ? isCancelled : existing.isCancelled,
            cancelledAt: hasCancelToggle
                ? (isCancelled ? new Date().toISOString() : undefined)
                : existing.cancelledAt,
            cancelReason: hasCancelToggle
                ? (isCancelled ? (typeof cancelReason === 'string' ? cancelReason.trim() : '') : undefined)
                : existing.cancelReason,
        };

        const next = [...current];
        next[idx] = nextEntry;
        await db.timetable.save(next);

        return NextResponse.json({ success: true, entry: nextEntry });
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
        if (target.teacherId !== session.id) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }
        const next = current.filter((entry) => entry.id !== id);
        await db.timetable.save(next);

        return NextResponse.json({ success: true, id });
    } catch (error) {
        return NextResponse.json({ error: 'Failed' }, { status: 500 });
    }
}
