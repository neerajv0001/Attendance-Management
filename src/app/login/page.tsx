'use client';

import { useState, useEffect } from 'react';
import { useToast } from '@/components/ToastProvider';
import { toast as hotToast } from 'react-hot-toast';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const toast = useToast();

  useEffect(() => {
    try {
      // only show persisted logout message here (welcome is shown on dashboard after redirect)
      const out = localStorage.getItem('justLoggedOut');
      if (out) {
        try {
          const o = JSON.parse(out);
          if (o && o.message) {
            toast.showToast?.(o.message, 'info', '👋');
          }
        } catch (e) {}
        try { localStorage.removeItem('justLoggedOut'); } catch {}
      }
    } catch (e) {
      // ignore
    }
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Login failed');
      }

      // Redirect based on role — persist a small flag so dashboard can show welcome toast after redirect
      try {
        localStorage.setItem('justLoggedIn', JSON.stringify({ name: data.user.name, role: data.user.role }));
      } catch (e) {}

      if (data.user.role === 'ADMIN') router.push('/admin/dashboard');
      else if (data.user.role === 'TEACHER') router.push('/teacher/dashboard');
      else if (data.user.role === 'STUDENT') router.push('/student/dashboard');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-logo">
          <div style={{ fontSize: '48px', marginBottom: '12px' }}>📚</div>
          <h1>Attendance Pro</h1>
          <p>Welcome back! Please sign in to continue.</p>
        </div>
        
        {error && (
          <div className="alert alert-danger" style={{ marginBottom: '20px' }}>
            <span>⚠️</span>
            {error}
          </div>
        )}

        <form onSubmit={handleLogin}>
          <div className="input-group">
            <label>Username / Email / Student ID</label>
            <input 
              type="text" 
              className="form-control" 
              value={username} 
              onChange={(e) => setUsername(e.target.value)} 
              required 
              placeholder="Enter your ID"
            />
          </div>

          <div className="input-group">
            <label>Password</label>
            <div className="password-input-wrapper">
              <input 
                type={showPassword ? 'text' : 'password'}
                className="form-control" 
                value={password} 
                onChange={(e) => setPassword(e.target.value)} 
                required 
                placeholder="Enter your password"
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

          <button type="submit" className="btn btn-lg" disabled={loading} style={{ width: '100%', marginTop: '10px' }}>
            {loading ? (
              <>
                <span className="spinner" style={{ width: '20px', height: '20px', borderWidth: '2px', marginRight: '8px' }}></span>
                Signing in...
              </>
            ) : (
              'Sign In'
            )}
          </button>
        </form>

        <div style={{ marginTop: '24px', textAlign: 'center' }}>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
            Are you a teacher?{' '}
            <a href="/register" style={{ color: 'var(--accent-color)', fontWeight: '600', textDecoration: 'none' }}>
              Register Here
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
