import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { UserRole } from '@/lib/types';
import { getSessionUser } from '@/lib/auth';

export async function GET(req: Request) {
    try {
        const courses = await db.courses.getAll();
        return NextResponse.json(courses);
    } catch (error) {
        console.error('Courses GET error:', error);
        return NextResponse.json([], { status: 200 });
    }
}

export async function POST(req: Request) {
    try {
        const session = await getSessionUser();
        if (!session || session.role !== UserRole.ADMIN) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { name } = await req.json();

        const newCourse = {
            id: `course-${Date.now()}`,
            name,
            subjects: []
        };

        const courses = await db.courses.getAll();
        await db.courses.save([...courses, newCourse]);

        return NextResponse.json(newCourse);
    } catch (error) {
        console.error('Course add error:', error);
        return NextResponse.json({ error: 'Failed' }, { status: 500 });
    }
}

export async function PUT(req: Request) {
    try {
        const session = await getSessionUser();
        if (!session || session.role !== UserRole.ADMIN) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { id, name } = await req.json();
        const courses = await db.courses.getAll();
        const idx = courses.findIndex(c => c.id === id);
        if (idx === -1) return NextResponse.json({ error: 'Not found' }, { status: 404 });
        courses[idx].name = name;
        await db.courses.save(courses);
        return NextResponse.json({ success: true, course: courses[idx] });
    } catch (error) {
        console.error('Course update error:', error);
        return NextResponse.json({ error: 'Failed' }, { status: 500 });
    }
}

export async function DELETE(req: Request) {
    try {
        const session = await getSessionUser();
        if (!session || session.role !== UserRole.ADMIN) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { id } = await req.json();
        const courses = await db.courses.getAll();
        const filtered = courses.filter(c => c.id !== id);
        await db.courses.save(filtered);
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Course delete error:', error);
        return NextResponse.json({ error: 'Failed' }, { status: 500 });
    }
}
