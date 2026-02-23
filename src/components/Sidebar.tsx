"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useRef, useEffect } from 'react';
import { useToast } from '@/components/ToastProvider';
import {
  DashboardIcon,
  ApproveIcon,
  CourseIcon,
  SubjectIcon,
  TeacherIcon,
  StudentIcon,
  AddIcon,
  AttendanceIcon,
  ReportsIcon,
  TimetableIcon,
  SettingsIcon,
  LogoutIcon
} from '@/components/icons';

interface SidebarProps {
  role: 'ADMIN' | 'TEACHER' | 'STUDENT';
  isOpen: boolean;
  forceLocked?: boolean;
}

const PROFILE_BY_ROLE: Record<'ADMIN' | 'TEACHER' | 'STUDENT', { name: string; title: string; initials: string }> = {
  ADMIN: { name: 'Admin User', title: 'System Administrator', initials: 'AU' },
  TEACHER: { name: 'Teacher User', title: 'Faculty Member', initials: 'TU' },
  STUDENT: { name: 'Student User', title: 'Learner', initials: 'SU' },
};

const MENU_ITEMS: Record<string, { name: string; path: string; icon: React.ReactNode }[]> = {
  ADMIN: [
    { name: 'Dashboard', path: '/admin/dashboard', icon: <DashboardIcon /> },
    { name: 'Approve Teachers', path: '/admin/approve-teachers', icon: <ApproveIcon /> },
    { name: 'Add Course', path: '/admin/courses', icon: <CourseIcon /> },
    { name: 'Add Subject', path: '/admin/subjects', icon: <SubjectIcon /> },
    { name: 'View Teachers', path: '/admin/teachers', icon: <TeacherIcon /> },
    { name: 'View Students', path: '/admin/students', icon: <StudentIcon /> },
  ],
  TEACHER: [
    { name: 'Dashboard', path: '/teacher/dashboard', icon: <DashboardIcon /> },
    { name: 'Add Student', path: '/teacher/add-student', icon: <AddIcon /> },
    { name: 'My Students', path: '/teacher/students', icon: <StudentIcon /> },
    { name: 'Mark Attendance', path: '/teacher/attendance', icon: <AttendanceIcon /> },
    { name: 'Reports', path: '/teacher/reports', icon: <ReportsIcon /> },
    { name: 'Notices', path: '/teacher/notices', icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"><path d="M15 17h5l-1.405-1.405A2.032 2.032 0 0 1 18 14.158V11a6 6 0 1 0-12 0v3.159c0 .538-.214 1.055-.595 1.436L4 17h11z"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
      ) },
    { name: 'Time Table', path: '/teacher/timetable', icon: <TimetableIcon /> },
    { name: 'Settings', path: '/teacher/settings', icon: <SettingsIcon /> },
  ],
  STUDENT: [
    { name: 'Dashboard', path: '/student/dashboard', icon: <DashboardIcon /> },
    { name: 'My Attendance', path: '/student/attendance', icon: <AttendanceIcon /> },
    { name: 'My Timetable', path: '/student/timetable', icon: <TimetableIcon /> },
    { name: 'Notices', path: '/student/notices', icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"><path d="M15 17h5l-1.405-1.405A2.032 2.032 0 0 1 18 14.158V11a6 6 0 1 0-12 0v3.159c0 .538-.214 1.055-.595 1.436L4 17h11z"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
      ) },
    { name: 'Settings', path: '/student/settings', icon: <SettingsIcon /> },
  ]
};

