import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { UserRole } from '@/lib/types';
import bcrypt from 'bcryptjs';

export async function POST(req: Request) {
    try {
        const { name, email, qualification, experience, subject, courseId, password } = await req.json();

        const hashedPassword = await bcrypt.hash(password, 10);
        const id = `teacher-${Date.now()}`;

        const newTeacher = {
            id,
            username: email, // Email as username for teachers
            passwordHash: hashedPassword,
            role: UserRole.TEACHER,
            name,
            email,
            qualification,
            experience,
            subject,
            courseId,
            isApproved: false, // Wait for admin
            createdAt: new Date().toISOString(),
        };

        const savedUser = await db.users.create(newTeacher);

        return NextResponse.json({ success: true, message: 'Teacher registered successfully. Wait for admin approval.' });
    } catch (error) {
        console.error('Registration error:', error);
        return NextResponse.json({ error: 'Registration failed' }, { status: 500 });
    }
}
