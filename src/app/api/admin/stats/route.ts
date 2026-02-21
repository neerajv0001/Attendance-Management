import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { UserRole } from '@/lib/types';

export async function GET() {
    try {
        const users = await db.users.getAll();
        const courses = await db.courses.getAll();

        const teachers = users.filter((u) => u.role === UserRole.TEACHER);
        const students = users.filter((u) => u.role === UserRole.STUDENT);
        const pendingTeachers = teachers.filter((u) => !u.isApproved);

        return NextResponse.json({
            totalTeachers: teachers.length,
            totalStudents: students.length,
            totalCourses: courses.length,
            pendingTeachers: pendingTeachers.slice(0, 5), // Recent 5
        });
    } catch (error) {
        return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 });
    }
}
