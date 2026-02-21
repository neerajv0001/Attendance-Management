import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { UserRole } from '@/lib/types';
import { generateStudentId, generatePassword } from '@/lib/utils';
import bcrypt from 'bcryptjs';

export async function POST(req: Request) {
    try {
        const { name, email, department } = await req.json(); // Basic student info

        const studentId = generateStudentId();
        // Credential rule: username and password are identical by default
        const password = studentId;
        const hashedPassword = await bcrypt.hash(password, 10);

        const newStudent = {
            id: studentId,
            username: studentId,
            passwordHash: hashedPassword,
            role: UserRole.STUDENT,
            name,
            email,
            department,
            createdAt: new Date().toISOString(),
        };

        await db.users.create(newStudent);

        return NextResponse.json({
            success: true,
            student: { ...newStudent, password } // Return raw password to show teacher
        });
    } catch (error) {
        console.error('Failed to add student:', error);
        return NextResponse.json({ error: 'Failed to add student' }, { status: 500 });
    }
}

export async function GET() {
    const users = await db.users.getAll();
    const students = users.filter((u) => u.role === UserRole.STUDENT);
    return NextResponse.json(students);
}

export async function PUT(req: Request) {
    try {
        const updates = await req.json();
        const { id, ...rest } = updates;
        if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });
        const updated = await db.users.update(id, rest as any);
        return NextResponse.json({ success: true, student: updated });
    } catch (err) {
        console.error('Student update error:', err);
        return NextResponse.json({ error: 'Failed' }, { status: 500 });
    }
}

export async function DELETE(req: Request) {
    try {
        const { id } = await req.json();
        if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });
        await db.users.delete(id);
        return NextResponse.json({ success: true });
    } catch (err) {
        console.error('Student delete error:', err);
        return NextResponse.json({ error: 'Failed' }, { status: 500 });
    }
}
