import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import api from '../api/client';
import { useAuth } from './AuthContext';

const NotificationContext = createContext(null);

export const NotificationProvider = ({ children }) => {
  const { user } = useAuth();
  const [toasts, setToasts] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [lastRealtimeEvent, setLastRealtimeEvent] = useState(null);
  const eventSourceRef = useRef(null);

  const showToast = (message, type = 'info', duration = 4500) => {
    const id = Date.now() + Math.random().toString(36).substring(2, 5);
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      removeToast(id);
    }, duration);
  };

  const removeToast = (id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const fetchNotifications = async () => {
    if (!user) return;
    try {
      const res = await api.get('/notifications');
      if (res.data.success) {
        setNotifications(res.data.notifications || []);
        setUnreadCount(res.data.unreadCount || 0);
      }
    } catch (e) {
      // Graceful error handling
    }
  };

  // Real-time Server-Sent Events (SSE) stream subscription
  useEffect(() => {
    if (!user) {
      setNotifications([]);
      setUnreadCount(0);
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
      return;
    }

    // Initial load
    fetchNotifications();

    // Establish persistent Server-Sent Events stream
    const token = localStorage.getItem('classspace_token');
    if (token) {
      try {
        const streamUrl = `/api/notifications/stream?token=${encodeURIComponent(token)}`;
        const es = new EventSource(streamUrl);
        eventSourceRef.current = es;

        es.addEventListener('NOTIFICATION', (e) => {
          try {
            const data = JSON.parse(e.data);
            setNotifications((prev) => [data, ...prev.filter((n) => n.id !== data.id)]);
            setUnreadCount((c) => (data.unreadCount !== undefined ? data.unreadCount : c + 1));
            showToast(data.message, data.type === 'grade' ? 'success' : data.type === 'warning' ? 'error' : 'info');
            setLastRealtimeEvent({ type: 'NOTIFICATION', data, timestamp: Date.now() });
          } catch (err) {
            console.warn('[SSE] Parse error:', err);
          }
        });

        es.addEventListener('ASSIGNMENT_PUBLISHED', (e) => {
          try {
            const data = JSON.parse(e.data);
            showToast(`New Assignment: ${data.title}`, 'info');
            fetchNotifications();
            setLastRealtimeEvent({ type: 'ASSIGNMENT_PUBLISHED', data, timestamp: Date.now() });
          } catch (err) {}
        });

        es.addEventListener('SUBMISSION_RECEIVED', (e) => {
          try {
            const data = JSON.parse(e.data);
            showToast(`Submission received from ${data.studentName}`, 'success');
            fetchNotifications();
            setLastRealtimeEvent({ type: 'SUBMISSION_RECEIVED', data, timestamp: Date.now() });
          } catch (err) {}
        });

        es.addEventListener('GRADE_PUBLISHED', (e) => {
          try {
            const data = JSON.parse(e.data);
            showToast(`Grade published: ${data.marksObtained}/${data.maxMarks}`, 'success');
            fetchNotifications();
            setLastRealtimeEvent({ type: 'GRADE_PUBLISHED', data, timestamp: Date.now() });
          } catch (err) {}
        });

        es.addEventListener('RESUBMISSION_REQUESTED', (e) => {
          try {
            const data = JSON.parse(e.data);
            showToast(`Resubmission requested: ${data.reason || 'Please check remarks'}`, 'error');
            fetchNotifications();
            setLastRealtimeEvent({ type: 'RESUBMISSION_REQUESTED', data, timestamp: Date.now() });
          } catch (err) {}
        });

        es.addEventListener('ANNOUNCEMENT_POSTED', (e) => {
          try {
            const data = JSON.parse(e.data);
            fetchNotifications();
            setLastRealtimeEvent({ type: 'ANNOUNCEMENT_POSTED', data, timestamp: Date.now() });
          } catch (err) {}
        });

        es.onerror = () => {
          // EventSource automatically handles reconnection according to HTML5 spec
        };
      } catch (err) {
        console.warn('[SSE] Subscription note:', err);
      }
    }

    // Graceful background poll fallback every 35 seconds
    const interval = setInterval(fetchNotifications, 35000);

    return () => {
      clearInterval(interval);
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
    };
  }, [user]);

  const markAsRead = async (id) => {
    try {
      await api.put(`/notifications/${id}/read`);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: 1 } : n))
      );
      setUnreadCount((c) => Math.max(0, c - 1));
    } catch (e) {}
  };

  const markAllAsRead = async () => {
    try {
      await api.put('/notifications/read-all');
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: 1 })));
      setUnreadCount(0);
    } catch (e) {}
  };

  return (
    <NotificationContext.Provider
      value={{
        toasts,
        showToast,
        removeToast,
        notifications,
        unreadCount,
        lastRealtimeEvent,
        fetchNotifications,
        markAsRead,
        markAllAsRead,
      }}
    >
      {children}
      {/* Toast Overlay */}
      <div className="fixed bottom-5 right-5 z-50 flex flex-col space-y-2 pointer-events-none">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-center justify-between px-4 py-3 rounded-2xl shadow-xl border text-xs max-w-sm transition-all transform animate-in slide-in-from-right duration-200 backdrop-blur-md ${
              toast.type === 'success'
                ? 'bg-emerald-50/95 text-emerald-900 border-emerald-200 shadow-emerald-900/10'
                : toast.type === 'error'
                ? 'bg-rose-50/95 text-rose-900 border-rose-200 shadow-rose-900/10'
                : 'bg-slate-900/95 text-white border-slate-800 shadow-slate-900/20'
            }`}
          >
            <span className="font-semibold mr-3 leading-snug">{toast.message}</span>
            <button
              onClick={() => removeToast(toast.id)}
              className="text-current opacity-70 hover:opacity-100 p-1 text-sm font-bold"
            >
              &times;
            </button>
          </div>
        ))}
      </div>
    </NotificationContext.Provider>
  );
};

export const useNotification = () => useContext(NotificationContext);
