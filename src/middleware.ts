import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

const SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'super-secret-key-change-this-in-production');

// Role-based route access
const ROUTE_ACCESS: Record<string, string[]> = {
    '/admin': ['ADMIN'],
    '/teacher': ['TEACHER'],
    '/student': ['STUDENT'],
};

export async function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;

    // Public routes that don't require authentication
    const publicRoutes = ['/login', '/register', '/api/auth/login', '/api/auth/register', '/api/seed', '/api/courses', '/api/subjects'];
    if (publicRoutes.some(route => pathname.startsWith(route))) {
        return NextResponse.next();
    }

    // API routes (except auth) - check token
    if (pathname.startsWith('/api/')) {
        const token = request.cookies.get('auth_token')?.value;

        if (!token) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        try {
            await jwtVerify(token, SECRET);
            return NextResponse.next();
        } catch {
            return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
        }
    }

    // Page routes - check token and role
    const token = request.cookies.get('auth_token')?.value;

    if (!token) {
        return NextResponse.redirect(new URL('/login', request.url));
    }

    try {
        const { payload } = await jwtVerify(token, SECRET);
        const userRole = payload.role as string;

        // Check role-based access
        for (const [routePrefix, allowedRoles] of Object.entries(ROUTE_ACCESS)) {
            if (pathname.startsWith(routePrefix)) {
                if (!allowedRoles.includes(userRole)) {
                    // Redirect to appropriate dashboard based on role
                    if (userRole === 'ADMIN') {
                        return NextResponse.redirect(new URL('/admin/dashboard', request.url));
                    } else if (userRole === 'TEACHER') {
                        return NextResponse.redirect(new URL('/teacher/dashboard', request.url));
                    } else if (userRole === 'STUDENT') {
                        return NextResponse.redirect(new URL('/student/dashboard', request.url));
                    }
                }
                break;
            }
        }

        return NextResponse.next();
    } catch {
        // Invalid token, redirect to login
        return NextResponse.redirect(new URL('/login', request.url));
    }
}

export const config = {
    matcher: [
        '/((?!_next/static|_next/image|favicon.ico|.*\\.png$|.*\\.svg$).*)',
    ],
};
