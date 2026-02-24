'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { UserRole } from '@/lib/types';

const WEEK_DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'] as const;
type TimetableItem = {
  id: string;
  subject: string;
  day: string;
  startTime: string;
  endTime: string;
  teacherId?: string;
  teacherName?: string;
  isLunchBreak?: boolean;
  isCancelled?: boolean;
};

export default function StudentTimetable() {
  const [timetable, setTimetable] = useState<Record<string, TimetableItem[]>>({});
  const [selectedDay, setSelectedDay] = useState<string>('Monday');
  const [loading, setLoading] = useState(true);

  const loadTimetable = useCallback(() => {
    fetch('/api/timetable', { cache: 'no-store' })
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          // Group by day
          const grouped: Record<string, TimetableItem[]> = {};
          WEEK_DAYS.forEach(day => {
            grouped[day] = data
              .filter((item: TimetableItem) => item.day === day)
              .sort((a: TimetableItem, b: TimetableItem) => a.startTime.localeCompare(b.startTime));
          });
          setTimetable(grouped);
        } else {
          setTimetable({});
        }
        setLoading(false);
      })
      .catch(() => {
        setTimetable({});
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    loadTimetable();
  }, [loadTimetable]);

  const selectedDayItems = useMemo(() => timetable[selectedDay] || [], [timetable, selectedDay]);
  const selectedDayLunchBreak = useMemo(
    () => selectedDayItems.find((item) => item.isLunchBreak),
    [selectedDayItems]
  );
  const selectedDayLectures = useMemo(
    () => selectedDayItems.filter((item) => !item.isLunchBreak),
    [selectedDayItems]
  );

  useEffect(() => {
    const today = new Date().toLocaleDateString('en-US', { weekday: 'long' });
    if (WEEK_DAYS.includes(today as typeof WEEK_DAYS[number])) {
      setSelectedDay(today);
    } else {
      setSelectedDay('Monday');
    }
  }, []);

  useEffect(() => {
    const onUpdate = (event: any) => {
      const msg = event?.detail;
      if (!msg) return;
      if (msg.type === 'timetable_updated') {
        loadTimetable();
      }
    };
    window.addEventListener('attendance:update', onUpdate as any);
    return () => window.removeEventListener('attendance:update', onUpdate as any);
  }, [loadTimetable]);

  if (loading) return <div>Loading...</div>;

  return (
    <DashboardLayout role={UserRole.STUDENT}>
      <h1 style={{ marginBottom: '20px', color: '#003366' }}>My Timetable</h1>

      <div className="card" style={{ marginBottom: '16px', padding: '14px 16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <label style={{ fontWeight: 600, color: 'var(--text-primary)' }}>Select Day</label>
          <select
            className="form-control"
            value={selectedDay}
            onChange={(e) => setSelectedDay(e.target.value)}
            style={{ maxWidth: 220 }}
          >
            {WEEK_DAYS.map(day => (
              <option key={day} value={day}>{day}</option>
            ))}
          </select>
        </div>
      </div>
      
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
        <div className="card" style={{ background: '#fff', borderTop: '4px solid #0056b3' }}>
          <h3 style={{ borderBottom: '1px solid #eee', paddingBottom: '10px', marginBottom: '10px' }}>{selectedDay}</h3>
          {selectedDayLunchBreak && (
            <div
              style={{
                marginBottom: 12,
                padding: '10px 12px',
                borderRadius: 10,
                background: 'linear-gradient(135deg, #dcfce7, #bbf7d0)',
                border: '1px solid #86efac',
                boxShadow: '0 0 0 2px rgba(34,197,94,0.15), 0 8px 20px rgba(34,197,94,0.15)',
              }}
            >
              <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#166534', letterSpacing: 0.4 }}>LUNCH BREAK</div>
              <div style={{ fontSize: '1rem', fontWeight: 800, color: '#14532d' }}>
                {selectedDayLunchBreak.startTime} - {selectedDayLunchBreak.endTime}
              </div>
            </div>
          )}
          {selectedDayLectures.length === 0 ? (
            <p style={{ color: 'var(--text-secondary)' }}>No classes for {selectedDay}.</p>
          ) : selectedDayLectures.map((item: TimetableItem) => (
            <div
              key={item.id}
              style={{
                marginBottom: '10px',
                padding: '10px',
                background: item.isCancelled ? '#fff1f2' : '#f8f9fa',
                borderRadius: '4px',
                border: item.isCancelled ? '1px solid #fecaca' : '1px solid transparent',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                <div style={{ fontWeight: 'bold', color: '#003366', textDecoration: item.isCancelled ? 'line-through' : 'none' }}>
                  {item.subject}
                </div>
              </div>
              <div style={{ fontSize: '0.9rem', color: '#666' }}>{item.startTime} - {item.endTime}</div>
              <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                Teacher: {item.teacherName || item.teacherId || 'N/A'}
              </div>
              {item.isCancelled && (
                <div style={{ marginTop: 6 }}>
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      padding: '3px 10px',
                      borderRadius: 999,
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      background: '#fee2e2',
                      color: '#b91c1c',
                      border: '1px solid #fca5a5',
                    }}
                  >
                    Cancelled
                  </span>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
      
      {Object.values(timetable).every(items => items && items.length === 0) && (
        <p>No timetable available.</p>
      )}

    </DashboardLayout>
  );
}
