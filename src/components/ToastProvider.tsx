"use client";
import React, { createContext, useContext, useCallback, useEffect, useState } from 'react';
import { Toaster, toast as hotToast } from 'react-hot-toast';
import { usePathname } from 'next/navigation';

type ToastType = 'info' | 'success' | 'error';

type ToastContextShape = {
  showToast: (msg: string, type?: ToastType, icon?: React.ReactNode) => void;
  showToastSilent: (msg: string) => void;
  showLoading: (msg: string) => string;
  updateToast: (id: string, msg: string, type?: ToastType) => void;
};

const ToastContext = createContext<ToastContextShape | null>(null);

function ToastIcon({ type }: { type: ToastType }) {
  if (type === 'success') {
    return (
      <span className="attendance-toast-icon" aria-hidden="true">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20 6 9 17l-5-5" />
        </svg>
      </span>
    );
  }

  if (type === 'error') {
    return (
      <span className="attendance-toast-icon" aria-hidden="true">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="m15 9-6 6" />
          <path d="m9 9 6 6" />
        </svg>
      </span>
    );
  }

  return (
    <span className="attendance-toast-icon" aria-hidden="true">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="9" />
        <path d="M12 10v5" />
        <path d="M12 7h.01" />
      </svg>
    </span>
  );
}

export const useToast = () => {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
};


export default function ToastProvider({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);
  const pathname = usePathname();
  const isLoginPage = pathname === '/login';
  const durationStyle = useCallback(
    (ms: number) => ({ ['--toast-duration' as any]: `${ms}ms` } as React.CSSProperties),
    []
  );

  useEffect(() => {
    setMounted(true);
  }, []);

  const showToast = useCallback((message: string, type: ToastType = 'info', icon?: React.ReactNode) => {
    const duration = 3500;
    const finalIcon = icon ?? <ToastIcon type={type} />;
    const opts: any = {
      duration,
      removeDelay: 0,
      icon: finalIcon,
      className: `attendance-toast ${type}`,
      style: durationStyle(duration),
    };
    if (type === 'success') {
      hotToast.success(message, opts);
    } else if (type === 'error') {
      hotToast.error(message, opts);
    } else {
      hotToast(message, opts);
    }
  }, [durationStyle]);

  const showToastSilent = useCallback((message: string) => {
    const duration = 3000;
    hotToast(message, {
      duration,
      removeDelay: 0,
      icon: <ToastIcon type="info" />,
      className: 'attendance-toast info',
      style: durationStyle(duration),
    });
  }, [durationStyle]);

  const showLoading = useCallback((message: string) => {
    // returns id which can be used to update the toast
    return hotToast.loading(message);
  }, []);

  const updateToast = useCallback((id: string, message: string, type: ToastType = 'info') => {
    const duration = 3500;
    const opts: any = {
      id,
      duration,
      removeDelay: 0,
      icon: <ToastIcon type={type} />,
      className: `attendance-toast ${type}`,
      style: durationStyle(duration),
    };
    // react-hot-toast will update existing toast when id is provided
    if (type === 'success') {
      hotToast.success(message, opts);
    } else if (type === 'error') {
      hotToast.error(message, opts);
    } else {
      hotToast(message, opts);
    }
  }, [durationStyle]);

  // BroadcastChannel listener: forward messages to window and show light toast
  useEffect(() => {
    try {
      const bc = new BroadcastChannel('attendance_channel');
      bc.onmessage = (ev) => {
        const msg = ev.data;
        // dispatch a window event so pages can listen and refetch if needed
        try { window.dispatchEvent(new CustomEvent('attendance:update', { detail: msg })); } catch (e) {}
        if (msg?.silent) return;
        // show a subtle notification for updates
        if (msg && msg.type) {
          // map some known types to friendly messages
          if (msg.type === 'courses_updated') {
            const duration = 1800;
            hotToast('Courses list updated', {
              duration,
              removeDelay: 0,
              icon: <ToastIcon type="info" />,
              className: 'attendance-toast info',
              style: durationStyle(duration),
            });
          } else if (msg.type === 'attendance_saved') {
            const duration = 1800;
            hotToast('Attendance updated', {
              duration,
              removeDelay: 0,
              icon: <ToastIcon type="info" />,
              className: 'attendance-toast info',
              style: durationStyle(duration),
            });
          } else {
            const duration = 1800;
            hotToast('Data updated', {
              duration,
              removeDelay: 0,
              icon: <ToastIcon type="info" />,
              className: 'attendance-toast info',
              style: durationStyle(duration),
            });
          }
        }
      };
      return () => bc.close();
    } catch (e) {
      // ignore if BroadcastChannel not available
    }
  }, [durationStyle]);

  return (
    <ToastContext.Provider value={{ showToast, showToastSilent, showLoading, updateToast }}>
      {children}
      {mounted ? (
        <Toaster
          position={isLoginPage ? 'top-left' : 'top-right'}
          containerStyle={
            isLoginPage
              ? { zIndex: 99999, top: '18px', left: '18px', pointerEvents: 'none' }
              : { zIndex: 99999, top: '18px', right: '18px', pointerEvents: 'none' }
          }
          toastOptions={{
            duration: 3500,
            removeDelay: 0,
            // default info style for any toast call in app
            className: 'attendance-toast info',
            style: durationStyle(3500),
            loading: { className: 'attendance-toast info', style: durationStyle(3500), removeDelay: 0 },
            success: { className: 'attendance-toast success', style: durationStyle(3500), removeDelay: 0 },
            error: { className: 'attendance-toast error', style: durationStyle(3500), removeDelay: 0 },
          }}
        />
      ) : null}
    </ToastContext.Provider>
  );
}
