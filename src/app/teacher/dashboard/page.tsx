'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { UserRole } from '@/lib/types';
import Link from 'next/link';

export default function TeacherDashboard() {
  const [stats, setStats] = useState({
    totalStudents: 0,
    todayPresentCount: 0,
    todayAbsentCount: 0,
    weekPresentCount: 0,
    weekAbsentCount: 0,
  });
  const [todayLectures, setTodayLectures] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const currentWeekday = useMemo(
    () => new Date().toLocaleDateString('en-US', { weekday: 'long' }),
    []
  );

  const loadStats = useCallback(async (silent = false) => {
    try {
      const [students, attendance, timetable] = await Promise.all([
        fetch('/api/students', { cache: 'no-store' }).then((r) => r.json()),
        fetch('/api/attendance', { cache: 'no-store' }).then((r) => r.json()),
        fetch('/api/timetable', { cache: 'no-store' }).then((r) => r.json()),
      ]);

      const studentList = Array.isArray(students) ? students : [];
      const studentIds = new Set(studentList.map((s: any) => s.id));
      const todayKey = new Date().toISOString().split('T')[0];
      const attendanceList = Array.isArray(attendance) ? attendance : [];
      const todayAttendance = attendanceList.filter(
        (a: any) => a.date === todayKey && studentIds.has(a.studentId)
      );
      const now = new Date();
      const day = now.getDay(); // 0 = Sunday, 1 = Monday
      const diffToMonday = day === 0 ? -6 : 1 - day;
      const weekStartDate = new Date(now);
      weekStartDate.setDate(now.getDate() + diffToMonday);
      const weekStartKey = weekStartDate.toISOString().split('T')[0];
      const weekEndDate = new Date(weekStartDate);
      weekEndDate.setDate(weekStartDate.getDate() + 5); // Saturday
      const weekEndKey = weekEndDate.toISOString().split('T')[0];

      const weekAttendance = attendanceList.filter(
        (a: any) => a.date >= weekStartKey && a.date <= weekEndKey && studentIds.has(a.studentId)
      );

      const statusByStudent = new Map<string, 'PRESENT' | 'ABSENT'>();
      for (const rec of todayAttendance) {
        if (rec?.studentId && (rec?.status === 'PRESENT' || rec?.status === 'ABSENT')) {
          statusByStudent.set(rec.studentId, rec.status);
        }
      }

      const todayPresent = Array.from(statusByStudent.values()).filter((s) => s === 'PRESENT').length;
      const todayAbsent = Array.from(statusByStudent.values()).filter((s) => s === 'ABSENT').length;

      // Weekly count should not repeat the same student multiple times in the same day.
      // Keep one status per student per day (latest wins), then sum whole week's day-wise statuses.
      const dayWiseStatus = new Map<string, 'PRESENT' | 'ABSENT'>();
      for (const rec of weekAttendance) {
        if (!rec?.studentId || (rec?.status !== 'PRESENT' && rec?.status !== 'ABSENT')) continue;
        dayWiseStatus.set(`${rec.date}__${rec.studentId}`, rec.status);
      }

      const weekPresent = Array.from(dayWiseStatus.values()).filter((s) => s === 'PRESENT').length;
      const weekAbsent = Array.from(dayWiseStatus.values()).filter((s) => s === 'ABSENT').length;

      setStats({
        totalStudents: studentList.length,
        todayPresentCount: todayPresent,
        todayAbsentCount: todayAbsent,
        weekPresentCount: weekPresent,
        weekAbsentCount: weekAbsent,
      });

      const todayName = new Date().toLocaleDateString('en-US', { weekday: 'long' });
      const lectures = (Array.isArray(timetable) ? timetable : [])
        .filter((t: any) => t.day === todayName)
        .sort((a: any, b: any) => (a.startTime || '').localeCompare(b.startTime || ''));
      setTodayLectures(lectures);
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStats();
    const onUpdate = () => { loadStats(true); };
    window.addEventListener('attendance:update', onUpdate as EventListener);

    let bc: BroadcastChannel | null = null;
    try {
      bc = new BroadcastChannel('attendance_channel');
      bc.onmessage = () => { loadStats(true); };
    } catch (e) {
      bc = null;
    }

    return () => {
      window.removeEventListener('attendance:update', onUpdate as EventListener);
      try { if (bc) bc.close(); } catch (e) {}
    };
  }, [loadStats]);

  if (loading) {
    return (
      <DashboardLayout role={UserRole.TEACHER}>
        <div className="loading-container">
          <div className="spinner"></div>
          <p>Loading dashboard...</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout role={UserRole.TEACHER}>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
        <div>
          <h1>Teacher Dashboard</h1>
          <p>Manage your students and track attendance efficiently.</p>
        </div>
        <div
          style={{
            alignSelf: 'flex-start',
            padding: '6px 12px',
            borderRadius: 999,
            background: '#e8f1ff',
            color: '#003366',
            fontWeight: 700,
            fontSize: '0.82rem',
            border: '1px solid #bfdbfe',
          }}
        >
          {currentWeekday}
        </div>
      </div>

      <div className="grid-4" style={{ marginBottom: '32px' }}>
        <div className="stat-card info">
          <div className="stat-icon info">👨‍🎓</div>
          <div>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '4px' }}>Total Students</p>
            <p style={{ fontSize: '2rem', fontWeight: '700', color: 'var(--primary-color)' }}>{stats.totalStudents}</p>
          </div>
        </div>

        <div className="stat-card success">
          <div className="stat-icon success">✅</div>
          <div>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '4px' }}>Today Present</p>
            <p style={{ fontSize: '2rem', fontWeight: '700', color: 'var(--primary-color)' }}>{stats.todayPresentCount}</p>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-light)' }}>Out of {stats.totalStudents} students</p>
          </div>
        </div>

        <div className="stat-card danger">
          <div className="stat-icon danger">❌</div>
          <div>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '4px' }}>Today Absent</p>
            <p style={{ fontSize: '2rem', fontWeight: '700', color: 'var(--danger-color)' }}>{stats.todayAbsentCount}</p>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-light)' }}>Out of {stats.totalStudents} students</p>
          </div>
        </div>

        <div className="stat-card warning">
          <div className="stat-icon warning">📅</div>
          <div>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '4px' }}>This Week</p>
            <p style={{ fontSize: '1.1rem', fontWeight: '700', color: 'var(--primary-color)' }}>
              P: {stats.weekPresentCount} | A: {stats.weekAbsentCount}
            </p>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-light)' }}>Monday to Saturday</p>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '16px', marginBottom: '32px', flexWrap: 'wrap' }}>
        <Link href="/teacher/add-student" className="btn btn-lg">Add New Student</Link>
        <Link href="/teacher/attendance" className="btn btn-lg btn-outline">Mark Attendance</Link>
        <Link href="/teacher/reports" className="btn btn-lg btn-outline">View Reports</Link>
      </div>

      <div className="card">
        <h3 style={{ color: 'var(--primary-color)', marginBottom: '16px' }}>Quick Actions</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
          <Link href="/teacher/students" style={{ textDecoration: 'none' }}>
            <div className="card" style={{ margin: 0, textAlign: 'center', cursor: 'pointer' }}>
              <div style={{ fontSize: '32px', marginBottom: '8px' }}>👨‍🎓</div>
              <h4 style={{ color: 'var(--primary-color)', marginBottom: '4px' }}>My Students</h4>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>View and manage students</p>
            </div>
          </Link>

          <Link href="/teacher/timetable" style={{ textDecoration: 'none' }}>
            <div className="card" style={{ margin: 0, cursor: 'pointer' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <h4 style={{ color: 'var(--primary-color)', margin: 0 }}>Today's Lectures</h4>
                <span style={{ fontSize: '1.1rem' }}>🗓️</span>
              </div>
              {todayLectures.length === 0 ? (
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>No lectures scheduled today.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {todayLectures.slice(0, 3).map((lec: any) => (
                    <div key={lec.id} style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                      <strong style={{ color: 'var(--text-primary)' }}>{lec.subject}</strong> {lec.startTime} - {lec.endTime}
                    </div>
                  ))}
                  {todayLectures.length > 3 && (
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-light)' }}>
                      +{todayLectures.length - 3} more (open timetable)
                    </div>
                  )}
                </div>
              )}
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.78rem', marginTop: 8 }}>Tap to manage timetable</p>
            </div>
          </Link>
        </div>
      </div>
    </DashboardLayout>
  );
}
