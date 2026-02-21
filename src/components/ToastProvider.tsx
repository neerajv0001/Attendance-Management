"use client";
import React, { createContext, useContext, useCallback, useEffect } from 'react';
import { Toaster, toast as hotToast } from 'react-hot-toast';

type ToastType = 'info' | 'success' | 'error';

type ToastContextShape = {
  showToast: (msg: string, type?: ToastType, icon?: React.ReactNode) => void;
  showToastSilent: (msg: string) => void;
  showLoading: (msg: string) => string;
  updateToast: (id: string, msg: string, type?: ToastType) => void;
};

const ToastContext = createContext<ToastContextShape | null>(null);

export const useToast = () => {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
};


export default function ToastProvider({ children }: { children: React.ReactNode }) {
  const showToast = useCallback((message: string, type: ToastType = 'info', icon?: React.ReactNode) => {
    const opts: any = { duration: 3500, icon };
    if (type === 'success') {
      hotToast.success(message, opts);
    } else if (type === 'error') {
      hotToast.error(message, opts);
    } else {
      hotToast(message, opts);
    }
  }, []);

  const showToastSilent = useCallback((message: string) => {
    hotToast(message, { duration: 3000, icon: null });
  }, []);

  const showLoading = useCallback((message: string) => {
    // returns id which can be used to update the toast
    return hotToast.loading(message);
  }, []);

  const updateToast = useCallback((id: string, message: string, type: ToastType = 'info') => {
    // react-hot-toast will update existing toast when id is provided
    if (type === 'success') {
      hotToast.success(message, { id });
    } else if (type === 'error') {
      hotToast.error(message, { id });
    } else {
      hotToast(message, { id });
    }
  }, []);

  // BroadcastChannel listener: forward messages to window and show light toast
  useEffect(() => {
    try {
      const bc = new BroadcastChannel('attendance_channel');
      bc.onmessage = (ev) => {
        const msg = ev.data;
        // dispatch a window event so pages can listen and refetch if needed
        try { window.dispatchEvent(new CustomEvent('attendance:update', { detail: msg })); } catch (e) {}
        // show a subtle notification for updates
        if (msg && msg.type) {
          // map some known types to friendly messages
          if (msg.type === 'courses_updated') {
            hotToast('Courses list updated', { duration: 1800 });
          } else if (msg.type === 'attendance_saved') {
            hotToast('Attendance updated', { duration: 1800 });
          } else {
            hotToast('Data updated', { duration: 1800 });
          }
        }
      };
      return () => bc.close();
    } catch (e) {
      // ignore if BroadcastChannel not available
    }
  }, []);

  return (
    <ToastContext.Provider value={{ showToast, showToastSilent, showLoading, updateToast }}>
      {children}
      <Toaster
        position="top-right"
        containerStyle={{ zIndex: 99999, top: '18px', right: '18px' }}
        toastOptions={{
          duration: 3500,
          // use CSS class for better styling control
          className: 'attendance-toast',
          success: { className: 'attendance-toast success' },
          error: { className: 'attendance-toast error' },
          // info uses attendance-toast with info border
        }}
      />
    </ToastContext.Provider>
  );
}
