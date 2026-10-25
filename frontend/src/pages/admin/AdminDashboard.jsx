import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Users,
  GraduationCap,
  BookOpen,
  School,
  FileText,
  Activity,
  PlusCircle,
  ArrowRight,
  Shield,
  Layers,
  ShieldAlert,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Clock,
  Building2,
  Calendar
} from 'lucide-react';
import StatCard from '../../components/common/StatCard';
import Badge from '../../components/common/Badge';
import api from '../../api/client';
import { useNotification } from '../../context/NotificationContext';

export default function AdminDashboard() {
  const { showToast, lastRealtimeEvent } = useNotification();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshingLogins, setRefreshingLogins] = useState(false);

  const loadStats = async () => {
    try {
      const res = await api.get('/admin/dashboard-stats');
      if (res.data.success) {
        setData(res.data);
      }
    } catch (err) {
      console.error('Error fetching admin stats:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStats();
  }, []);

  useEffect(() => {
    if (lastRealtimeEvent) {
      loadStats();
    }
  }, [lastRealtimeEvent]);

  const handleRefreshLogins = async () => {
    setRefreshingLogins(true);
    await loadStats();
    setRefreshingLogins(false);
    showToast('Dashboard stats and login metrics updated.', 'success');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const stats = data?.stats || {};
  const recentActivity = data?.recentActivity || [];
  const enrollmentDistribution = data?.enrollmentDistribution || [];
  const loginSummary = data?.loginSummary || {};
  const recentLoginLogs = loginSummary.recentLoginLogs || [];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
              Centralized Platform Administration
            </h1>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-200">
              Live Core
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Global management of user roles, student enrollments, institutional logins (@karunya.edu.in), and audit activity.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <Link
            to="/admin/login-activity"
            className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 transition flex items-center space-x-1.5 shadow-sm"
          >
            <ShieldAlert className="w-4 h-4 text-purple-600" />
            <span>Login Activity Logs</span>
          </Link>
          <Link
            to="/admin/students"
            className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white transition flex items-center space-x-1.5 shadow-sm"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Add Student</span>
          </Link>
        </div>
      </div>

      {/* SECTION: INSTITUTIONAL LOGIN SUMMARY CARDS (Requirement 5) */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-2">
            <Building2 className="w-4 h-4 text-blue-600" />
            <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
              Institutional Authentication & User Summary
            </h2>
          </div>
          <button
            onClick={handleRefreshLogins}
            disabled={refreshingLogins}
            className="text-xs text-blue-600 hover:text-blue-800 font-semibold flex items-center space-x-1"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshingLogins ? 'animate-spin' : ''}`} />
            <span>Live Refresh</span>
          </button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard
            title="Total Registered Students"
            value={stats.totalRegisteredStudents ?? stats.totalStudents ?? 0}
            icon={GraduationCap}
            color="blue"
          />
          <StatCard
            title="Total Registered Teachers"
            value={stats.totalRegisteredTeachers ?? stats.totalTeachers ?? 0}
            icon={Users}
            color="indigo"
          />
          <StatCard
            title="Successful Logins Today"
            value={stats.successfulLoginsToday ?? 0}
            icon={CheckCircle2}
            color="emerald"
          />
          <StatCard
            title="Unique Students Logged In Today"
            value={stats.uniqueStudentsLoggedInToday ?? 0}
            icon={Building2}
            color="purple"
          />
        </div>
      </div>

      {/* Primary Academic Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          title="Subjects"
          value={stats.totalSubjects || 0}
          icon={BookOpen}
          color="purple"
        />
        <StatCard
          title="Class Sections"
          value={stats.totalClasses || 0}
          icon={School}
          color="amber"
        />
        <StatCard
          title="Active Assignments"
          value={stats.activeAssignments || 0}
          icon={FileText}
          color="emerald"
        />
        <StatCard
          title="Submissions Received"
          value={stats.totalSubmissions || 0}
          icon={Layers}
          color="rose"
        />
      </div>

      {/* SECTION: RECENT LOGIN ACTIVITY TABLE (Requirement 5) */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-3 border-b border-slate-100">
          <div>
            <div className="flex items-center space-x-2">
              <ShieldAlert className="w-4 h-4 text-blue-600" />
              <h2 className="text-base font-bold text-slate-800">Recent Login Activity</h2>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Live database stream of successful student & faculty logins, verified @karunya.edu.in accounts, and blocked attempts.
            </p>
          </div>
          <Link
            to="/admin/login-activity"
            className="text-xs text-blue-600 hover:text-blue-800 font-bold flex items-center space-x-1 shrink-0"
          >
            <span>View Full Login Audit Log</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-100 text-slate-400 font-semibold uppercase tracking-wider text-[10px]">
                <th className="py-2.5 px-3">Student / User</th>
                <th className="py-2.5 px-3">Institutional Email</th>
                <th className="py-2.5 px-3">Role</th>
                <th className="py-2.5 px-3">Timestamp (UTC)</th>
                <th className="py-2.5 px-3">Auth Provider</th>
                <th className="py-2.5 px-3 text-right">Login Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {recentLoginLogs.length === 0 ? (
                <tr>
                  <td colSpan="6" className="text-center py-8 text-slate-400">
                    No recent login events recorded yet today.
                  </td>
                </tr>
              ) : (
                recentLoginLogs.slice(0, 7).map((log) => {
                  const isSuccess = log.login_status === 'success';
                  const dt = new Date(log.login_timestamp);

                  return (
                    <tr key={log.id} className="hover:bg-slate-50/60 transition">
                      <td className="py-2.5 px-3">
                        <div className="font-bold text-slate-900">
                          {log.user_name || (log.email.includes('@karunya.edu.in') ? log.email.split('@')[0] : 'User')}
                        </div>
                      </td>
                      <td className="py-2.5 px-3 font-mono text-slate-700">
                        {log.email}
                      </td>
                      <td className="py-2.5 px-3">
                        <Badge
                          variant={log.role === 'admin' ? 'danger' : log.role === 'teacher' ? 'indigo' : 'primary'}
                          size="xs"
                        >
                          {log.role || 'Unassigned'}
                        </Badge>
                      </td>
                      <td className="py-2.5 px-3 text-slate-500 whitespace-nowrap">
                        <div className="flex items-center space-x-1">
                          <Clock className="w-3 h-3 text-slate-400" />
                          <span>{dt.toLocaleString()}</span>
                        </div>
                      </td>
                      <td className="py-2.5 px-3">
                        {log.auth_provider === 'google_oauth' ? (
                          <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-lg border border-blue-200">
                            Google OAuth
                          </span>
                        ) : log.auth_provider === 'institutional_verification' ? (
                          <span className="text-[10px] font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-lg border border-purple-200">
                            Institutional OTP
                          </span>
                        ) : (
                          <span className="text-[10px] font-medium text-slate-600 bg-slate-100 px-2 py-0.5 rounded-lg">
                            Local Credentials
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        {isSuccess ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-lg text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <CheckCircle2 className="w-3 h-3 mr-1 text-emerald-600" />
                            Successful
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-lg text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200" title={log.failure_reason}>
                            <XCircle className="w-3 h-3 mr-1 text-rose-600" />
                            Failed
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mid Section: Course Enrollment & Quick Controls */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left: Enrollment Distribution */}
        <div className="lg:col-span-7 bg-white rounded-3xl border border-slate-200/80 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-5 pb-3 border-b border-slate-100">
            <div>
              <h2 className="text-base font-bold text-slate-800">Subject Enrollment Distribution</h2>
              <p className="text-xs text-slate-400">Total active student seats registered per course</p>
            </div>
            <Link
              to="/admin/subjects"
              className="text-xs text-blue-600 hover:text-blue-800 font-semibold flex items-center space-x-1"
            >
              <span>Manage Subjects</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="space-y-4">
            {enrollmentDistribution.map((item) => {
              const maxEnrollment = Math.max(...enrollmentDistribution.map((e) => e.enrolled_count || 1), 1);
              const percentage = Math.round(((item.enrolled_count || 0) / maxEnrollment) * 100);

              return (
                <div key={item.id} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-800">
                      {item.code}: {item.name}
                    </span>
                    <span className="text-slate-500 font-mono font-medium">
                      {item.enrolled_count} {item.enrolled_count === 1 ? 'student' : 'students'}
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${Math.max(percentage, 4)}%`,
                        backgroundColor: item.color || '#3B82F6',
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: Administrative Quick Actions & Role Enforcement Status */}
        <div className="lg:col-span-5 bg-white rounded-3xl border border-slate-200/80 p-6 shadow-sm flex flex-col justify-between">
          <div>
            <div className="mb-4 pb-3 border-b border-slate-100">
              <h2 className="text-base font-bold text-slate-800">Administrator Authority</h2>
              <p className="text-xs text-slate-400">System governance and fast-track actions</p>
            </div>

            <div className="space-y-3">
              <Link
                to="/admin/students"
                className="p-3 rounded-2xl border border-slate-200/80 hover:border-blue-300 hover:bg-blue-50/40 transition flex items-center justify-between group"
              >
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
                    <GraduationCap className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-800">Student Directory & Enrollments</div>
                    <div className="text-[11px] text-slate-400">Create, edit, and link students to classes</div>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-blue-600 transition" />
              </Link>

              <Link
                to="/admin/login-activity"
                className="p-3 rounded-2xl border border-slate-200/80 hover:border-purple-300 hover:bg-purple-50/40 transition flex items-center justify-between group"
              >
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center font-bold">
                    <ShieldAlert className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-800">Audit Login Activity</div>
                    <div className="text-[11px] text-slate-400">Inspect @karunya.edu.in student logins</div>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-purple-600 transition" />
              </Link>

              <Link
                to="/admin/audit-logs"
                className="p-3 rounded-2xl border border-slate-200/80 hover:border-indigo-300 hover:bg-indigo-50/40 transition flex items-center justify-between group"
              >
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold">
                    <Shield className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-800">Platform Audit Logs</div>
                    <div className="text-[11px] text-slate-400">Security event tracing & role verification</div>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-indigo-600 transition" />
              </Link>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>ClassSpace Security Core</span>
            <Badge variant="success">Domain Enforced (@karunya.edu.in)</Badge>
          </div>
        </div>
      </div>

      {/* Recent Platform Activity */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
          <div className="flex items-center space-x-2">
            <Activity className="w-4 h-4 text-blue-600" />
            <h2 className="text-base font-bold text-slate-800">Recent Platform Operations</h2>
          </div>
          <Link
            to="/admin/audit-logs"
            className="text-xs text-blue-600 hover:text-blue-800 font-semibold flex items-center space-x-1"
          >
            <span>View All Logs</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-100 text-slate-400 font-semibold uppercase tracking-wider text-[10px]">
                <th className="py-2.5 px-3">Timestamp</th>
                <th className="py-2.5 px-3">User</th>
                <th className="py-2.5 px-3">Role</th>
                <th className="py-2.5 px-3">Action</th>
                <th className="py-2.5 px-3">Entity</th>
                <th className="py-2.5 px-3">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {recentActivity.slice(0, 7).map((log) => (
                <tr key={log.id} className="hover:bg-slate-50/60 transition">
                  <td className="py-2.5 px-3 text-slate-500 whitespace-nowrap">
                    {new Date(log.created_at).toLocaleString()}
                  </td>
                  <td className="py-2.5 px-3 font-semibold text-slate-800">
                    {log.user_email || 'System'}
                  </td>
                  <td className="py-2.5 px-3">
                    <Badge
                      variant={
                        log.role === 'admin'
                          ? 'danger'
                          : log.role === 'teacher'
                          ? 'indigo'
                          : log.role === 'student'
                          ? 'primary'
                          : 'default'
                      }
                      size="xs"
                    >
                      {log.role}
                    </Badge>
                  </td>
                  <td className="py-2.5 px-3 font-mono text-[11px] text-blue-600 font-medium">
                    {log.action}
                  </td>
                  <td className="py-2.5 px-3 text-slate-600">{log.entity_type}</td>
                  <td className="py-2.5 px-3 text-slate-500 max-w-xs truncate">
                    {log.details || '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
