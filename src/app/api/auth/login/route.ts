import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { signToken } from '@/lib/auth';
import bcrypt from 'bcryptjs';
import { UserRole } from '@/lib/types';
import dbConnect from '@/lib/mongodb';

export async function POST(req: Request) {
    try {
        // 1. Database connection
        await dbConnect(); 

        // 2. Ensure admin exists
        await db.users.initAdmin(); 

        const body = await req.json();
        const { username, password } = body;

        // 3. Find user
        const users = await db.users.getAll();
        const user = users.find((u) => u.username === username);

        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 401 });
        }

        // 4. Password check
        const validPassword = await bcrypt.compare(password, user.passwordHash);
        if (!validPassword) {
            return NextResponse.json({ error: 'Invalid password' }, { status: 401 });
        }

        // 5. Approval check
        if (user.role === UserRole.TEACHER && !user.isApproved) {
            return NextResponse.json({ error: 'Account pending admin approval' }, { status: 403 });
        }

        const token = signToken(user);

        const response = NextResponse.json({
            success: true,
            user: {
                id: user.id,
                username: user.username,
                role: user.role,
                name: user.name
            }
        });

        response.cookies.set('auth_token', token, {
            httpOnly: true,
            path: '/',
            secure: process.env.NODE_ENV === 'production',
            maxAge: 60 * 60 * 24 // 1 day
        });

        return response;

    } catch (error: any) {
        console.error('SERVER SIDE ERROR:', error);
        return NextResponse.json({ 
            error: 'Login Failed', 
            details: error.message 
        }, { status: 500 });
    }
}