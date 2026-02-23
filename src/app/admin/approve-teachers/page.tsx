'use client';

import { useEffect, useState, useCallback } from 'react';
import { useToast } from '@/components/ToastProvider';
import DashboardLayout from '@/components/DashboardLayout';
import { UserRole } from '@/lib/types';

export default function ApproveTeachers() {
  const [teachers, setTeachers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const toast = useToast();

  const loadPending = useCallback(() => {
    fetch('/api/admin/teachers?status=pending', { cache: 'no-store' })
      .then(res => res.json())
      .then(data => {
        setTeachers(data);
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    loadPending();
  }, [loadPending]);

  useEffect(() => {
    const onUpdate = (event: any) => {
      const msg = event?.detail;
      if (!msg) return;
      if (msg.type === 'teachers_updated') {
        loadPending();
      }
    };
    window.addEventListener('attendance:update', onUpdate as any);
    return () => window.removeEventListener('attendance:update', onUpdate as any);
  }, [loadPending]);

  const handleAction = async (teacherId: string, action: 'APPROVE' | 'REJECT') => {
    const teacher = teachers.find(t => t.id === teacherId);
    try {
      const res = await fetch('/api/admin/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ teacherId, action })
      });

      if (res.ok) {
        setTeachers(prev => prev.filter(t => t.id !== teacherId));
        try {
          const bc = new BroadcastChannel('attendance_channel');
          bc.postMessage({ type: 'teachers_updated', source: 'admin-approve-teachers' });
          bc.close();
        } catch (e) {}
        if (action === 'APPROVE') {
          toast.showToast?.(`Teacher ${teacher?.name || ''} Approved Successfully!`, 'success');
        } else {
          toast.showToast?.(`Teacher ${teacher?.name || ''} Rejected`, 'info');
        }
      } else {
        toast.showToast?.('Operation failed', 'error');
      }
    } catch (error) {
      toast.showToast?.('Error performing action', 'error');
    }
  };

  if (loading) return <div>Loading...</div>;

  return (
    <DashboardLayout role={UserRole.ADMIN}>
      <h1 style={{ marginBottom: '20px', color: '#003366' }}>Approve Teachers</h1>
      
      {teachers.length > 0 ? (
        <div className="card">
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f4f7fa', textAlign: 'left' }}>
                <th style={{ padding: '15px' }}>Name</th>
                <th style={{ padding: '15px' }}>Email</th>
                <th style={{ padding: '15px' }}>Subject</th>
                <th style={{ padding: '15px' }}>Qualification</th>
                <th style={{ padding: '15px' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {teachers.map(teacher => (
                <tr key={teacher.id} style={{ borderBottom: '1px solid #eee' }}>
                  <td style={{ padding: '15px' }}>{teacher.name}</td>
                  <td style={{ padding: '15px' }}>{teacher.email}</td>
                  <td style={{ padding: '15px' }}>{teacher.subject}</td>
                  <td style={{ padding: '15px' }}>{teacher.qualification}</td>
                  <td style={{ padding: '15px', display: 'flex', gap: '10px' }}>
                    <button 
                      onClick={() => handleAction(teacher.id, 'APPROVE')}
                      className="btn" 
                      style={{ background: '#28a745', padding: '5px 15px', fontSize: '0.8rem' }}
                    >
                      Approve
                    </button>
                    <button 
                      onClick={() => handleAction(teacher.id, 'REJECT')}
                      className="btn" 
                      style={{ background: '#dc3545', padding: '5px 15px', fontSize: '0.8rem' }}
                    >
                      Reject
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="card">No pending approvals found.</div>
      )}
    </DashboardLayout>
  );
}
