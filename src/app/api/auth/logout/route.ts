import { NextResponse } from 'next/server';

export async function POST() {
    const response = NextResponse.json({ success: true, message: 'Logged out successfully' });

    // Clear the auth cookie
    response.cookies.set('auth_token', '', {
        httpOnly: true,
        path: '/',
        secure: process.env.NODE_ENV === 'production',
        maxAge: 0,
        expires: new Date(0)
    });

    return response;
}
