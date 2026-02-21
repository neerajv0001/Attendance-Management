import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionUser } from '@/lib/auth';
import { UserRole } from '@/lib/types';

function startOfWeek(d: Date) {
  const dt = new Date(d);
  const day = dt.getDay();
  const diff = dt.getDate() - day + (day === 0 ? -6 : 1); // Monday start
  return new Date(dt.setDate(diff));
}

export async function GET(req: Request) {
  const session = await getSessionUser();
  if (!session || (session.role !== UserRole.ADMIN && session.role !== UserRole.TEACHER)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const period = searchParams.get('period') || 'daily';
  const dateParam = searchParams.get('date') || new Date().toISOString().split('T')[0];
  const date = new Date(dateParam);

  const all = await db.attendance.getAll();

  let from = new Date(date);
  let to = new Date(date);

  if (period === 'weekly') {
    from = startOfWeek(date);
    to = new Date(from);
    to.setDate(from.getDate() + 6);
  } else if (period === 'monthly') {
    from = new Date(date.getFullYear(), date.getMonth(), 1);
    to = new Date(date.getFullYear(), date.getMonth() + 1, 0);
  }

  const fromStr = from.toISOString().split('T')[0];
  const toStr = to.toISOString().split('T')[0];

  const filtered = all.filter((r: any) => r.date >= fromStr && r.date <= toStr);
  const total = filtered.length;
  const present = filtered.filter((r: any) => r.status === 'PRESENT').length;
  const absent = filtered.filter((r: any) => r.status === 'ABSENT').length;

  const presentPercent = total === 0 ? 0 : Math.round((present / total) * 100);
  const absentPercent = total === 0 ? 0 : Math.round((absent / total) * 100);

  return NextResponse.json({ period, from: fromStr, to: toStr, total, present, absent, presentPercent, absentPercent });
}
