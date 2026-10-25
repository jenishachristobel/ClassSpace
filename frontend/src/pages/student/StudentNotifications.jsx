import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Bell,
  CheckCircle2,
  Clock,
  Award,
  FileText,
  AlertTriangle,
  ArrowRight,
  Sparkles,
  Inbox
} from 'lucide-react';
import { useNotification } from '../../context/NotificationContext';
import Badge from '../../components/common/Badge';

export default function StudentNotifications() {
  const { notifications, unreadCount, markAsRead, markAllAsRead, fetchNotifications } = useNotification();
  const [filter, setFilter] = useState('all');

  const filteredNotifications = notifications.filter((item) => {
    if (filter === 'unread') return item.is_read === 0;
    if (filter === 'grades') return item.type === 'grade';
    if (filter === 'assignments') return item.type === 'assignment' || item.type === 'submission';
    if (filter === 'announcements') return item.type === 'announcement';
    return true;
  });

  const getIcon = (type) => {
    switch (type) {
      case 'grade':
        return <Award className="w-5 h-5 text-purple-600" />;
      case 'assignment':
        return <FileText className="w-5 h-5 text-blue-600" />;
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-amber-600" />;
      default:
        return <Bell className="w-5 h-5 text-indigo-600" />;
    }
  };

  const getBg = (type) => {
    switch (type) {
      case 'grade':
        return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'assignment':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'warning':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      default:
        return 'bg-indigo-50 text-indigo-700 border-indigo-200';
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header Banner */}
      <div className="bg-white rounded-3xl border border-slate-200/90 p-6 sm:p-8 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
            <span>Academic Feed</span>
            <span>&bull;</span>
            <span>Live Alerts</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight flex items-center space-x-3">
            <span>Notification Center</span>
            {unreadCount > 0 && (
              <span className="text-xs font-extrabold px-3 py-1 rounded-full bg-blue-100 text-blue-700 border border-blue-200 animate-pulse">
                {unreadCount} unread
              </span>
            )}
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Real-time coursework updates, instructor grading alerts, and course bulletins.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          {unreadCount > 0 && (
            <button
              onClick={markAllAsRead}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white transition shadow-sm flex items-center space-x-1.5"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Mark All as Read</span>
            </button>
          )}
          <button
            onClick={fetchNotifications}
            className="px-3.5 py-2 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 transition"
          >
            Refresh Feed
          </button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap gap-2">
        {[
          { key: 'all', label: 'All Alerts' },
          { key: 'unread', label: `Unread (${unreadCount})` },
          { key: 'grades', label: 'Grades & Feedback' },
          { key: 'assignments', label: 'Coursework' },
          { key: 'announcements', label: 'Announcements' },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key)}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition ${
              filter === tab.key
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200/80'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Notifications List */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden divide-y divide-slate-100">
        {filteredNotifications.length === 0 ? (
          <div className="py-16 text-center">
            <div className="w-14 h-14 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
              <Inbox className="w-7 h-7" />
            </div>
            <h3 className="font-bold text-slate-800 text-sm">No Notifications Found</h3>
            <p className="text-xs text-slate-400 max-w-xs mx-auto mt-1">
              You're completely up to date. New assignment releases and published grades will appear here in real time.
            </p>
          </div>
        ) : (
          filteredNotifications.map((n) => {
            const isUnread = n.is_read === 0;
            return (
              <div
                key={n.id}
                onClick={() => isUnread && markAsRead(n.id)}
                className={`p-5 transition flex flex-col sm:flex-row sm:items-center justify-between gap-4 cursor-pointer ${
                  isUnread ? 'bg-blue-50/40 hover:bg-blue-50/70 border-l-4 border-l-blue-600' : 'hover:bg-slate-50/80'
                }`}
              >
                <div className="flex items-start space-x-3.5 min-w-0">
                  <div className={`w-10 h-10 rounded-2xl border flex items-center justify-center shrink-0 ${getBg(n.type)}`}>
                    {getIcon(n.type)}
                  </div>
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center space-x-2">
                      <span className="font-bold text-sm text-slate-900">{n.title}</span>
                      {isUnread && (
                        <span className="w-2 h-2 rounded-full bg-blue-600 shrink-0" />
                      )}
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      {n.message}
                    </p>
                    <div className="flex items-center space-x-2 text-[10px] text-slate-400 pt-0.5">
                      <Clock className="w-3 h-3" />
                      <span>{new Date(n.created_at).toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-2 shrink-0 self-end sm:self-center">
                  {n.link && (
                    <Link
                      to={n.link}
                      onClick={() => markAsRead(n.id)}
                      className="inline-flex items-center space-x-1 px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-100 hover:bg-blue-600 hover:text-white text-slate-700 transition"
                    >
                      <span>View</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  )}
                  {isUnread && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        markAsRead(n.id);
                      }}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition"
                      title="Mark as read"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

