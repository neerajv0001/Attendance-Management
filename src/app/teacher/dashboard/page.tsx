'use client';

import { useEffect, useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { UserRole } from '@/lib/types';
import Link from 'next/link';

export default function TeacherDashboard() {
  const [stats, setStats] = useState({
    totalStudents: 0,
    todayPresentPct: 0,
    todayAbsentPct: 0,
    todayPresentCount: 0,
    todayAbsentCount: 0,
    weeklyPresentPct: 0,
    weeklyAbsentPct: 0,
    weeklyPresentCount: 0,
    weeklyAbsentCount: 0,
    weeklyPossible: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch('/api/students').then(r => r.json()),
      fetch('/api/attendance').then(r => r.json())
    ]).then(([students, attendance]) => {
      const today = new Date();
      const todayKey = today.toISOString().split('T')[0];
      const todayAttendance = attendance.filter((a: any) => a.date === todayKey);

      // compute today's present/absent counts
      const todayPresent = todayAttendance.filter((a: any) => a.status === 'PRESENT').length;
      const todayAbsent = todayAttendance.filter((a: any) => a.status === 'ABSENT').length;

      // Compute weekly range: Monday -> Saturday (exclude Sunday)
      const d = new Date();
      const day = d.getDay(); // 0 (Sun) - 6 (Sat)
      const diffToMonday = day === 0 ? -6 : 1 - day;
      const weekStart = new Date(d);
      weekStart.setDate(d.getDate() + diffToMonday);
      const weekDates: string[] = [];
      for (let i = 0; i < 6; i++) { // Monday..Saturday (6 days)
        const dd = new Date(weekStart);
        dd.setDate(weekStart.getDate() + i);
        weekDates.push(dd.toISOString().split('T')[0]);
      }

      const weeklyRecords = attendance.filter((a: any) => weekDates.includes(a.date));
      const weeklyPresent = weeklyRecords.filter((a: any) => a.status === 'PRESENT').length;
      const weeklyAbsent = weeklyRecords.filter((a: any) => a.status === 'ABSENT').length;
      const possible = students.length * 6; // possible marks in week (Mon-Sat)

      const todayPresentPct = students.length > 0 ? Math.min(100, (todayPresent / students.length) * 100) : 0;
      const todayAbsentPct = students.length > 0 ? Math.min(100, (todayAbsent / students.length) * 100) : 0;
      const weeklyPresentPct = possible > 0 ? Math.min(100, (weeklyPresent / possible) * 100) : 0;
      const weeklyAbsentPct = possible > 0 ? Math.min(100, (weeklyAbsent / possible) * 100) : 0;

      setStats({
        totalStudents: students.length,
        todayPresentPct,
        todayAbsentPct,
        todayPresentCount: todayPresent,
        todayAbsentCount: todayAbsent,
        weeklyPresentPct,
        weeklyAbsentPct,
        weeklyPresentCount: weeklyPresent,
        weeklyAbsentCount: weeklyAbsent,
        weeklyPossible: possible
      });
      setLoading(false);
    });
  }, []);

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
      <div className="page-header">
        <h1>Teacher Dashboard</h1>
        <p>Manage your students and track attendance efficiently.</p>
      </div>
      
      <div className="grid-3" style={{ marginBottom: '32px' }}>
        <div className="stat-card info">
          <div className="stat-icon info">👨‍🎓</div>
          <div>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '4px' }}>Total Students</p>
            <p style={{ fontSize: '2rem', fontWeight: '700', color: 'var(--primary-color)' }}>{stats.totalStudents}</p>
          </div>
        </div>
        <div className="stat-card success">
          <div className="stat-icon success">✓</div>
          <div>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '6px' }}>Today's Attendance</p>
            <div style={{ display: 'flex', gap: '12px', alignItems: 'baseline' }}>
              <div>
                <p style={{ margin: 0, fontSize: '1rem', color: 'var(--text-secondary)' }}>Present</p>
                <p style={{ fontSize: '1.5rem', fontWeight: '700', color: 'var(--primary-color)' }}>{(stats.todayPresentPct ?? 0).toFixed(0)}%</p>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-light)' }}>{stats.todayPresentCount} of {stats.totalStudents}</p>
              </div>
              <div>
                <p style={{ margin: 0, fontSize: '1rem', color: 'var(--text-secondary)' }}>Absent</p>
                <p style={{ fontSize: '1.5rem', fontWeight: '700', color: 'var(--danger-color)' }}>{(stats.todayAbsentPct ?? 0).toFixed(0)}%</p>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-light)' }}>{stats.todayAbsentCount} of {stats.totalStudents}</p>
              </div>
            </div>
          </div>
        </div>
        <div className="stat-card warning">
          <div className="stat-icon warning">📈</div>
          <div>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '6px' }}>Weekly (Mon–Sat)</p>
            <div style={{ display: 'flex', gap: '12px', alignItems: 'baseline' }}>
              <div>
                <p style={{ margin: 0, fontSize: '1rem', color: 'var(--text-secondary)' }}>Present</p>
                <p style={{ fontSize: '1.5rem', fontWeight: '700', color: 'var(--primary-color)' }}>{(stats.weeklyPresentPct ?? 0).toFixed(1)}%</p>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-light)' }}>{stats.weeklyPresentCount} of {stats.weeklyPossible}</p>
              </div>
              <div>
                <p style={{ margin: 0, fontSize: '1rem', color: 'var(--text-secondary)' }}>Absent</p>
                <p style={{ fontSize: '1.5rem', fontWeight: '700', color: 'var(--danger-color)' }}>{(stats.weeklyAbsentPct ?? 0).toFixed(1)}%</p>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-light)' }}>{stats.weeklyAbsentCount} of {stats.weeklyPossible}</p>
              </div>
            </div>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-light)', marginTop: 8 }}>Monday — Saturday</p>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '16px', marginBottom: '32px', flexWrap: 'wrap' }}>
        <Link href="/teacher/add-student" className="btn btn-lg">
          <span>➕</span>
          Add New Student
        </Link>
        <Link href="/teacher/attendance" className="btn btn-lg btn-outline">
          <span>✓</span>
          Mark Attendance
        </Link>
        <Link href="/teacher/reports" className="btn btn-lg btn-outline">
          <span>📊</span>
          View Reports
        </Link>
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
            <div className="card" style={{ margin: 0, textAlign: 'center', cursor: 'pointer' }}>
              <div style={{ fontSize: '32px', marginBottom: '8px' }}>📅</div>
              <h4 style={{ color: 'var(--primary-color)', marginBottom: '4px' }}>Timetable</h4>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Manage class schedule</p>
            </div>
          </Link>
        </div>
      </div>
    </DashboardLayout>
  );
}
