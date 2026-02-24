import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionUser } from '@/lib/auth';
import bcrypt from 'bcryptjs';
import { UserRole } from '@/lib/types';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
type LunchOverrideMap = Record<string, { startTime: string; endTime: string }>;

const isValidTime = (time: unknown): time is string =>
    typeof time === 'string' && /^([01]\d|2[0-3]):([0-5]\d)$/.test(time);

const normalizeLunchOverrides = (value: unknown) => {
    if (!value || typeof value !== 'object') return undefined;
    const raw = value as Record<string, unknown>;
    const out: LunchOverrideMap = {};
    for (const day of DAYS) {
        const item = raw[day] as { startTime?: unknown; endTime?: unknown } | undefined;
        if (!item || typeof item !== 'object') continue;
        if (isValidTime(item.startTime) && isValidTime(item.endTime) && item.startTime < item.endTime) {
            out[day] = { startTime: item.startTime, endTime: item.endTime };
        }
    }
    return Object.keys(out).length ? out : {};
};

const getLunchForDayFromSettings = (
    day: string,
    lunchBreakStart?: string,
    lunchBreakEnd?: string,
    lunchBreakOverrides?: LunchOverrideMap
) => {
    const override = lunchBreakOverrides?.[day];
    return {
        startTime: override?.startTime || lunchBreakStart,
        endTime: override?.endTime || lunchBreakEnd,
    };
};

const toMinutes = (time: string): number => {
    const [h, m] = time.split(':').map(Number);
    return h * 60 + m;
};

const hasTimeOverlap = (startA: string, endA: string, startB: string, endB: string): boolean => {
    const aStart = toMinutes(startA);
    const aEnd = toMinutes(endA);
    const bStart = toMinutes(startB);
    const bEnd = toMinutes(endB);
    return aStart < bEnd && bStart < aEnd;
};

