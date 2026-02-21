'use client';

import { useEffect, useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { UserRole } from '@/lib/types';

export default function StudentTimetable() {
  const [timetable, setTimetable] = useState<Record<string, any[]>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/timetable')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          // Group by day
          const grouped: Record<string, any[]> = {};
          ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].forEach(day => {
            grouped[day] = data.filter((item: any) => item.day === day).sort((a, b) => a.startTime.localeCompare(b.startTime));
          });
          setTimetable(grouped);
        }
        setLoading(false);
      });
  }, []);

  if (loading) return <div>Loading...</div>;

  return (
    <DashboardLayout role={UserRole.STUDENT}>
      <h1 style={{ marginBottom: '20px', color: '#003366' }}>My Timetable</h1>
      
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
        {Object.entries(timetable).map(([day, items]) => (
          items.length > 0 && (
            <div className="card" key={day} style={{ background: '#fff', borderTop: '4px solid #0056b3' }}>
              <h3 style={{ borderBottom: '1px solid #eee', paddingBottom: '10px', marginBottom: '10px' }}>{day}</h3>
              {items.map((item: any) => (
                <div key={item.id} style={{ marginBottom: '10px', padding: '10px', background: '#f8f9fa', borderRadius: '4px' }}>
                  <div style={{ fontWeight: 'bold', color: '#003366' }}>{item.subject}</div>
                  <div style={{ fontSize: '0.9rem', color: '#666' }}>{item.startTime} - {item.endTime}</div>
                </div>
              ))}
            </div>
          )
        ))}
      </div>
      
      {Object.values(timetable).every(items => items && items.length === 0) && (
        <p>No timetable available.</p>
      )}

    </DashboardLayout>
  );
}
