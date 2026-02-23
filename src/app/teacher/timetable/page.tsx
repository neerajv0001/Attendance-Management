'use client';

import { useEffect, useMemo, useState, useCallback } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { UserRole } from '@/lib/types';
import { useToast } from '@/components/ToastProvider';

type TimetableEntry = {
  id: string;
  subject: string;
  day: string;
  startTime: string;
  endTime: string;
  teacherId?: string;
};

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const DAY_INDEX: Record<string, number> = DAYS.reduce((acc, day, idx) => ({ ...acc, [day]: idx }), {});

export default function TimetablePage() {
  const [formData, setFormData] = useState({
    subject: '',
    day: 'Monday',
    startTime: '',
    endTime: ''
  });
  const [entries, setEntries] = useState<TimetableEntry[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [loading, setLoading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const toast = useToast();

  const loadEntries = useCallback(async () => {
    try {
      const res = await fetch('/api/timetable', { cache: 'no-store' });
      const data = await res.json();
      setEntries(Array.isArray(data) ? data : []);
    } catch (e) {
      setEntries([]);
    } finally {
      setLoadingList(false);
    }
  }, []);

  useEffect(() => {
    loadEntries();
  }, [loadEntries]);

  useEffect(() => {
    const onUpdate = (event: any) => {
      const msg = event?.detail;
      if (!msg || msg.type !== 'timetable_updated') return;
      loadEntries();
    };
    window.addEventListener('attendance:update', onUpdate as any);
    return () => window.removeEventListener('attendance:update', onUpdate as any);
  }, [loadEntries]);

  const upcomingLectures = useMemo(() => {
    const now = new Date();
    const jsDay = now.getDay(); // Sun=0, Mon=1, ... Sat=6
    const todayIdx = jsDay === 0 ? 0 : jsDay - 1;
    const nowMinutes = now.getHours() * 60 + now.getMinutes();
    const toMinutes = (t: string) => {
      const [h, m] = t.split(':').map(Number);
      return (h || 0) * 60 + (m || 0);
    };

    return [...entries].sort((a, b) => {
      const aIdx = DAY_INDEX[a.day] ?? 0;
      const bIdx = DAY_INDEX[b.day] ?? 0;
      const aRelative = (aIdx - todayIdx + DAYS.length) % DAYS.length;
      const bRelative = (bIdx - todayIdx + DAYS.length) % DAYS.length;
      if (aRelative !== bRelative) return aRelative - bRelative;

      if (aRelative === 0) {
        const aPassed = toMinutes(a.startTime) < nowMinutes;
        const bPassed = toMinutes(b.startTime) < nowMinutes;
        if (aPassed !== bPassed) return aPassed ? 1 : -1;
      }

      return toMinutes(a.startTime) - toMinutes(b.startTime);
    });
  }, [entries]);
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch('/api/timetable', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      
      if (res.ok) {
        const data = await res.json();
        toast.showToast?.('Timetable entry added successfully!', 'success');
        try {
          const bc = new BroadcastChannel('attendance_channel');
          bc.postMessage({ type: 'timetable_updated', source: 'teacher-timetable' });
          bc.close();
        } catch (e) {}
        if (data?.entry) {
          setEntries(prev => [data.entry, ...prev]);
        } else {
          loadEntries();
        }
        setFormData({ subject: '', day: 'Monday', startTime: '', endTime: '' });
      } else {
        toast.showToast?.('Failed to add timetable entry', 'error');
      }
    } catch (e) {
      toast.showToast?.('Failed to add timetable entry', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      const res = await fetch('/api/timetable', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });

      if (res.ok) {
        setEntries(prev => prev.filter(entry => entry.id !== id));
        toast.showToast?.('Lecture deleted successfully!', 'success');
        try {
          const bc = new BroadcastChannel('attendance_channel');
          bc.postMessage({ type: 'timetable_updated', source: 'teacher-timetable' });
          bc.close();
        } catch (e) {}
      } else {
        const data = await res.json().catch(() => ({}));
        toast.showToast?.(data?.error || 'Failed to delete lecture', 'error');
      }
    } catch (e) {
      toast.showToast?.('Failed to delete lecture', 'error');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <DashboardLayout role={UserRole.TEACHER}>
      <h1 style={{ marginBottom: '20px', color: '#003366' }}>Create Timetable</h1>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
        <div className="card">
          <form onSubmit={handleSubmit}>
            <div className="input-group">
              <label>Subject</label>
              <input type="text" className="form-control" required
                value={formData.subject} onChange={(e) => setFormData({ ...formData, subject: e.target.value })} />
            </div>

            <div className="input-group">
              <label>Day</label>
              <select className="form-control"
                value={formData.day} onChange={(e) => setFormData({ ...formData, day: e.target.value })}>
                {DAYS.map(day => (
                  <option key={day} value={day}>{day}</option>
                ))}
              </select>
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <div className="input-group" style={{ flex: 1 }}>
                <label>Start Time</label>
                <input type="time" className="form-control" required
                  value={formData.startTime} onChange={(e) => setFormData({ ...formData, startTime: e.target.value })} />
              </div>
              <div className="input-group" style={{ flex: 1 }}>
                <label>End Time</label>
                <input type="time" className="form-control" required
                  value={formData.endTime} onChange={(e) => setFormData({ ...formData, endTime: e.target.value })} />
              </div>
            </div>

            <button type="submit" className="btn" disabled={loading}>
              {loading ? 'Saving...' : 'Add to Timetable'}
            </button>
          </form>
        </div>

        <div className="card" style={{ alignSelf: 'start' }}>
          <h3 style={{ marginBottom: 12 }}>Scheduled Lectures</h3>
          {loadingList ? (
            <p style={{ color: 'var(--text-secondary)' }}>Loading schedule...</p>
          ) : upcomingLectures.length === 0 ? (
            <p style={{ color: 'var(--text-secondary)' }}>No lectures scheduled yet.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {upcomingLectures.map((entry) => (
                <div key={entry.id} style={{ padding: 10, border: '1px solid var(--border-color)', borderRadius: 10, background: 'var(--card-bg)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
                    <strong style={{ color: 'var(--text-primary)' }}>{entry.subject}</strong>
                    <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>{entry.day}</span>
                  </div>
                  <div style={{ marginTop: 4, color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                    {entry.startTime} - {entry.endTime}
                  </div>
                  <div style={{ marginTop: 8, display: 'flex', justifyContent: 'flex-end' }}>
                    <button
                      type="button"
                      className="btn btn-sm btn-danger"
                      onClick={() => handleDelete(entry.id)}
                      disabled={deletingId === entry.id}
                    >
                      {deletingId === entry.id ? 'Deleting...' : 'Delete'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
