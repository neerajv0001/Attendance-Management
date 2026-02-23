'use client';

import { useState, useEffect } from 'react';
import { useToast } from '@/components/ToastProvider';
import DashboardLayout from '@/components/DashboardLayout';
import { UserRole } from '@/lib/types';

export default function AdminStudents() {
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const toast = useToast();

  useEffect(() => {
    let mounted = true;
    const load = () => {
      fetch('/api/students', { cache: 'no-store' })
        .then(res => res.json())
        .then(data => {
          if (!mounted) return;
          setStudents(Array.isArray(data) ? data : []);
          setLoading(false);
        }).catch(() => {
          if (!mounted) return;
          toast.showToast?.('Failed to load students', 'error');
          setLoading(false);
        });
    };
    load();
    const onUpdate = (e: any) => {
      const d = e?.detail;
      if (!d) return;
      if (d.type === 'students_updated' || d.type === 'courses_updated') {
        load();
      }
    };
    window.addEventListener('attendance:update', onUpdate as any);
    return () => { mounted = false; window.removeEventListener('attendance:update', onUpdate as any); };
  }, []);

  if (loading) return <div>Loading...</div>;

  return (
    <DashboardLayout role={UserRole.ADMIN}>
      <h1 style={{ marginBottom: '20px', color: '#003366' }}>All Students</h1>
      
      {students.length > 0 ? (
        <div className="card">
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f4f7fa', textAlign: 'left' }}>
                <th style={{ padding: '15px' }}>Student ID</th>
                <th style={{ padding: '15px' }}>Name</th>
                <th style={{ padding: '15px' }}>Department</th>
                <th style={{ padding: '15px' }}>Created At</th>
              </tr>
            </thead>
            <tbody>
              {students.map(student => (
                <tr key={student.id} style={{ borderBottom: '1px solid #eee' }}>
                  <td style={{ padding: '15px', fontWeight: 'bold' }}>{student.id}</td>
                  <td style={{ padding: '15px' }}>{student.name}</td>
                  <td style={{ padding: '15px' }}>{student.department}</td>
                  <td style={{ padding: '15px' }}>{new Date(student.createdAt).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="card">No students found.</div>
      )}
    </DashboardLayout>
  );
}
