"use client";

import { useEffect, useState, useCallback } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { UserRole } from '@/lib/types';
import { useToast } from '@/components/ToastProvider';
export default function ReportsPage() {
  const [period, setPeriod] = useState<'daily'|'weekly'|'monthly'>('daily');
  const [date, setDate] = useState('');
  const [students, setStudents] = useState<any[]>([]);
  const [attendance, setAttendance] = useState<any[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [selectedClass, setSelectedClass] = useState('');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [sortBy, setSortBy] = useState<'percentage'|'name'>('percentage');
  const [sortDir, setSortDir] = useState<'desc'|'asc'>('desc');
  const toast = useToast();

  const refreshCourses = useCallback(async () => {
    try {
      const res = await fetch('/api/courses', { cache: 'no-store' });
      const data = await res.json();
      const next = Array.isArray(data) ? data : [];
      setCourses(next);
      if (selectedClass && !next.some((c: any) => c.name.trim() === selectedClass)) {
        setSelectedClass('');
      }
    } catch (e) {}
  }, [selectedClass]);

  useEffect(() => {
    // load base data
    Promise.all([
      fetch('/api/students', { cache: 'no-store' }).then(r => r.json()),
      fetch('/api/attendance', { cache: 'no-store' }).then(r => r.json()),
      fetch('/api/courses', { cache: 'no-store' }).then(r => r.json())
    ]).then(([studs, att, crs]) => {
      setStudents(Array.isArray(studs) ? studs : []);
      setAttendance(Array.isArray(att) ? att : []);
      setCourses(Array.isArray(crs) ? crs : []);
    }).catch(() => toast.showToast?.('Failed to load report data', 'error'));
  }, []);

  useEffect(() => {
    const onUpdate = (event: any) => {
      const msg = event?.detail;
      if (!msg || msg.type !== 'courses_updated') return;
      refreshCourses();
    };
    window.addEventListener('attendance:update', onUpdate as any);
    return () => window.removeEventListener('attendance:update', onUpdate as any);
  }, [refreshCourses]);

  // Debounce search
  useEffect(() => {
    const id = setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => clearTimeout(id);
  }, [search]);

  // compute date range for period
  function getRange() {
    const d = date ? new Date(date) : new Date();
    let from = new Date(d), to = new Date(d);
    if (period === 'weekly') {
      // Weekly should include Monday..Saturday (6 days) and exclude Sunday
      const day = d.getDay(); // 0 (Sun) - 6 (Sat)
      // compute Monday of current week (if Sunday, go back to previous Monday)
      const diffToMonday = day === 0 ? -6 : 1 - day;
      from = new Date(d);
      from.setDate(d.getDate() + diffToMonday);
      // to = Saturday (Monday + 5)
      to = new Date(from);
      to.setDate(from.getDate() + 5);
    } else if (period === 'monthly') {
      from = new Date(d.getFullYear(), d.getMonth(), 1);
      to = new Date(d.getFullYear(), d.getMonth() + 1, 0);
    }
    return { from: from.toISOString().split('T')[0], to: to.toISOString().split('T')[0] };
  }

  const range = getRange();

  // ensure date is initialized on client to avoid SSR/client mismatch
  useEffect(() => {
    if (!date) {
      setDate(new Date().toISOString().split('T')[0]);
    }
  }, [date]);

  // aggregate per-student
  // Count working days in range (exclude Sundays)
  function countWorkingDays(fromISO: string, toISO: string) {
    const from = new Date(fromISO);
    const to = new Date(toISO);
    let c = 0;
    for (let d = new Date(from); d <= to; d.setDate(d.getDate() + 1)) {
      if (d.getDay() === 0) continue; // skip Sunday
      c += 1;
    }
    return c;
  }

  const expectedDays = countWorkingDays(range.from, range.to);

  const perStudent = students.map(s => {
    const records = attendance.filter((r: any) => r.studentId === s.id && r.date >= range.from && r.date <= range.to);
    const present = records.filter((r: any) => r.status === 'PRESENT').length;
    const absent = records.filter((r: any) => r.status === 'ABSENT').length;
    const totalPossible = expectedDays; // expected marks
    const percentage = totalPossible === 0 ? 0 : Math.min(100, Math.round((present / totalPossible) * 100));
    return { ...s, total: totalPossible, present, absent, percentage };
  });

  let filtered = perStudent;
  if (selectedClass) filtered = filtered.filter(s => (s.department || '').toLowerCase() === selectedClass.toLowerCase());
  if (debouncedSearch) filtered = filtered.filter(s => (s.name || '').toLowerCase().includes(debouncedSearch.toLowerCase()) || (s.id || '').toLowerCase().includes(debouncedSearch.toLowerCase()));

  filtered = filtered.sort((a, b) => {
    if (sortBy === 'percentage') return sortDir === 'desc' ? b.percentage - a.percentage : a.percentage - b.percentage;
    return sortDir === 'desc' ? b.name.localeCompare(a.name) : a.name.localeCompare(b.name);
  });

  const overall = { total: 0, present: 0, absent: 0 };
  attendance.forEach((r: any) => { if (r.date >= range.from && r.date <= range.to) { if (r.status === 'PRESENT') overall.present += 1; else overall.absent += 1; overall.total += 1; } });

  const overallPossible = students.length * expectedDays;

  return (
    <DashboardLayout role={UserRole.TEACHER}>
      <h1 style={{ marginBottom: 12, color: '#003366' }}>Attendance Reports</h1>

      <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 16 }}>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className={`btn ${period === 'daily' ? '' : 'btn-outline'}`} onClick={() => setPeriod('daily')}>Daily</button>
          <button className={`btn ${period === 'weekly' ? '' : 'btn-outline'}`} onClick={() => setPeriod('weekly')}>Weekly</button>
          <button className={`btn ${period === 'monthly' ? '' : 'btn-outline'}`} onClick={() => setPeriod('monthly')}>Monthly</button>
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 12 }}>
          <input placeholder="Search by name or ID" value={search} onChange={(e) => setSearch(e.target.value)} className="form-control" style={{ minWidth: 240, flex: 1 }} />
          <select className="form-control" value={selectedClass} onChange={(e) => setSelectedClass(e.target.value)}>
            <option value="">All Classes</option>
            {courses.map(c => <option key={c.id} value={c.name.trim()}>{c.name.trim()}</option>)}
          </select>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 12 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <strong>Range:</strong> {range.from} → {range.to}
          </div>
          <div>
            <strong>Total Possible:</strong> {overallPossible} &nbsp; <strong>Present:</strong> {overall.present} &nbsp; <strong>Absent:</strong> {overall.absent}
          </div>
        </div>
      </div>

      <div className="card">
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#f4f7fa', textAlign: 'left' }}>
              <th style={{ padding: 12 }}>Student</th>
              <th style={{ padding: 12 }}>Class</th>
              <th style={{ padding: 12 }}>Total</th>
              <th style={{ padding: 12 }}>Present</th>
              <th style={{ padding: 12 }}>Absent</th>
              <th style={{ padding: 12, cursor: 'pointer' }} onClick={() => { if (sortBy === 'percentage') setSortDir(sortDir === 'desc' ? 'asc' : 'desc'); else { setSortBy('percentage'); setSortDir('desc'); } }}>
                Percentage {sortBy === 'percentage' ? (sortDir === 'desc' ? '▼' : '▲') : ''}
              </th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(s => (
              <tr key={s.id} style={{ borderBottom: '1px solid #eee' }}>
                <td style={{ padding: 12 }}>
                  <div style={{ fontWeight: 700 }}>{s.name}</div>
                  <div style={{ fontSize: '0.85rem', color: '#666' }}>ID: {s.id}</div>
                </td>
                <td style={{ padding: 12 }}>{s.department}</td>
                <td style={{ padding: 12 }}>{s.total}</td>
                <td style={{ padding: 12 }}>{s.present}</td>
                <td style={{ padding: 12 }}>{s.absent}</td>
                <td style={{ padding: 12 }}>
                  <span style={{ fontWeight: 700, color: s.percentage < 75 ? '#dc3545' : '#28a745' }}>{s.percentage}%</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </DashboardLayout>
  );
}

