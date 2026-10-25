import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  Search,
  Filter,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Calendar,
  Clock,
  User,
  Building2,
  KeyRound,
  Download,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  Users
} from 'lucide-react';
import api from '../../api/client';
import Badge from '../../components/common/Badge';
import StatCard from '../../components/common/StatCard';
import { useNotification } from '../../context/NotificationContext';

export default function LoginActivity() {
  const { showToast } = useNotification();
  const [logs, setLogs] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Filters
  const [searchEmail, setSearchEmail] = useState('');
  const [filterRole, setFilterRole] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterProvider, setFilterProvider] = useState('all');
  const [filterDate, setFilterDate] = useState('');

  // Pagination
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const limit = 20;

  const fetchLogs = async (pageNumber = 1) => {
    try {
      const params = {
        page: pageNumber,
        limit,
        email: searchEmail,
        role: filterRole,
        status: filterStatus,
        authProvider: filterProvider,
        startDate: filterDate,
        endDate: filterDate
      };

      const res = await api.get('/admin/login-activity', { params });
      if (res.data.success) {
        setLogs(res.data.logs || []);
        setTotalPages(res.data.totalPages || 1);
        setTotalCount(res.data.total || 0);
        setPage(res.data.page || 1);
      }
    } catch (err) {
      console.error('Error fetching login activity logs:', err);
      showToast('Failed to load login activity logs.', 'error');
    }
  };

  const fetchSummary = async () => {
    try {
      const res = await api.get('/admin/login-summary');
      if (res.data.success) {
        setSummary(res.data.summary);
      }
    } catch (err) {
      console.error('Error fetching login summary:', err);
    }
  };

  useEffect(() => {
    setLoading(true);
    Promise.all([fetchLogs(1), fetchSummary()]).finally(() => {
      setLoading(false);
    });
  }, []);

  const handleApplyFilters = (e) => {
    e.preventDefault();
    setPage(1);
    fetchLogs(1);
  };

  const handleResetFilters = () => {
    setSearchEmail('');
    setFilterRole('all');
    setFilterStatus('all');
    setFilterProvider('all');
    setFilterDate('');
    setPage(1);
    // Fetch with empty params
    setTimeout(() => {
      fetchLogs(1);
    }, 50);
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([fetchLogs(page), fetchSummary()]);
    setRefreshing(false);
    showToast('Login activity refreshed from database.', 'success');
  };

  const formatDateTime = (timestamp) => {
    if (!timestamp) return { dateStr: '—', timeStr: '—' };
    try {
      const dt = new Date(timestamp);
      return {
        dateStr: dt.toLocaleDateString(undefined, {
          year: 'numeric',
          month: 'short',
          day: 'numeric'
        }),
        timeStr: dt.toLocaleTimeString(undefined, {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          timeZoneName: 'short'
        })
      };
    } catch (e) {
      return { dateStr: timestamp, timeStr: '' };
    }
  };

  const renderProviderBadge = (provider) => {
    if (provider === 'google_oauth') {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-lg text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
          <svg className="w-3 h-3 mr-1" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
          </svg>
          Google OAuth
        </span>
      );
    }
    if (provider === 'institutional_verification') {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-lg text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
          <Building2 className="w-3 h-3 mr-1 text-purple-600" />
          Institutional OTP
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-lg text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
        <KeyRound className="w-3 h-3 mr-1 text-slate-500" />
        Local Credentials
      </span>
    );
  };

  const renderRoleBadge = (role) => {
    if (role === 'admin') {
      return <Badge variant="rose" size="xs">Admin</Badge>;
    }
    if (role === 'teacher') {
      return <Badge variant="indigo" size="xs">Teacher</Badge>;
    }
    return <Badge variant="blue" size="xs">Student</Badge>;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
              Login Activity Logs
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
              Live Database Audit
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Real-time audit log of authenticated student logins, institutional accounts (@karunya.edu.in), and rejected attempts.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 transition flex items-center space-x-1.5 shadow-sm"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-blue-600' : ''}`} />
            <span>Refresh Logs</span>
          </button>
        </div>
      </div>

      {/* Summary Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
            Total Students Registered
          </span>
          <div className="text-2xl font-extrabold text-blue-600">
            {summary?.totalRegisteredStudents ?? '—'}
          </div>
          <span className="text-[10px] text-slate-500">Database provisioned accounts</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
            Total Teachers Registered
          </span>
          <div className="text-2xl font-extrabold text-indigo-600">
            {summary?.totalRegisteredTeachers ?? '—'}
          </div>
          <span className="text-[10px] text-slate-500">Authorized faculty members</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
            Successful Logins Today
          </span>
          <div className="text-2xl font-extrabold text-emerald-600">
            {summary?.successfulLoginsToday ?? '—'}
          </div>
          <span className="text-[10px] text-slate-500">UTC calendar date</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
            Unique Students Today
          </span>
          <div className="text-2xl font-extrabold text-purple-600">
            {summary?.uniqueStudentsLoggedInToday ?? '—'}
          </div>
          <span className="text-[10px] text-slate-500">Active student users</span>
        </div>
      </div>

      {/* Filter Toolbar */}
      <form onSubmit={handleApplyFilters} className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-sm space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* Search by Email or Name */}
          <div>
            <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
              Search Email or Name
            </label>
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchEmail}
                onChange={(e) => setSearchEmail(e.target.value)}
                placeholder="e.g. jenisha@karunya.edu.in"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition"
              />
            </div>
          </div>

          {/* Role Filter */}
          <div>
            <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
              Filter by Role
            </label>
            <select
              value={filterRole}
              onChange={(e) => setFilterRole(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
            >
              <option value="all">All Roles</option>
              <option value="student">Student</option>
              <option value="teacher">Teacher</option>
              <option value="admin">Administrator</option>
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
              Login Outcome
            </label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
            >
              <option value="all">All Outcomes</option>
              <option value="success">Successful Logins</option>
              <option value="failed">Failed Attempts</option>
            </select>
          </div>

          {/* Provider Filter */}
          <div>
            <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
              Auth Provider
            </label>
            <select
              value={filterProvider}
              onChange={(e) => setFilterProvider(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
            >
              <option value="all">All Providers</option>
              <option value="google_oauth">Google OAuth</option>
              <option value="institutional_verification">Institutional OTP</option>
              <option value="local_credentials">Local Credentials</option>
            </select>
          </div>

          {/* Date Filter & Action Buttons */}
          <div>
            <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
              Filter Date
            </label>
            <div className="flex space-x-1.5">
              <input
                type="date"
                value={filterDate}
                onChange={(e) => setFilterDate(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
              />
              <button
                type="submit"
                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl transition shrink-0"
              >
                Filter
              </button>
              <button
                type="button"
                onClick={handleResetFilters}
                className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs rounded-xl transition shrink-0"
                title="Reset Filters"
              >
                Reset
              </button>
            </div>
          </div>
        </div>
      </form>

      {/* Login Activity Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
                <th className="py-3.5 px-4">Student / User Name</th>
                <th className="py-3.5 px-4">Institutional Email</th>
                <th className="py-3.5 px-4">Role</th>
                <th className="py-3.5 px-4">Login Date</th>
                <th className="py-3.5 px-4">Login Time (UTC)</th>
                <th className="py-3.5 px-4">Auth Provider</th>
                <th className="py-3.5 px-4">Login Status</th>
                <th className="py-3.5 px-4 text-right">Event ID / Audit Info</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan="8" className="text-center py-12 text-slate-400">
                    <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                    <span>Loading authentic login activity records...</span>
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan="8" className="text-center py-12 text-slate-400">
                    <ShieldCheck className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                    <div className="text-sm font-semibold text-slate-600">No login records found</div>
                    <p className="text-xs text-slate-400 mt-1">Try clearing filters or search terms.</p>
                  </td>
                </tr>
              ) : (
                logs.map((log) => {
                  const { dateStr, timeStr } = formatDateTime(log.login_timestamp);
                  const isSuccess = log.login_status === 'success';

                  return (
                    <tr key={log.id} className="hover:bg-slate-50/60 transition">
                      {/* Student Name */}
                      <td className="py-3 px-4">
                        <div className="flex items-center space-x-2.5">
                          <div className="w-7 h-7 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center font-bold text-slate-700 text-xs shrink-0">
                            {log.user_name ? log.user_name.charAt(0).toUpperCase() : log.email.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-bold text-slate-900">
                              {log.user_name || (log.email.includes('@karunya.edu.in') ? log.email.split('@')[0] : 'Unregistered User')}
                            </div>
                            <div className="text-[10px] text-slate-400 font-mono">
                              {log.user_id ? `UID: ${log.user_id}` : 'Unassigned'}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Institutional Email */}
                      <td className="py-3 px-4">
                        <div className="font-mono text-slate-800 font-medium">
                          {log.email}
                        </div>
                        {log.email.endsWith('@karunya.edu.in') && (
                          <span className="text-[10px] text-blue-600 font-sans font-medium flex items-center space-x-1">
                            <span>Karunya Domain</span>
                          </span>
                        )}
                      </td>

                      {/* Role */}
                      <td className="py-3 px-4">
                        {renderRoleBadge(log.role)}
                      </td>

                      {/* Login Date */}
                      <td className="py-3 px-4 text-slate-700 whitespace-nowrap">
                        <div className="flex items-center space-x-1.5">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          <span>{dateStr}</span>
                        </div>
                      </td>

                      {/* Login Time */}
                      <td className="py-3 px-4 text-slate-700 whitespace-nowrap">
                        <div className="flex items-center space-x-1.5">
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                          <span>{timeStr}</span>
                        </div>
                      </td>

                      {/* Auth Provider */}
                      <td className="py-3 px-4">
                        {renderProviderBadge(log.auth_provider)}
                      </td>

                      {/* Login Status */}
                      <td className="py-3 px-4">
                        {isSuccess ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-lg text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <CheckCircle2 className="w-3 h-3 mr-1 text-emerald-600" />
                            Successful
                          </span>
                        ) : (
                          <div>
                            <span className="inline-flex items-center px-2 py-0.5 rounded-lg text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200">
                              <XCircle className="w-3 h-3 mr-1 text-rose-600" />
                              Failed
                            </span>
                            {log.failure_reason && (
                              <div className="text-[10px] text-rose-600 mt-0.5 max-w-[180px] truncate" title={log.failure_reason}>
                                {log.failure_reason}
                              </div>
                            )}
                          </div>
                        )}
                      </td>

                      {/* Event ID / Audit Info */}
                      <td className="py-3 px-4 text-right">
                        <code className="text-[10px] text-slate-500 font-mono bg-slate-100 px-1.5 py-0.5 rounded">
                          {log.event_id || `evt_${log.id}`}
                        </code>
                        <div className="text-[10px] text-slate-400 mt-0.5">
                          IP: {log.ip_address || '127.0.0.1'}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        <div className="px-4 py-3 bg-slate-50/80 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <div className="text-slate-500">
            Showing <strong className="text-slate-800">{logs.length}</strong> of <strong className="text-slate-800">{totalCount}</strong> login events (Page {page} of {totalPages})
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => fetchLogs(page - 1)}
              disabled={page <= 1}
              className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition flex items-center space-x-1"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              <span>Previous</span>
            </button>
            <button
              onClick={() => fetchLogs(page + 1)}
              disabled={page >= totalPages}
              className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition flex items-center space-x-1"
            >
              <span>Next</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

