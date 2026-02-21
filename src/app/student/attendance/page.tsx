'use client';

import { useEffect, useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { useToast } from '@/components/ToastProvider';
import { UserRole } from '@/lib/types';

export default function StudentAttendanceHistory() {
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const toast = useToast();

  useEffect(() => {
    fetch('/api/attendance')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setHistory(data.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
        }
        setLoading(false);
      }).catch(() => {
        toast.showToast?.('Failed to load attendance data', 'error');
        setLoading(false);
      });
  }, []);

  if (loading) return <div>Loading...</div>;

  return (
    <DashboardLayout role={UserRole.STUDENT}>
      <h1 style={{ marginBottom: '20px', color: '#003366' }}>My Attendance History</h1>
      
      {history.length > 0 ? (
        <table style={{ width: '100%', borderCollapse: 'collapse', background: '#fff' }}>
          <thead>
            <tr style={{ background: '#f4f7fa', textAlign: 'left' }}>
              <th style={{ padding: '15px' }}>Date</th>
              <th style={{ padding: '15px' }}>Status</th>
              <th style={{ padding: '15px' }}>Teacher ID</th>
            </tr>
          </thead>
          <tbody>
            {history.map((record: any) => (
              <tr key={record.date + record.startTime} style={{ borderBottom: '1px solid #eee' }}>
                <td style={{ padding: '15px' }}>{record.date}</td>
                <td style={{ padding: '15px' }}>
                  <span style={{ 
                    padding: '5px 10px', 
                    borderRadius: '20px', 
                    background: record.status === 'PRESENT' ? '#d4edda' : '#f8d7da',
                    color: record.status === 'PRESENT' ? '#155724' : '#721c24',
                    fontWeight: 'bold',
                    fontSize: '0.8rem'
                  }}>
                    {record.status}
                  </span>
                </td>
                <td style={{ padding: '15px', color: '#666' }}>{record.teacherId || 'N/A'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <div className="card">No attendance records found.</div>
      )}
    </DashboardLayout>
  );
}
