import React, { useState, useRef, useEffect } from 'react';
import { Menu, Bell, Search, User, LogOut, ExternalLink, Check, Shield } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';
import { useNavigate } from 'react-router-dom';

export default function Navbar({ setMobileOpen }) {
  const { user, logout } = useAuth();
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotification();
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const notifRef = useRef(null);
  const userMenuRef = useRef(null);
  const navigate = useNavigate();

  // Close dropdowns on outside click
  useEffect(() => {
    function handleClickOutside(event) {
      if (notifRef.current && !notifRef.current.contains(event.target)) {
        setShowNotifications(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        setShowUserMenu(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header className="h-16 bg-white border-b border-slate-200/80 sticky top-0 z-30 px-4 md:px-8 flex items-center justify-between">
      {/* Left: Mobile trigger & Search */}
      <div className="flex items-center space-x-3 flex-1 max-w-md">
        <button
          onClick={() => setMobileOpen(true)}
          className="p-2 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 md:hidden"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="relative w-full max-w-xs hidden sm:block">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search subjects, assignments..."
            className="w-full bg-slate-50 border border-slate-200/80 rounded-xl pl-9 pr-4 py-1.5 text-xs text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition"
          />
        </div>
      </div>

      {/* Right: Notifications & User profile */}
      <div className="flex items-center space-x-3">
        {/* Academic Role Pill */}
        <span className="hidden sm:inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-200 uppercase tracking-wider">
          <Shield className="w-3 h-3 mr-1 text-blue-600" />
          {user?.role}
        </span>

        {/* Notifications Dropdown */}
        <div className="relative" ref={notifRef}>
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="relative p-2 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition"
            title="Notifications"
          >
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-rose-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center animate-pulse">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 bg-white rounded-2xl shadow-xl border border-slate-100 p-4 z-50 animate-in fade-in zoom-in-95 duration-150">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
                <div className="flex items-center space-x-2">
                  <span className="font-bold text-sm text-slate-800">Notifications</span>
                  {unreadCount > 0 && (
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-700">
                      {unreadCount} new
                    </span>
                  )}
                </div>
                {unreadCount > 0 && (
                  <button
                    onClick={markAllAsRead}
                    className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                  >
                    Mark all read
                  </button>
                )}
              </div>

              <div className="max-h-72 overflow-y-auto space-y-2">
                {notifications.length === 0 ? (
                  <div className="text-center py-6 text-xs text-slate-400">
                    No new notifications right now
                  </div>
                ) : (
                  notifications.map((n) => (
                    <div
                      key={n.id}
                      onClick={() => {
                        if (!n.is_read) markAsRead(n.id);
                        if (n.link) navigate(n.link);
                        setShowNotifications(false);
                      }}
                      className={`p-2.5 rounded-xl cursor-pointer transition text-xs border ${
                        n.is_read
                          ? 'bg-white border-transparent text-slate-500 hover:bg-slate-50'
                          : 'bg-blue-50/60 border-blue-100 text-slate-800 hover:bg-blue-50'
                      }`}
                    >
                      <div className="font-semibold text-slate-800 mb-0.5">{n.title}</div>
                      <p className="text-slate-600 line-clamp-2">{n.message}</p>
                      <div className="text-[10px] text-slate-400 mt-1.5 flex justify-between">
                        <span>{new Date(n.created_at).toLocaleDateString()}</span>
                        {!n.is_read && <span className="text-blue-600 font-bold">&bull; Unread</span>}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* User Menu */}
        <div className="relative" ref={userMenuRef}>
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="flex items-center space-x-2.5 p-1 rounded-xl hover:bg-slate-50 transition"
          >
            <div className="w-8 h-8 rounded-full bg-blue-600 text-white font-bold text-xs flex items-center justify-center uppercase shadow-sm">
              {user?.firstName?.[0] || 'U'}
            </div>
            <span className="text-xs font-semibold text-slate-700 hidden lg:inline-block max-w-[120px] truncate">
              {user?.name}
            </span>
          </button>

          {showUserMenu && (
            <div className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-xl border border-slate-100 p-2 z-50 animate-in fade-in zoom-in-95 duration-150">
              <div className="px-3 py-2 border-b border-slate-100 mb-1">
                <div className="text-xs font-bold text-slate-800">{user?.name}</div>
                <div className="text-[10px] text-slate-400 truncate">{user?.email}</div>
                <div className="text-[10px] font-semibold text-blue-600 uppercase mt-0.5">
                  Role: {user?.role}
                </div>
              </div>

              <button
                onClick={() => {
                  setShowUserMenu(false);
                  navigate(`/${user?.role}/profile`);
                }}
                className="w-full flex items-center space-x-2 px-3 py-2 text-xs font-medium text-slate-700 rounded-xl hover:bg-slate-50 transition"
              >
                <User className="w-4 h-4 text-slate-400" />
                <span>My Profile</span>
              </button>

              <button
                onClick={() => {
                  setShowUserMenu(false);
                  logout();
                }}
                className="w-full flex items-center space-x-2 px-3 py-2 text-xs font-medium text-rose-600 rounded-xl hover:bg-rose-50 transition mt-1"
              >
                <LogOut className="w-4 h-4 text-rose-500" />
                <span>Sign Out</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

