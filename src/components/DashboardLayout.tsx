"use client";
import { useState, useEffect } from 'react';
import Sidebar from '@/components/Sidebar';
import { UserRole } from '@/lib/types';
import { useToast } from '@/components/ToastProvider';
import { toast as hotToast } from 'react-hot-toast';

export default function DashboardLayout({ children, role }: { children: React.ReactNode, role: UserRole }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userName, setUserName] = useState('');
  const toast = useToast();

  useEffect(() => {
    // Fetch user info
    fetch('/api/user/settings')
      .then(res => res.json())
      .then(data => {
        if (data.name) setUserName(data.name);
        else setUserName(role === UserRole.ADMIN ? 'Admin' : role === UserRole.TEACHER ? 'Teacher' : 'Student');

        // Welcome toast is handled at login; avoid duplicate messages here.
      })
      .catch(() => {
        // Fallback
        setUserName(role === UserRole.ADMIN ? 'Admin' : role === UserRole.TEACHER ? 'Teacher' : 'Student');
      });
  }, [role]);

  // Show welcome toast after redirect from login (persisted as justLoggedIn)
  useEffect(() => {
    try {
      const raw = localStorage.getItem('justLoggedIn');
      if (raw) {
        const obj = JSON.parse(raw);
        try { hotToast.dismiss(); } catch (e) {}
        if (obj.role === 'ADMIN') {
          toast.showToast?.('Welcome back, Admin!', 'success', '👑');
        } else if (obj.role === 'TEACHER') {
          toast.showToast?.(`Welcome back, ${obj.name}!`, 'success', '👨‍🏫');
        } else if (obj.role === 'STUDENT') {
          toast.showToast?.(`Welcome back, ${obj.name}!`, 'success', '🎓');
        } else {
          toast.showToast?.(`Welcome back, ${obj.name}!`, 'success');
        }
      }
    } catch (e) {
      // ignore
    }
    try { localStorage.removeItem('justLoggedIn'); } catch {}
  }, []);

  const getRoleLabel = () => {
    switch(role) {
      case UserRole.ADMIN: return 'Administrator';
      case UserRole.TEACHER: return 'Teacher';
      case UserRole.STUDENT: return 'Student';
      default: return '';
    }
  };

  const getRoleColor = () => {
    switch(role) {
      case UserRole.ADMIN: return '#ef4444';
      case UserRole.TEACHER: return '#3b82f6';
      case UserRole.STUDENT: return '#10b981';
      default: return '#6b7280';
    }
  };

  // Welcome toast is handled only once after login via localStorage flag.

  return (
    <div className="dashboard-layout">
      <Sidebar role={role} isOpen={sidebarOpen} forceLocked={role !== UserRole.ADMIN} />
       <div className="main-content">
         <header className="top-navbar">
           <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{ textAlign: 'right' }}>
                <div suppressHydrationWarning style={{ fontWeight: '600', color: 'var(--text-primary)', fontSize: '0.95rem' }}>
                  {userName || getRoleLabel()}
                </div>
                <div style={{ 
                  fontSize: '0.75rem', 
                  color: getRoleColor(),
                  fontWeight: '600',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px'
                }}>
                  {getRoleLabel()}
                </div>
              </div>
              <div style={{ 
                width: 44, 
                height: 44, 
                borderRadius: '50%', 
                background: `linear-gradient(135deg, ${getRoleColor()}20 0%, ${getRoleColor()}40 100%)`,
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                fontSize: '1.25rem',
                border: `2px solid ${getRoleColor()}40`
              }}>
                {role === UserRole.ADMIN ? (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"><path d="M12 2l1.8 4.2L18 7l-3 2.6L15.6 14 12 12.2 8.4 14 9 9.6 6 7l4.2-0.8L12 2z"/></svg>
                ) : role === UserRole.TEACHER ? (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                ) : (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"><path d="M12 14s4-2 6-5-2-5-6-2-6 2-6 5 4 2 6 2z"/><path d="M2 20a10 10 0 0 1 20 0"/></svg>
                )}
              </div>
           </div>
         </header>
         <main className="page-content">
           {children}
         </main>
       </div>
        {/* Sidebar sizing handled in globals.css */}
    </div>
  );
}
