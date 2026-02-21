'use client';

import { useState, useEffect } from 'react';
import { useToast } from '@/components/ToastProvider';
import DashboardLayout from '@/components/DashboardLayout';
import { UserRole } from '@/lib/types';
import Modal from '@/components/Modal';

export default function TeacherSettings() {
  const [user, setUser] = useState<any>(null);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [newUsername, setNewUsername] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const toast = useToast();
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  useEffect(() => {
    fetch('/api/user/settings')
      .then(res => res.json())
      .then(data => {
        if (data.username) {
          setUser(data);
          setNewUsername(data.username);
        }
      });
  }, []);

  const handlePasswordUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    if (newPassword !== confirmPassword) {
      setMessage({ type: 'error', text: 'New passwords do not match' });
      return;
    }

    if (newPassword.length < 6) {
      setMessage({ type: 'error', text: 'Password must be at least 6 characters' });
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/user/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword })
      });

      const data = await res.json();

      if (res.ok) {
        setMessage({ type: 'success', text: 'Password updated successfully!' });
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        toast.showToast?.('Password updated successfully!', 'success');
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to update password' });
        toast.showToast?.(data.error || 'Failed to update password', 'error');
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'An error occurred. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  const handleUsernameUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    if (!newUsername.trim()) {
      setMessage({ type: 'error', text: 'Username cannot be empty' });
      return;
    }

    if (newUsername === user?.username) {
      setMessage({ type: 'error', text: 'New username must be different from current username' });
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/user/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newUsername })
      });

      const data = await res.json();

      if (res.ok) {
        setMessage({ type: 'success', text: 'Username updated successfully! Please login again.' });
        setTimeout(() => {
          window.location.href = '/login';
        }, 2000);
        toast.showToast?.('Username updated successfully! Please login again.', 'success');
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to update username' });
        toast.showToast?.(data.error || 'Failed to update username', 'error');
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'An error occurred. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/user/settings', { method: 'DELETE' });
      const data = await res.json();
      if (res.ok) {
        toast.showToast?.('Account deleted. Redirecting...', 'success');
        try { await fetch('/api/auth/logout', { method: 'POST' }); } catch {}
        window.location.href = '/register';
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to delete account' });
        toast.showToast?.(data.error || 'Failed to delete account', 'error');
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: err?.message || 'Failed to delete account' });
      toast.showToast?.(err?.message || 'Failed to delete account', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardLayout role={UserRole.TEACHER}>
      <div className="page-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <div>
          <h1>Settings</h1>
          <p>Manage your account settings and preferences</p>
        </div>
        <div>
          <button className="btn btn-danger" onClick={() => setShowDeleteModal(true)}>
            Delete Account
          </button>
        </div>
      </div>

      {message && (
        <div className={`alert alert-${message.type}`} style={{ marginBottom: '24px' }}>
          <span>{message.type === 'success' ? '✅' : '⚠️'}</span>
          {message.text}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '24px' }}>
        {/* Change Password Card */}
        <div className="card">
          <h3 style={{ marginBottom: '8px', color: 'var(--primary-color)' }}>🔐 Change Password</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '20px' }}>
            Update your password to keep your account secure
          </p>

          <form onSubmit={handlePasswordUpdate}>
            <div className="input-group">
              <label>Current Password</label>
              <div className="password-input-wrapper">
                <input
                  type={showCurrentPassword ? 'text' : 'password'}
                  className="form-control"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  required
                  placeholder="Enter your current password"
                  style={{ paddingRight: '45px' }}
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  tabIndex={-1}
                >
                  {showCurrentPassword ? '🙈' : '👁️'}
                </button>
              </div>
            </div>

            <div className="input-group">
              <label>New Password</label>
              <div className="password-input-wrapper">
                <input
                  type={showNewPassword ? 'text' : 'password'}
                  className="form-control"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  minLength={6}
                  placeholder="Enter new password (min 6 chars)"
                  style={{ paddingRight: '45px' }}
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  tabIndex={-1}
                >
                  {showNewPassword ? '🙈' : '👁️'}
                </button>
              </div>
            </div>

            <div className="input-group">
              <label>Confirm New Password</label>
              <div className="password-input-wrapper">
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  className="form-control"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  placeholder="Confirm your new password"
                  style={{ paddingRight: '45px' }}
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  tabIndex={-1}
                >
                  {showConfirmPassword ? '🙈' : '👁️'}
                </button>
              </div>
            </div>

            <button type="submit" className="btn" disabled={loading}>
              {loading ? (
                <>
                  <span className="spinner" style={{ width: '16px', height: '16px', borderWidth: '2px', marginRight: '8px' }}></span>
                  Updating...
                </>
              ) : (
                'Update Password'
              )}
            </button>
          </form>
        </div>

        {/* Change Username Card */}
        <div className="card">
          <h3 style={{ marginBottom: '8px', color: 'var(--primary-color)' }}>👤 Change Username</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '20px' }}>
            Your username is used to login to the system
          </p>

          <form onSubmit={handleUsernameUpdate}>
            <div className="input-group">
              <label>Current Username</label>
              <input
                type="text"
                className="form-control"
                value={user?.username || ''}
                disabled
                style={{ background: '#f1f5f9', color: 'var(--text-secondary)' }}
              />
            </div>

            <div className="input-group">
              <label>New Username</label>
              <input
                type="text"
                className="form-control"
                value={newUsername}
                onChange={(e) => setNewUsername(e.target.value)}
                required
                placeholder="Enter new username"
              />
            </div>

            <div className="alert alert-warning" style={{ marginBottom: '20px', fontSize: '0.85rem' }}>
              <span>⚠️</span>
              Changing your username will require you to login again.
            </div>

            <button type="submit" className="btn btn-outline" disabled={loading}>
              {loading ? (
                <>
                  <span className="spinner" style={{ width: '16px', height: '16px', borderWidth: '2px', marginRight: '8px' }}></span>
                  Updating...
                </>
              ) : (
                'Change Username'
              )}
            </button>
          </form>
        </div>
      </div>
        <Modal open={showDeleteModal} onClose={() => setShowDeleteModal(false)}>
          <div className="modal-header"><h3>Confirm delete</h3></div>
          <div className="modal-body">
            <p>Are you sure? This cannot be undone.</p>
          </div>
          <div className="modal-footer" style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button className="btn btn-danger" onClick={async () => { setShowDeleteModal(false); await handleDeleteAccount(); }}>Delete</button>
            <button className="btn btn-outline" onClick={() => setShowDeleteModal(false)}>Cancel</button>
          </div>
        </Modal>
    </DashboardLayout>
  );
}
