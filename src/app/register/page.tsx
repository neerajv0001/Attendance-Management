'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function RegisterPage() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    qualification: '',
    experience: '',
    courseId: '',
    subject: '',
    password: ''
  });
  const [courses, setCourses] = useState<any[]>([]);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Registration failed');
      }

      setSuccess('Registration successful! Please wait for admin approval.');
      setFormData({ name: '', email: '', qualification: '', experience: '', courseId: '', subject: '', password: '' });
      setTimeout(() => router.push('/login'), 3000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetch('/api/courses')
      .then(res => res.json())
      .then(data => setCourses(Array.isArray(data) ? data : []))
      .catch(() => setCourses([]));
  }, []);

  useEffect(() => {
    // Listen for cross-tab updates via BroadcastChannel
    let bc: BroadcastChannel | null = null;
    try {
      bc = new BroadcastChannel('attendance_channel');
      bc.onmessage = (ev) => {
        if (ev?.data?.type === 'courses_updated') {
          fetch('/api/courses')
            .then(res => res.json())
            .then(data => setCourses(Array.isArray(data) ? data : []))
            .catch(() => {});
        }
      };
    } catch (e) {
      bc = null;
    }

    // Fallback polling to keep courses in sync
    const id = setInterval(() => {
      fetch('/api/courses')
        .then(res => res.json())
        .then(data => setCourses(Array.isArray(data) ? data : []))
        .catch(() => {});
    }, 8000);

    return () => {
      try { if (bc) bc.close(); } catch (e) {}
      clearInterval(id);
    };
  }, []);

  return (
    <div className="login-container">
      <div className="login-card" style={{ maxWidth: '520px' }}>
        <div className="login-logo">
          <div style={{ fontSize: '48px', marginBottom: '12px' }}>👨‍🏫</div>
          <h1>Teacher Registration</h1>
          <p>Create your account to get started</p>
        </div>
        
        {error && (
          <div className="alert alert-danger" style={{ marginBottom: '20px' }}>
            <span>⚠️</span>
            {error}
          </div>
        )}
        {success && (
          <div className="alert alert-success" style={{ marginBottom: '20px' }}>
            <span>✅</span>
            {success}
          </div>
        )}

        <form onSubmit={handleRegister}>
          <div className="input-group">
            <label>Full Name</label>
            <input type="text" className="form-control" required 
              value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})}
              placeholder="Enter your full name" />
          </div>

          <div className="input-group">
            <label>Email (Username)</label>
            <input type="email" className="form-control" required 
              value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})}
              placeholder="Enter your email address" />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div className="input-group">
              <label>Qualification</label>
              <input type="text" className="form-control" required 
                value={formData.qualification} onChange={(e) => setFormData({...formData, qualification: e.target.value})}
                placeholder="e.g. M.Tech" />
            </div>
            <div className="input-group">
              <label>Experience (Years)</label>
              <input type="number" className="form-control" required min="0"
                value={formData.experience} onChange={(e) => setFormData({...formData, experience: e.target.value})}
                placeholder="e.g. 5" />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div className="input-group">
              <label>Course</label>
              <select className="form-control" required value={formData.courseId} onChange={(e) => setFormData({...formData, courseId: e.target.value, subject: ''})}>
                <option value="">-- Select Course --</option>
                {courses.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div className="input-group">
              <label>Subject Specialization</label>
              <select className="form-control" required value={formData.subject} onChange={(e) => setFormData({...formData, subject: e.target.value})}>
                <option value="">-- Select Subject --</option>
                {(courses.find(c => c.id === formData.courseId)?.subjects || []).map((s: string) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="input-group">
            <label>Password</label>
            <div className="password-input-wrapper">
              <input 
                type={showPassword ? 'text' : 'password'}
                className="form-control" 
                required 
                minLength={6}
                value={formData.password} 
                onChange={(e) => setFormData({...formData, password: e.target.value})}
                placeholder="Create a password (min 6 characters)"
                style={{ paddingRight: '45px' }}
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowPassword(!showPassword)}
                tabIndex={-1}
              >
                {showPassword ? '🙈' : '👁️'}
              </button>
            </div>
          </div>

          <button type="submit" className="btn btn-lg" disabled={loading} style={{ width: '100%' }}>
            {loading ? (
              <>
                <span className="spinner" style={{ width: '20px', height: '20px', borderWidth: '2px', marginRight: '8px' }}></span>
                Submitting...
              </>
            ) : (
              'Create Account'
            )}
          </button>
        </form>

        <div style={{ marginTop: '24px', textAlign: 'center' }}>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
            Already have an account?{' '}
            <a href="/login" style={{ color: 'var(--accent-color)', fontWeight: '600', textDecoration: 'none' }}>
              Sign In
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
