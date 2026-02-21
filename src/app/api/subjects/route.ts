import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { UserRole } from '@/lib/types';
import { getSessionUser } from '@/lib/auth';

export async function POST(req: Request) {
    try {
        const session = await getSessionUser();
        if (!session || session.role !== UserRole.ADMIN) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { courseId, name } = await req.json();

        const courses = await db.courses.getAll();
        const courseIndex = courses.findIndex(c => c.id === courseId);

        if (courseIndex === -1) {
            return NextResponse.json({ error: 'Course not found' }, { status: 404 });
        }

        // Push subject to course
        courses[courseIndex].subjects.push(name);
        await db.courses.save(courses);

        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: 'Failed' }, { status: 500 });
    }
}

export async function PUT(req: Request) {
    try {
        const session = await getSessionUser();
        if (!session || session.role !== UserRole.ADMIN) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { courseId, oldName, newName } = await req.json();
        const courses = await db.courses.getAll();
        const courseIndex = courses.findIndex(c => c.id === courseId);
        if (courseIndex === -1) return NextResponse.json({ error: 'Course not found' }, { status: 404 });

        const subjectIdx = courses[courseIndex].subjects.findIndex((s: string) => s === oldName);
        if (subjectIdx === -1) return NextResponse.json({ error: 'Subject not found' }, { status: 404 });

        courses[courseIndex].subjects[subjectIdx] = newName;
        await db.courses.save(courses);
        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: 'Failed' }, { status: 500 });
    }
}

export async function DELETE(req: Request) {
    try {
        const session = await getSessionUser();
        if (!session || session.role !== UserRole.ADMIN) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { courseId, name } = await req.json();
        const courses = await db.courses.getAll();
        const courseIndex = courses.findIndex(c => c.id === courseId);
        if (courseIndex === -1) return NextResponse.json({ error: 'Course not found' }, { status: 404 });

        courses[courseIndex].subjects = courses[courseIndex].subjects.filter((s: string) => s !== name);
        await db.courses.save(courses);
        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: 'Failed' }, { status: 500 });
    }
}
