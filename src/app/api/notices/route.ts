import { NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import noticeEmitter from '@/lib/noticeEmitter';
import { db } from '@/lib/db';

export async function GET() {
  try {
    const list = await (db as any).notices.getAll();
    return NextResponse.json({ notices: list });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to fetch notices' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { title, message, authorId } = body;
    if (!title || !message) return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
    const notice = { id: uuidv4(), title, message, authorId: authorId || null, createdAt: new Date().toISOString() };
    await (db as any).notices.create(notice);
    // emit event for SSE clients
    try { noticeEmitter.emit('notice_created', notice); } catch (e) { /* ignore */ }
    // emit via socket.io if available
    try { const io = (global as any).__io; if (io) io.emit('notice_created', notice); } catch (e) {}
    return NextResponse.json({ notice }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to create notice' }, { status: 500 });
  }
}
