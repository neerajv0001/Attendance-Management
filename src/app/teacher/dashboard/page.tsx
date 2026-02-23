'use client';

import { useEffect, useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { UserRole } from '@/lib/types';
import Link from 'next/link';

export default function TeacherDashboard() {
  const [stats, setStats] = useState({
    totalStudents: 0,
    todayPresentCount: 0,
    todayAbsentCount: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;

    const loadStats = async () => {
      try {
        const [students, attendance] = await Promise.all([
          fetch('/api/students').then((r) => r.json()),
          fetch('/api/attendance').then((r) => r.json())
        ]);

        const todayKey = new Date().toISOString().split('T')[0];
        const todayAttendance = (Array.isArray(attendance) ? attendance : []).filter((a: any) => a.date === todayKey);
        const todayPresent = todayAttendance.filter((a: any) => a.status === 'PRESENT').length;
        const todayAbsent = todayAttendance.filter((a: any) => a.status === 'ABSENT').length;

        if (!alive) return;
        setStats({
          totalStudents: Array.isArray(students) ? students.length : 0,
          todayPresentCount: todayPresent,
          todayAbsentCount: todayAbsent
        });
      } finally {
        if (alive) setLoading(false);
      }
    };

    loadStats();

    const onAttendanceUpdate = () => loadStats();
    window.addEventListener('attendance:update', onAttendanceUpdate as EventListener);
    const intervalId = setInterval(loadStats, 10000);

    return () => {
      alive = false;
      window.removeEventListener('attendance:update', onAttendanceUpdate as EventListener);
      clearInterval(intervalId);
    };
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
      </div>

      <div style={{ display: 'flex', gap: '16px', marginBottom: '32px', flexWrap: 'wrap' }}>
        <Link href="/teacher/add-student" className="btn btn-lg">
          <span>➕</span>
          Add New Student
        </Link>
        <Link href="/teacher/attendance" className="btn btn-lg btn-outline">
          <span>✅</span>
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