export default function Sidebar({ role, isOpen, forceLocked }: SidebarProps) {
  const pathname = usePathname();
  const items = MENU_ITEMS[role];
  const profile = PROFILE_BY_ROLE[role];
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const toast = useToast();
  const [mounted, setMounted] = useState(false);
  const [locked, setLocked] = useState<boolean>(!!forceLocked);
  const lockStorageKey = `sidebarLocked:${role}`;

  // Read persisted `sidebarLocked` only on the client to avoid SSR/client mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    if (typeof window === 'undefined') return;
    if (forceLocked) {
      setLocked(true);
      return;
    }
    try {
      const val = localStorage.getItem(lockStorageKey);
      setLocked(val === '1');
    } catch {}
  }, [forceLocked, mounted, lockStorageKey]);
  const [hovered, setHovered] = useState(false);
  const asideRef = useRef<HTMLElement | null>(null);

  // Expansion is controlled locally: either explicitly locked open, or hovered.
  // Ignore external `isOpen` to avoid stale external state keeping the sidebar open.
  const expanded = !!forceLocked || (mounted && (locked || hovered));

  const handleLogout = async () => {
    try {
      const res = await fetch('/api/auth/logout', { method: 'POST' });
        if (res.ok) {
          try {
          // persist a logout message so the login page can show it after redirect
          try { localStorage.setItem('justLoggedOut', JSON.stringify({ message: 'Thank you for logging in! See you soon.' })); } catch {}
          localStorage.removeItem('justLoggedIn');
        } catch (e) {}
        window.location.href = '/login';
      } else {
        try { toast.showToast?.('Logout failed. Please try again.', 'error'); } catch {}
      }
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const toggleLock = () => {
    const next = !locked;
    setLocked(next);
    try { localStorage.setItem(lockStorageKey, next ? '1' : '0'); } catch {}
    // If unlocking, immediately collapse the expanded hover state so width returns
    if (!next) {
      setHovered(false);
    }
  };

  // Fallback mouse-tracking to ensure sidebar reliably opens/closes
  useEffect(() => {
    let raf = 0;
    const handler = (e: MouseEvent) => {
      if (locked) return; // if locked, ignore auto collapse
      if (!asideRef.current) return;
      const rect = asideRef.current.getBoundingClientRect();
      const inside = e.clientX >= rect.left && e.clientX <= rect.right && e.clientY >= rect.top && e.clientY <= rect.bottom;
      // Use requestAnimationFrame to avoid rapid state churn
      if (raf) cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        setHovered(inside);
      });
    };
    document.addEventListener('mousemove', handler);
    return () => {
      document.removeEventListener('mousemove', handler);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [locked, isOpen]);


  return (
    <>
      <aside
        ref={asideRef}
        className={`sidebar bg-gradient-to-b from-[#1e1e2f] to-[#111119] ${expanded ? 'open' : ''}`}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{ width: expanded ? 256 : 80, transition: 'all 300ms ease-in-out' }}
      >
        <div className="sidebar-header">
          <button onClick={toggleLock} aria-pressed={locked} aria-label="Toggle sidebar lock" title="Toggle sidebar lock">
            {/* Bars icon */}
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"><path d="M4 6h16M4 12h16M4 18h16"/></svg>
          </button>
          <span className="brand-label">Attendance Pro</span>
        </div>
        <div className="sidebar-profile">
          <div className="sidebar-avatar" aria-hidden="true">{profile.initials}</div>
          <div className="sidebar-profile-meta">
            <div className="sidebar-profile-name">{profile.name}</div>
            <div className="sidebar-profile-title">{profile.title}</div>
          </div>
        </div>
        <ul className="sidebar-menu">
          {items.map((item) => (
            <li key={item.path}>
              <Link 
                href={item.path} 
                className={`group ${mounted && pathname === item.path ? 'active bg-blue-600/20 text-blue-400 border-r-4 border-blue-500' : ''}`}
              >
                <span className="sidebar-icon text-gray-400 group-hover:text-white transition-all">{item.icon}</span>
                <span className="sidebar-label">{item.name}</span>
              </Link>
            </li>
          ))}
        </ul>
        <div className="sidebar-footer">
          <button
            onClick={() => setShowLogoutModal(true)}
            className="logout-btn"
            aria-label="Logout"
            title="Logout"
          >
            <span className="logout-icon"><LogoutIcon /></span>
            <span className="logout-label">Logout</span>
          </button>
        </div>
      </aside>

      {/* Logout Confirmation Modal */}
      {showLogoutModal && (
        <div className="modal-overlay" onClick={() => setShowLogoutModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Confirm Logout</h3>
            </div>
            <div className="modal-body">
              <p>Are you sure you want to logout?</p>
            </div>
            <div className="modal-footer">
              <button 
                className="btn btn-outline" 
                onClick={() => setShowLogoutModal(false)}
                style={{ padding: '10px 20px' }}
              >
                Cancel
              </button>
              <button 
                className="btn btn-danger" 
                onClick={handleLogout}
                style={{ padding: '10px 20px' }}
              >
                Yes, Logout
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}



