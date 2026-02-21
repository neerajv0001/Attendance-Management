import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { UserRole } from '@/lib/types';
import { getSessionUser } from '@/lib/auth';

// GET single student
export async function GET(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const session = await getSessionUser();
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const users = await db.users.getAll();
        const student = users.find(u => u.id === id && u.role === UserRole.STUDENT);

        if (!student) {
            return NextResponse.json({ error: 'Student not found' }, { status: 404 });
        }

        // Remove sensitive data
        const { passwordHash, ...studentData } = student;
        return NextResponse.json(studentData);
    } catch (error) {
        console.error('Get student error:', error);
        return NextResponse.json({ error: 'Failed to fetch student' }, { status: 500 });
    }
}

// PUT update student
export async function PUT(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const session = await getSessionUser();
        if (!session || session.role !== UserRole.TEACHER) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { name, email, department } = await req.json();

        const users = await db.users.getAll();
        const student = users.find(u => u.id === id && u.role === UserRole.STUDENT);

        if (!student) {
            return NextResponse.json({ error: 'Student not found' }, { status: 404 });
        }

        const updatedStudent = await db.users.update(id, {
            name,
            email,
            department
        });

        const { passwordHash, ...studentData } = updatedStudent;
        return NextResponse.json({ success: true, student: studentData });
    } catch (error) {
        console.error('Update student error:', error);
        return NextResponse.json({ error: 'Failed to update student' }, { status: 500 });
    }
}

// DELETE student
export async function DELETE(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const session = await getSessionUser();
        if (!session || session.role !== UserRole.TEACHER) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const users = await db.users.getAll();
        const student = users.find(u => u.id === id && u.role === UserRole.STUDENT);

        if (!student) {
            return NextResponse.json({ error: 'Student not found' }, { status: 404 });
        }

        await db.users.delete(id);
        return NextResponse.json({ success: true, message: 'Student deleted successfully' });
    } catch (error) {
        console.error('Delete student error:', error);
        return NextResponse.json({ error: 'Failed to delete student' }, { status: 500 });
    }
}
