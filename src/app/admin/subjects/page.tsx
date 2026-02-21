"use client";

import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { UserRole } from '@/lib/types';
import { useToast } from '@/components/ToastProvider';

export default function AdminSubjects() {
  const [courses, setCourses] = useState<any[]>([]);
  const [selectedCourse, setSelectedCourse] = useState('');
  const [newSubjectName, setNewSubjectName] = useState('');
  const [loading, setLoading] = useState(true);
  const [editingSubject, setEditingSubject] = useState<{ name: string; courseId: string } | null>(null);
  const [editedName, setEditedName] = useState('');
  const toast = useToast();

  useEffect(() => {
    fetch('/api/courses')
      .then(res => res.json())
      .then(data => {
        setCourses(Array.isArray(data) ? data : []);
        setLoading(false);
      });
  }, []);

  const refreshCourses = async () => {
    const res = await fetch('/api/courses');
    const data = await res.json();
    setCourses(Array.isArray(data) ? data : []);
  };

  const handleAddSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCourse || !newSubjectName.trim()) return;

    try {
      const res = await fetch('/api/subjects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ courseId: selectedCourse, name: newSubjectName })
      });

      if (res.ok) {
        await refreshCourses();
        const courseObj = courses.find(c => c.id === selectedCourse);
        toast.showToast?.(`Successfully Added ${newSubjectName}`, 'success');
        setNewSubjectName('');
        try { new BroadcastChannel('attendance_channel').postMessage({ type: 'courses_updated' }); } catch (e) {}
      } else {
        toast.showToast?.('Failed to add subject', 'error');
      }
    } catch (err) {
      toast.showToast('Error adding subject', 'error');
    }
  };

  const subjectsForSelected = selectedCourse ? (courses.find(c => c.id === selectedCourse)?.subjects || []) : [];

  const startEdit = (name: string) => {
    setEditingSubject({ name, courseId: selectedCourse });
    setEditedName(name);
  };

  const cancelEdit = () => {
    setEditingSubject(null);
    setEditedName('');
  };

  const saveEdit = async () => {
    if (!editingSubject || !editedName.trim()) return;
    try {
      const res = await fetch('/api/subjects', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ courseId: editingSubject.courseId, oldName: editingSubject.name, newName: editedName })
      });

      if (res.ok) {
        await refreshCourses();
        toast.showToast('Subject updated successfully!', 'success');
        cancelEdit();
        try { new BroadcastChannel('attendance_channel').postMessage({ type: 'courses_updated' }); } catch (e) {}
      } else {
        toast.showToast('Failed to update subject', 'error');
      }
    } catch (err) {
      toast.showToast('Error updating subject', 'error');
    }
  };

  const removeSubject = async (name: string) => {
    if (!selectedCourse) return;
    if (!confirm(`Delete subject ${name}?`)) return;
    try {
      const res = await fetch('/api/subjects', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ courseId: selectedCourse, name })
      });

      if (res.ok) {
        await refreshCourses();
        const courseObj = courses.find(c => c.id === selectedCourse);
        toast.showToast?.('Record removed successfully.', 'success');
        try { new BroadcastChannel('attendance_channel').postMessage({ type: 'courses_updated' }); } catch (e) {}
      } else {
        toast.showToast?.('Failed to delete subject', 'error');
      }
    } catch (err) {
      toast.showToast('Error deleting subject', 'error');
    }
  };

  return (
    <DashboardLayout role={UserRole.ADMIN}>
      <h1 style={{ marginBottom: '20px', color: '#003366' }}>Manage Subjects</h1>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        <div className="card">
          <h3>Add New Subject</h3>
          <form onSubmit={handleAddSubject} style={{ marginTop: '15px' }}>
            <div className="input-group">
              <label>Select Course</label>
              <select 
                className="form-control" 
                value={selectedCourse} 
                onChange={(e) => setSelectedCourse(e.target.value)}
                required
              >
                <option value="">-- Select Course --</option>
                {courses.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            
            <div className="input-group">
              <label>Subject Name</label>
              <input 
                type="text" 
                className="form-control" 
                placeholder="e.g. Mathematics" 
                value={newSubjectName} 
                onChange={(e) => setNewSubjectName(e.target.value)}
                required
              />
            </div>

            <button type="submit" className="btn" disabled={!selectedCourse}>Add Subject</button>
          </form>
        </div>

        <div className="card">
          <h3>Existing Subjects</h3>
          {!selectedCourse ? (
            <p style={{ color: 'var(--text-secondary)' }}>Select a course to view its subjects.</p>
          ) : (
            <ul style={{ marginTop: 12, paddingLeft: 0 }}>
              {subjectsForSelected.length === 0 ? (
                <li style={{ color: 'var(--text-secondary)' }}>No subjects for this course.</li>
              ) : subjectsForSelected.map((s: string) => (
                <li key={s} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                  <div>
                    {editingSubject && editingSubject.name === s ? (
                      <input className="form-control" value={editedName} onChange={(e) => setEditedName(e.target.value)} />
                    ) : (
                      <span style={{ fontWeight: 600 }}>{s}</span>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    {editingSubject && editingSubject.name === s ? (
                      <>
                        <button className="btn btn-sm" onClick={saveEdit} type="button">Save</button>
                        <button className="btn btn-sm btn-outline" onClick={cancelEdit} type="button">Cancel</button>
                      </>
                    ) : (
                      <>
                        <button className="btn btn-sm btn-outline" onClick={() => startEdit(s)} type="button">✏️</button>
                        <button className="btn btn-sm btn-danger" onClick={() => removeSubject(s)} type="button">🗑️</button>
                      </>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
