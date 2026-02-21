"use client";

import React, { useEffect, useState } from 'react';
import { useToast } from '@/components/ToastProvider';
import { v4 as uuidv4 } from 'uuid';
import DashboardLayout from '@/components/DashboardLayout';
import { UserRole } from '@/lib/types';
import Modal from '@/components/Modal';

interface Notice { id: string; title: string; message: string; createdAt: string }

export default function TeacherNoticesPage() {
  const [notices, setNotices] = useState<Notice[]>([]);
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState<Notice | null>(null);
  const [deleting, setDeleting] = useState<Notice | null>(null);
  const toast = useToast();

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
    es.addEventListener('notice_created', (ev: any) => { try { const payload = JSON.parse(ev.data); setNotices(prev => [payload, ...prev]); } catch {} });
    es.addEventListener('notice_deleted', (ev: any) => { try { const payload = JSON.parse(ev.data); setNotices(prev => prev.filter(n => n.id !== payload.id)); } catch {} });
    es.addEventListener('notice_updated', (ev: any) => { try { const payload = JSON.parse(ev.data); setNotices(prev => prev.map(n => n.id === payload.id ? payload : n)); } catch {} });
    return () => es.close();
  }, []);

  const handleSend = async () => {
    if (!title.trim() || !message.trim()) return toast.showToast?.('Title and message required', 'error');
    setLoading(true);
    try {
      const res = await fetch('/api/notices', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title, message }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to send');
      toast.showToast?.('Notice broadcasted successfully!', 'success');
      setTitle(''); setMessage('');
    } catch (err: any) {
      toast.showToast?.(err.message || 'Failed to send notice', 'error');
    } finally { setLoading(false); }
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/notices/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to delete');
      toast.showToast?.('Notice deleted!', 'success');
      setNotices(prev => prev.filter(n => n.id !== id));
    } catch (err: any) {
      toast.showToast?.(err.message || 'Failed to delete', 'error');
    }
  };

  const openEdit = (n: Notice) => setEditing(n);
  const closeEdit = () => setEditing(null);

  const saveEdit = async (payload: Partial<Notice>) => {
    if (!editing) return;
    try {
      const res = await fetch(`/api/notices/${editing.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update');
      toast.showToast?.('Notice updated!', 'success');
      closeEdit();
      setNotices(prev => prev.map(n => n.id === data.notice.id ? data.notice : n));
    } catch (err: any) {
      toast.showToast?.(err.message || 'Failed to update', 'error');
    }
  };

  const content = (
    <div>
      <h2>Notices</h2>
      <div className="card" style={{ marginBottom: 20, maxWidth: 800 }}>
        <div style={{ display: 'flex', gap: 12 }}>
          <div style={{ flex: 1 }}>
            <input className="form-control" placeholder="Title" value={title} onChange={e => setTitle(e.target.value)} />
            <textarea className="form-control" placeholder="Message" value={message} onChange={e => setMessage(e.target.value)} style={{ marginTop: 8, minHeight: 120 }} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'flex-end' }}>
            <button onClick={handleSend} disabled={loading} className="btn btn-primary" title="Send Notice">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M22 2L11 13"/><path d="M22 2l-7 20-4-9-9-4 20-7z"/></svg>
              <span style={{ marginLeft: 8 }}>Send</span>
            </button>
          </div>
        </div>
      </div>

      <div>
        {notices.length === 0 && <p>No notices yet.</p>}
        {notices.map(n => (
          <div key={n.id} className="card" style={{ marginBottom: 10, padding: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <div>
                <strong>{n.title}</strong>
                <div style={{ fontSize: 12, color: '#666' }}>{new Date(n.createdAt).toLocaleString()}</div>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn btn-outline" onClick={() => openEdit(n)} title="Edit">✏️</button>
                <button
                  className="btn btn-danger"
                  onClick={() => setDeleting(n)}
                >
                  Delete
                </button>
              </div>
            </div>
            <div style={{ marginTop: 8 }}>{n.message}</div>
          </div>
        ))}
      </div>

      {/* Edit Modal */}
      {editing && (
        <div className="modal-overlay" onClick={closeEdit}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header"><h3>Edit Notice</h3></div>
            <div className="modal-body">
              <input className="form-control" value={editing.title} onChange={e => setEditing({ ...editing, title: e.target.value })} />
              <textarea className="form-control" style={{ marginTop: 8, minHeight: 120 }} value={editing.message} onChange={e => setEditing({ ...editing, message: e.target.value })} />
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={closeEdit}>Cancel</button>
              <button className="btn btn-primary" onClick={() => saveEdit({ title: editing.title, message: editing.message })}>Save</button>
            </div>
          </div>
        </div>
      )}
      <Modal open={!!deleting} onClose={() => setDeleting(null)}>
        <div className="modal-header"><h3>Confirm delete</h3></div>
        <div className="modal-body">
          <p>Are you sure? This cannot be undone.</p>
        </div>
        <div className="modal-footer" style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button className="btn btn-danger" onClick={async () => { if (!deleting) return; const id = deleting.id; setDeleting(null); await handleDelete(id); }}>Delete</button>
          <button className="btn btn-outline" onClick={() => setDeleting(null)}>Cancel</button>
        </div>
      </Modal>
    </div>
  );

  return (
    <DashboardLayout role={UserRole.TEACHER}>
      {content}
    </DashboardLayout>
  );
}
