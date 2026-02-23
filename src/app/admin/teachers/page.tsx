'use client';

import { useState, useEffect, useCallback } from 'react';
import { useToast } from '@/components/ToastProvider';
import DashboardLayout from '@/components/DashboardLayout';
import { UserRole } from '@/lib/types';

export default function AdminTeachers() {
  const [teachers, setTeachers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewing, setViewing] = useState<any | null>(null);
  const toast = useToast();

  const loadTeachers = useCallback(() => {
    fetch('/api/admin/teachers?status=approved', { cache: 'no-store' })
      .then(res => res.json())
      .then(data => {
        setTeachers(data);
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    loadTeachers();
  }, [loadTeachers]);

  useEffect(() => {
    const onUpdate = (event: any) => {
      const msg = event?.detail;
      if (!msg) return;
      if (msg.type === 'teachers_updated') {
        loadTeachers();
      }
    };
    window.addEventListener('attendance:update', onUpdate as any);
    return () => window.removeEventListener('attendance:update', onUpdate as any);
  }, [loadTeachers]);

  if (loading) return <div>Loading...</div>;

  return (
    <DashboardLayout role={UserRole.ADMIN}>
      <h1 style={{ marginBottom: '20px', color: '#003366' }}>All Teachers</h1>
      
      {teachers.length > 0 ? (
        <div className="card">
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f4f7fa', textAlign: 'left' }}>
                <th style={{ padding: '15px' }}>Name</th>
                <th style={{ padding: '15px' }}>Email</th>
                <th style={{ padding: '15px' }}>Subject</th>
                <th style={{ padding: '15px' }}>Experience</th>
                <th style={{ padding: '15px' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {teachers.map(teacher => (
                <tr key={teacher.id} style={{ borderBottom: '1px solid #eee' }}>
                  <td style={{ padding: '15px' }}>{teacher.name}</td>
                  <td style={{ padding: '15px' }}>{teacher.email}</td>
                  <td style={{ padding: '15px' }}>{teacher.subject}</td>
                  <td style={{ padding: '15px' }}>{teacher.experience} Years</td>
                  <td style={{ padding: '15px' }}>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button className="btn btn-sm btn-outline" onClick={() => setViewing(teacher)} type="button">View</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="card">No teachers found.</div>
      )}
      {viewing && (
        <div className="modal-overlay" onClick={() => setViewing(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header"><h3>Teacher Details</h3></div>
            <div className="modal-body">
              <p><strong>Name:</strong> {viewing.name}</p>
              <p><strong>Email:</strong> {viewing.email}</p>
              <p><strong>Subject:</strong> {viewing.subject}</p>
              <p><strong>Experience:</strong> {viewing.experience}</p>
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => setViewing(null)}>Close</button>
              <button className="btn btn-danger" onClick={async () => {
                // delete
                try {
                  const res = await fetch('/api/admin/teachers', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: viewing.id }) });
                  if (res.ok) {
                    setTeachers(teachers.filter(t => t.id !== viewing.id));
                    try {
                      const bc = new BroadcastChannel('attendance_channel');
                      bc.postMessage({ type: 'teachers_updated', source: 'admin-teachers' });
                      bc.close();
                    } catch (e) {}
                    setViewing(null);
                    toast.showToast?.('Record removed successfully.', 'success');
                  } else {
                    toast.showToast?.('Failed to delete teacher', 'error');
                  }
                } catch (e) {
                  toast.showToast && toast.showToast('Error deleting teacher', 'error', 4000);
                }
              }}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
