import { NextResponse } from 'next/server';
import noticeEmitter from '@/lib/noticeEmitter';
import { db } from '@/lib/db';

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  try {
    const id = params.id;
    await (db as any).notices.delete(id);
    try { noticeEmitter.emit('notice_deleted', { id }); } catch (e) {}
    try { const io = (global as any).__io; if (io) io.emit('notice_deleted', { id }); } catch (e) {}
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to delete' }, { status: 500 });
  }
}

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  try {
    const id = params.id;
    const body = await req.json();
    const updated = await (db as any).notices.update(id, body);
    try { noticeEmitter.emit('notice_updated', updated); } catch (e) {}
    try { const io = (global as any).__io; if (io) io.emit('notice_updated', updated); } catch (e) {}
    return NextResponse.json({ notice: updated });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to update' }, { status: 500 });
  }
}