// Update password
export async function PUT(req: Request) {
    try {
        const session = await getSessionUser();
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { currentPassword, newPassword, newUsername, lunchBreakStart, lunchBreakEnd, lunchBreakOverrides } = await req.json();
        const users = await db.users.getAll();
        const user = users.find(u => u.id === session.id);

        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        // If changing password
        if (newPassword) {
            if (!currentPassword) {
                return NextResponse.json({ error: 'Current password is required' }, { status: 400 });
            }

            const validPassword = await bcrypt.compare(currentPassword, user.passwordHash);
            if (!validPassword) {
                return NextResponse.json({ error: 'Current password is incorrect' }, { status: 400 });
            }

            const hashedPassword = await bcrypt.hash(newPassword, 10);
            await db.users.update(session.id, { passwordHash: hashedPassword });
        }

        // If changing username
        if (newUsername) {
            // Check if username is already taken
            const existingUser = users.find(u => u.username === newUsername && u.id !== session.id);
            if (existingUser) {
                return NextResponse.json({ error: 'Username already taken' }, { status: 400 });
            }

            await db.users.update(session.id, { username: newUsername });
        }

        const hasLunchPayload =
            typeof lunchBreakStart !== 'undefined'
            || typeof lunchBreakEnd !== 'undefined'
            || typeof lunchBreakOverrides !== 'undefined';

        if (hasLunchPayload) {
            if (session.role !== UserRole.TEACHER) {
                return NextResponse.json({ error: 'Only teachers can update lunch break settings' }, { status: 403 });
            }

            const updates: Partial<{
                lunchBreakStart?: string;
                lunchBreakEnd?: string;
                lunchBreakOverrides?: LunchOverrideMap;
            }> = {};

            if (typeof lunchBreakStart !== 'undefined') {
                if (lunchBreakStart !== '' && !isValidTime(lunchBreakStart)) {
                    return NextResponse.json({ error: 'Invalid lunch break start time' }, { status: 400 });
                }
                updates.lunchBreakStart = lunchBreakStart || undefined;
            }
            if (typeof lunchBreakEnd !== 'undefined') {
                if (lunchBreakEnd !== '' && !isValidTime(lunchBreakEnd)) {
                    return NextResponse.json({ error: 'Invalid lunch break end time' }, { status: 400 });
                }
                updates.lunchBreakEnd = lunchBreakEnd || undefined;
            }
            const effectiveStart = typeof updates.lunchBreakStart === 'string'
                ? updates.lunchBreakStart
                : user.lunchBreakStart;
            const effectiveEnd = typeof updates.lunchBreakEnd === 'string'
                ? updates.lunchBreakEnd
                : user.lunchBreakEnd;
            if (effectiveStart && effectiveEnd && effectiveStart >= effectiveEnd) {
                return NextResponse.json({ error: 'Lunch break end time must be after start time' }, { status: 400 });
            }

            if (typeof lunchBreakOverrides !== 'undefined') {
                const normalized = normalizeLunchOverrides(lunchBreakOverrides);
                if (typeof normalized === 'undefined') {
                    return NextResponse.json({ error: 'Invalid lunch break overrides payload' }, { status: 400 });
                }
                updates.lunchBreakOverrides = normalized;
            }

            const nextLunchBreakStart = typeof updates.lunchBreakStart === 'string'
                ? updates.lunchBreakStart
                : user.lunchBreakStart;
            const nextLunchBreakEnd = typeof updates.lunchBreakEnd === 'string'
                ? updates.lunchBreakEnd
                : user.lunchBreakEnd;
            const nextLunchOverrides = typeof updates.lunchBreakOverrides !== 'undefined'
                ? updates.lunchBreakOverrides
                : (user.lunchBreakOverrides || {});

            if (nextLunchBreakStart && nextLunchBreakEnd) {
                const timetable = await db.timetable.getAll();
                const myLectures = timetable.filter((entry) =>
                    entry.teacherId === session.id && !entry.isLunchBreak
                );
                for (const day of DAYS) {
                    const lunch = getLunchForDayFromSettings(day, nextLunchBreakStart, nextLunchBreakEnd, nextLunchOverrides);
                    if (!lunch.startTime || !lunch.endTime) continue;
                    const conflict = myLectures.find((lec) =>
                        lec.day === day && hasTimeOverlap(lec.startTime, lec.endTime, lunch.startTime!, lunch.endTime!)
                    );
                    if (conflict) {
                        return NextResponse.json({
                            error: `Lunch break overlaps with ${conflict.subject} on ${day} (${conflict.startTime}-${conflict.endTime}).`,
                        }, { status: 409 });
                    }
                }
            }

            if (Object.keys(updates).length > 0) {
                await db.users.update(session.id, updates);
            }
        }

        return NextResponse.json({
            success: true,
            message: 'Settings updated successfully'
        });
    } catch (error) {
        console.error('Settings update error:', error);
        return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 });
    }
}

// Get current user info
export async function GET() {
    try {
        const session = await getSessionUser();
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const users = await db.users.getAll();
        const user = users.find(u => u.id === session.id);

        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        return NextResponse.json({
            id: user.id,
            username: user.username,
            name: user.name,
            email: user.email,
            role: user.role,
            subject: user.subject,
            courseId: user.courseId,
            lunchBreakStart: user.lunchBreakStart,
            lunchBreakEnd: user.lunchBreakEnd,
            lunchBreakOverrides: user.lunchBreakOverrides || {}
        });
    } catch (error) {
        console.error('Get user error:', error);
        return NextResponse.json({ error: 'Failed to get user info' }, { status: 500 });
    }
}

// Delete current user (permanent)
export async function DELETE() {
    try {
        const session = await getSessionUser();
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Remove user from DB (or fallback JSON)
        await db.users.delete(session.id);

        // Optionally, clear any server-side sessions/cookies here. Client should call /api/auth/logout
        return NextResponse.json({ success: true, message: 'Account deleted' });
    } catch (error) {
        console.error('Delete user error:', error);
        return NextResponse.json({ error: 'Failed to delete account' }, { status: 500 });
    }
}
