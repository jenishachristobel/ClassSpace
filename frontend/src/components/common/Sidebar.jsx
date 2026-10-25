import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  GraduationCap,
  BookOpen,
  School,
  UserCheck,
  UserPlus,
  FileText,
  BarChart3,
  ShieldCheck,
  ShieldAlert,
  Settings,
  Calendar,
  Award,
  Bell,
  User,
  LogOut,
  FolderOpen,
  Layers,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export default function Sidebar({ isCollapsed, setIsCollapsed, mobileOpen, setMobileOpen }) {
  const { user, logout } = useAuth();

  const adminNav = [
    { name: 'Dashboard', path: '/admin/dashboard', icon: LayoutDashboard },
    { name: 'Manage Students', path: '/admin/students', icon: GraduationCap },
    { name: 'Manage Teachers', path: '/admin/teachers', icon: Users },
    { name: 'Manage Subjects', path: '/admin/subjects', icon: BookOpen },
    { name: 'Manage Classes', path: '/admin/classes', icon: School },
    { name: 'Student Enrollments', path: '/admin/enrollments', icon: UserCheck },
    { name: 'Teacher Assignments', path: '/admin/teacher-assignments', icon: UserPlus },
    { name: 'All Assignments', path: '/admin/all-assignments', icon: FileText },
    { name: 'Reports', path: '/admin/reports', icon: BarChart3 },
    { name: 'Login Activity', path: '/admin/login-activity', icon: ShieldAlert },
    { name: 'Audit Logs', path: '/admin/audit-logs', icon: ShieldCheck },
    { name: 'Settings', path: '/admin/settings', icon: Settings },
  ];

  const teacherNav = [
    { name: 'Dashboard', path: '/teacher/dashboard', icon: LayoutDashboard },
    { name: 'My Subjects', path: '/teacher/subjects', icon: BookOpen },
    { name: 'Assignments', path: '/teacher/assignments', icon: FileText },
    { name: 'Submissions', path: '/teacher/submissions', icon: ClipboardList },
    { name: 'Gradebook', path: '/teacher/gradebook', icon: Award },
    { name: 'Calendar', path: '/teacher/calendar', icon: Calendar },
    { name: 'Announcements', path: '/teacher/announcements', icon: Bell },
    { name: 'Profile', path: '/teacher/profile', icon: User },
  ];

  const studentNav = [
    { name: 'Dashboard', path: '/student/dashboard', icon: LayoutDashboard },
    { name: 'My Subjects', path: '/student/subjects', icon: BookOpen },
    { name: 'Assignments', path: '/student/assignments', icon: FileText },
    { name: 'Calendar', path: '/student/calendar', icon: Calendar },
    { name: 'Grades', path: '/student/grades', icon: Award },
    { name: 'Notifications', path: '/student/notifications', icon: Bell },
    { name: 'Profile', path: '/student/profile', icon: User },
  ];

  const navItems =
    user?.role === 'admin' ? adminNav : user?.role === 'teacher' ? teacherNav : studentNav;

  const roleLabels = {
    admin: { label: 'Admin Portal', color: 'bg-rose-50 text-rose-700 border-rose-200' },
    teacher: { label: 'Teacher Portal', color: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
    student: { label: 'Student Portal', color: 'bg-blue-50 text-blue-700 border-blue-200' },
  };

  const currentRole = roleLabels[user?.role] || { label: 'Portal', color: 'bg-slate-100 text-slate-700' };

  return (
    <>
      {/* Mobile Backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-40 md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <aside
        className={`fixed top-0 bottom-0 left-0 z-40 bg-white border-r border-slate-200/90 flex flex-col transition-all duration-300 ease-in-out ${
          isCollapsed ? 'w-20' : 'w-64'
        } ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        {/* Brand Header */}
        <div className="h-16 border-b border-slate-100 flex items-center justify-between px-4">
          <div className="flex items-center space-x-3 overflow-hidden">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white font-bold text-lg shadow-md shadow-blue-500/20 shrink-0">
              C
            </div>
            {!isCollapsed && (
              <div className="flex flex-col">
                <span className="font-extrabold text-slate-900 text-base tracking-tight leading-none">
                  ClassSpace
                </span>
                <span className="text-[10px] text-slate-400 font-semibold tracking-wider uppercase mt-1">
                  Centralized Platform
                </span>
              </div>
            )}
          </div>

          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="hidden md:flex p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
            title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>

        {/* Role Pill Banner */}
        {!isCollapsed && (
          <div className="px-4 pt-3 pb-1">
            <div
              className={`px-3 py-1 rounded-lg text-xs font-semibold border flex items-center justify-between ${currentRole.color}`}
            >
              <span>{currentRole.label}</span>
              <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
            </div>
          </div>
        )}

        {/* Navigation List */}
        <div className="flex-1 overflow-y-auto px-3 py-3 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.name}
                to={item.path}
                onClick={() => setMobileOpen(false)}
                className={({ isActive }) =>
                  `flex items-center space-x-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/20 font-semibold'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80 hover:translate-x-0.5'
                  } ${isCollapsed ? 'justify-center px-2' : ''}`
                }
                title={isCollapsed ? item.name : undefined}
              >
                <Icon className={`w-5 h-5 shrink-0 ${isCollapsed ? 'mx-auto' : ''}`} />
                {!isCollapsed && <span className="truncate">{item.name}</span>}
              </NavLink>
            );
          })}
        </div>

        {/* User Card & Logout */}
        <div className="p-3 border-t border-slate-100">
          {!isCollapsed ? (
            <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between">
              <div className="flex items-center space-x-2.5 min-w-0">
                <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-slate-700 to-slate-900 text-white flex items-center justify-center font-bold text-xs uppercase shrink-0">
                  {user?.firstName?.[0] || 'U'}
                </div>
                <div className="truncate">
                  <div className="text-xs font-bold text-slate-800 truncate">{user?.name}</div>
                  <div className="text-[10px] text-slate-400 truncate">{user?.email}</div>
                </div>
              </div>
              <button
                onClick={logout}
                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition shrink-0"
                title="Log out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={logout}
              className="w-full py-2 flex items-center justify-center rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
              title="Log out"
            >
              <LogOut className="w-5 h-5" />
            </button>
          )}
        </div>
      </aside>
    </>
  );
}

