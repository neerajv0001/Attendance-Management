"use client";

import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { UserRole } from '@/lib/types';
import { useToast } from '@/components/ToastProvider';

export default function AdminCourses() {
  const [courses, setCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [newCourseName, setNewCourseName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [deletingCourse, setDeletingCourse] = useState<any | null>(null);
  const toast = useToast();

  useEffect(() => {
    fetch('/api/courses')
      .then(res => res.json())
      .then(data => {
        setCourses(Array.isArray(data) ? data : []);
        setLoading(false);
      });
  }, []);

  const handleAddCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCourseName.trim()) return;
    // optimistic UI: add locally first
    const tempId = `temp-${Date.now()}`;
    const tempCourse = { id: tempId, name: newCourseName };
    setCourses(prev => [...prev, tempCourse]);
    setNewCourseName('');
    // show no loading toast; we'll show final toast on result
    try {
      const res = await fetch('/api/courses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newCourseName })
      });
      const payload = await res.json();
        if (res.ok) {
        // replace temp item with server item (if server returned it)
        setCourses(prev => prev.map(c => c.id === tempId ? (payload && payload.id ? payload : { ...c, id: payload?.id || c.id, name: payload?.name || c.name }) : c));
        toast.showToast?.(`Successfully Added ${payload?.name || newCourseName}`, 'success');
        try { new BroadcastChannel('attendance_channel').postMessage({ type: 'courses_updated', name: payload?.name || newCourseName }); } catch (e) {}
      } else {
        // remove optimistic item
        setCourses(prev => prev.filter(c => c.id !== tempId));
        toast.showToast?.(payload?.error || 'Failed to add course', 'error');
      }
    } catch (err: any) {
      setCourses(prev => prev.filter(c => c.id !== tempId));
      toast.showToast?.(err?.message || 'Error adding course', 'error');
    }
  };

  const handleStartEdit = (c: any) => {
    setEditingId(c.id);
    setEditingName(c.name);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditingName('');
  };

  const handleSaveEdit = async (id: string) => {
    if (!editingName.trim()) return;
    // no loading toast; show final result
    try {
      const res = await fetch('/api/courses', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, name: editingName })
      });

      if (res.ok) {
        const updated = await res.json();
        setCourses(courses.map(c => c.id === id ? { ...c, name: editingName } : c));
        setEditingId(null);
        setEditingName('');
        toast.showToast?.('Course updated successfully!', 'success');
        try { new BroadcastChannel('attendance_channel').postMessage({ type: 'courses_updated', name: editingName }); } catch (e) {}
      } else {
        toast.showToast?.('Failed to update course', 'error');
      }
    } catch (err) {
      toast.showToast?.('Error updating course', 'error');
    }
  };

  const handleRemove = async (course: any) => {
    setDeletingCourse(course);
  };

  const confirmDeleteCourse = async () => {
    if (!deletingCourse) return;
    // optimistic remove: remove locally first, keep backup
    const backup = courses;
    setCourses(prev => prev.filter(c => c.id !== deletingCourse.id));
    // no loading toast; remove optimistically and show final toast
    try {
      const res = await fetch('/api/courses', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: deletingCourse.id })
      });
      const payload = await res.json();
      if (res.ok) {
        toast.showToast?.(`Course ${deletingCourse.name} removed successfully!`, 'success');
        try { new BroadcastChannel('attendance_channel').postMessage({ type: 'courses_updated', name: deletingCourse.name }); } catch (e) {}
      } else {
        // revert on failure
        setCourses(backup);
        toast.showToast?.(payload?.error || 'Failed to remove course', 'error');
      }
    } catch (err: any) {
      setCourses(backup);
      toast.showToast?.(err?.message || 'Error removing course', 'error');
    } finally {
      setDeletingCourse(null);
    }
  };

  return (
    <DashboardLayout role={UserRole.ADMIN}>
      <h1 style={{ marginBottom: '20px', color: '#003366' }}>Manage Courses</h1>

      <div className="card" style={{ maxWidth: '600px', marginBottom: '30px' }}>
        <h3>Add New Course</h3>
        <form onSubmit={handleAddCourse} style={{ display: 'flex', gap: '10px', marginTop: '15px' }}>
          <input 
            type="text" 
            className="form-control" 
            placeholder="Course Name (e.g. B.Tech CS)" 
            value={newCourseName}
            onChange={(e) => setNewCourseName(e.target.value)}
            required
          />
          <button type="submit" className="btn">Add</button>
        </form>
      </div>

      <div className="card">
        <h3>Existing Courses</h3>
        {loading ? (
          <p>Loading...</p>
        ) : courses.length > 0 ? (
          <ul style={{ marginTop: '15px', paddingLeft: '0' }}>
            {courses.map(course => (
              <li key={course.id} style={{ marginBottom: '10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  {editingId === course.id ? (
                    <input className="form-control" value={editingName} onChange={(e) => setEditingName(e.target.value)} />
                  ) : (
                    <div style={{ fontWeight: 600 }}>{course.name}</div>
                  )}
                </div>

                <div style={{ display: 'flex', gap: 8 }}>
                  {editingId === course.id ? (
                    <>
                      <button className="btn btn-sm" onClick={() => handleSaveEdit(course.id)} type="button">Save</button>
                      <button className="btn btn-sm btn-outline" onClick={handleCancelEdit} type="button">Cancel</button>
                    </>
                  ) : (
                    <>
                      <button className="btn btn-sm btn-outline" onClick={() => handleStartEdit(course)} type="button">✏️</button>
                      <button className="btn btn-sm btn-danger" onClick={() => handleRemove(course)} type="button">🗑️</button>
                    </>
                  )}
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p>No courses found.</p>
        )}
      </div>
      {/* Delete confirmation modal */}
      {deletingCourse && (
        <div className="modal-overlay" onClick={() => setDeletingCourse(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Delete Course</h3>
            </div>
            <div className="modal-body">
              <p>Are you sure you want to delete <strong>{deletingCourse.name}</strong>?</p>
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => setDeletingCourse(null)}>Cancel</button>
              <button className="btn btn-danger" onClick={confirmDeleteCourse}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
