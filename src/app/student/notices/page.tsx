"use client";

import React, { useEffect, useState } from 'react';
import { useToast } from '@/components/ToastProvider';
import DashboardLayout from '@/components/DashboardLayout';
import { UserRole } from '@/lib/types';

interface Notice { id: string; title: string; message: string; createdAt: string }

export default function StudentNoticesPage() {
  const [notices, setNotices] = useState<Notice[]>([]);
  const [readIds, setReadIds] = useState<string[]>([]);
  const toast = useToast();

  useEffect(() => {
    try {
      const saved = localStorage.getItem('readNotices');
      setReadIds(saved ? JSON.parse(saved) : []);
    } catch (e) { setReadIds([]); }
  }, []);

  const fetchNotices = async () => {
    try {
      const res = await fetch('/api/notices');
      const data = await res.json();
      if (res.ok) setNotices(data.notices || []);
    } catch (e) {}
  };

  useEffect(() => { fetchNotices(); }, []);
  useEffect(() => {
    const es = new EventSource('/api/notices/stream');
    es.addEventListener('notice_created', (ev: any) => {
      try { const payload = JSON.parse(ev.data); toast.showToast?.('New Notice Received!', 'info'); setNotices(prev => [payload, ...prev]); } catch (e) {}
    });
    es.addEventListener('notice_deleted', (ev: any) => { try { const payload = JSON.parse(ev.data); setNotices(prev => prev.filter(n => n.id !== payload.id)); } catch (e) {} });
    es.addEventListener('notice_updated', (ev: any) => { try { const payload = JSON.parse(ev.data); setNotices(prev => prev.map(n => n.id === payload.id ? payload : n)); } catch (e) {} });
    return () => es.close();
  }, []);

  const dismiss = (id: string) => {
    const next = Array.from(new Set([...readIds, id]));
    setReadIds(next);
    try { localStorage.setItem('readNotices', JSON.stringify(next)); } catch (e) {}
  };

  const visible = notices.filter(n => !readIds.includes(n.id));

  const content = (
    <div>
      <h2>Notices</h2>
      {visible.length === 0 && <p>No new notices.</p>}
      {visible.map(n => (
        <div key={n.id} className="card" style={{ marginBottom: 10, padding: 12, position: 'relative' }}>
          <button onClick={() => dismiss(n.id)} title="Dismiss" className="btn btn-outline" style={{ position: 'absolute', right: 12, top: 12 }}>✕</button>
          <div>
            <strong>{n.title}</strong>
            <div style={{ fontSize: 12, color: '#666' }}>{new Date(n.createdAt).toLocaleString()}</div>
          </div>
          <div style={{ marginTop: 8 }}>{n.message}</div>
        </div>
      ))}
    </div>
  );

  return (
    <DashboardLayout role={UserRole.STUDENT}>
      {content}
    </DashboardLayout>
  );
}
