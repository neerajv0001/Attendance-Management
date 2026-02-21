import jwt from 'jsonwebtoken';
import { cookies } from 'next/headers';
import { User } from './types';

const SECRET = process.env.JWT_SECRET || 'super-secret-key-change-this-in-production';

export function signToken(user: User) {
    return jwt.sign({ id: user.id, role: user.role, username: user.username }, SECRET, { expiresIn: '1d' });
}

export async function verifySession() {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth_token')?.value;

    if (!token) return null;

    try {
        const decoded = jwt.verify(token, SECRET) as { id: string; role: string; username: string };
        return decoded;
    } catch (err) {
        return null;
    }
}

export async function getSessionUser() {
    const session = await verifySession();
    if (!session) return null;
    // In a real app, you might fetch fresh user data from DB here
    return session;
}
