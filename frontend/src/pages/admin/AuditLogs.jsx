import React, { useState, useEffect } from 'react';
import { ShieldCheck, Search, Filter, RefreshCw } from 'lucide-react';
import api from '../../api/client';
import Badge from '../../components/common/Badge';

export default function AuditLogs() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionFilter, setActionFilter] = useState('');
  const [total, setTotal] = useState(0);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const res = await api.get('/admin/audit-logs', {
        params: { action: actionFilter, limit: 100 }
      });
      if (res.data.success) {
        setLogs(res.data.logs || []);
        setTotal(res.data.total || 0);
      }
    } catch (e) {
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [actionFilter]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            System Security & Audit Logs
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Immutable tracking of logins, role authorization events, grading actions, and external plagiarism checks.
          </p>
        </div>

        <button
          onClick={fetchLogs}
          className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 transition flex items-center space-x-1.5 shadow-sm"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh Logs</span>
        </button>
      </div>

      {/* Filter */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-3 shadow-sm flex items-center space-x-3">
        <Search className="w-4 h-4 text-slate-400 shrink-0 ml-2" />
        <input
          type="text"
          placeholder="Filter by action (e.g. LOGIN, ENROLL, GRADE, PLAGIARISM)..."
          value={actionFilter}
          onChange={(e) => setActionFilter(e.target.value)}
          className="w-full text-xs text-slate-800 placeholder-slate-400 outline-none"
        />
        {actionFilter && (
          <button onClick={() => setActionFilter('')} className="text-xs text-slate-400 hover:text-slate-600 mr-2">
            Clear
          </button>
        )}
      </div>

      {/* Logs Table */}
      <div className="bg-white rounded-3xl border border-slate-200/80 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200/80 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
                <th className="py-3 px-4">Timestamp</th>
                <th className="py-3 px-4">Operator / Email</th>
                <th className="py-3 px-4">Role</th>
                <th className="py-3 px-4">Action Event</th>
                <th className="py-3 px-4">Entity Type</th>
                <th className="py-3 px-4">Event Details</th>
                <th className="py-3 px-4">IP Address</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan="7" className="text-center py-8 text-slate-400">Loading audit records...</td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan="7" className="text-center py-8 text-slate-400">No logs found matching filter.</td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/70 transition">
                    <td className="py-3 px-4 text-slate-500 whitespace-nowrap">
                      {new Date(log.created_at).toLocaleString()}
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-800">{log.user_email || 'System'}</td>
                    <td className="py-3 px-4">
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
                    <td className="py-3 px-4 font-mono font-bold text-blue-600 text-[11px] whitespace-nowrap">
                      {log.action}
                    </td>
                    <td className="py-3 px-4 text-slate-600">{log.entity_type}</td>
                    <td className="py-3 px-4 text-slate-600 max-w-sm truncate font-mono text-[11px]">
                      {log.details || '—'}
                    </td>
                    <td className="py-3 px-4 text-slate-400 font-mono text-[10px]">{log.ip_address || '127.0.0.1'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

