'use client';

import { useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { UserRole } from '@/lib/types';

export default function TimetablePage() {
  const [formData, setFormData] = useState({
    subject: '',
    day: 'Monday',
    startTime: '',
    endTime: ''
  });
  const [loading, setLoading] = useState(false);

  // In real app, fetch existing timetable too.
  
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
        alert('Timetable Entry Added');
        setFormData({ subject: '', day: 'Monday', startTime: '', endTime: '' });
      } else {
        alert('Failed');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardLayout role={UserRole.TEACHER}>
      <h1 style={{ marginBottom: '20px', color: '#003366' }}>Create Timetable</h1>
      
      <div className="card" style={{ maxWidth: '600px' }}>
        <form onSubmit={handleSubmit}>
          <div className="input-group">
            <label>Subject</label>
            <input type="text" className="form-control" required 
              value={formData.subject} onChange={(e) => setFormData({...formData, subject: e.target.value})} />
          </div>

          <div className="input-group">
            <label>Day</label>
            <select className="form-control" 
              value={formData.day} onChange={(e) => setFormData({...formData, day: e.target.value})}>
              {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map(day => (
                <option key={day} value={day}>{day}</option>
              ))}
            </select>
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <div className="input-group" style={{ flex: 1 }}>
              <label>Start Time</label>
              <input type="time" className="form-control" required 
                value={formData.startTime} onChange={(e) => setFormData({...formData, startTime: e.target.value})} />
            </div>
            <div className="input-group" style={{ flex: 1 }}>
              <label>End Time</label>
              <input type="time" className="form-control" required 
                value={formData.endTime} onChange={(e) => setFormData({...formData, endTime: e.target.value})} />
            </div>
          </div>

          <button type="submit" className="btn" disabled={loading}>
            {loading ? 'Saving...' : 'Add to Timetable'}
          </button>
        </form>
      </div>
    </DashboardLayout>
  );
}
