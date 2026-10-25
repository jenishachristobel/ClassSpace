import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  BookOpen,
  Users,
  FileText,
  Clock,
  ArrowRight,
  ClipboardList,
  ChevronRight,
  Sparkles,
  Plus
} from 'lucide-react';
import StatCard from '../../components/common/StatCard';
import Badge from '../../components/common/Badge';
import api from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';

export default function TeacherDashboard() {
  const { user } = useAuth();
  const { lastRealtimeEvent } = useNotification();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      const res = await api.get('/teacher/dashboard');
      if (res.data.success) {
        setData(res.data);
      }
    } catch (e) {
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    if (lastRealtimeEvent) {
      load();
    }
  }, [lastRealtimeEvent]);

  if (loading) {
    return <div className="text-center py-20 text-slate-400">Loading faculty dashboard...</div>;
  }

  const stats = data?.stats || {};
  const assignedSubjects = data?.assignedSubjects || [];
  const recentSubmissions = data?.recentSubmissions || [];

  return (
    <div className="space-y-8">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-indigo-700 via-indigo-600 to-purple-800 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 -mt-8 -mr-8 w-64 h-64 bg-white/10 rounded-full blur-2xl pointer-events-none" />
        <div className="relative z-10 max-w-2xl">
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-white/15 text-indigo-100 mb-3 border border-white/15">
            <Sparkles className="w-3.5 h-3.5 mr-1.5" />
            Faculty Portal &bull; {user?.department}
          </span>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight mb-2">
            Welcome, Professor {user?.lastName}!
          </h1>
          <p className="text-xs sm:text-sm text-indigo-100/90 leading-relaxed">
            You are authorized to manage <strong>{stats.assignedSubjectsCount || 0} assigned subjects</strong> instructing <strong>{stats.totalStudentsCount || 0} students</strong>.
            {stats.pendingGradingCount > 0 ? (
              <span> You have <strong className="text-amber-200">{stats.pendingGradingCount} submission{stats.pendingGradingCount > 1 ? 's' : ''}</strong> awaiting grading review.</span>
            ) : (
              <span> All current submissions have been graded.</span>
            )}
          </p>
        </div>
      </div>

      {/* Summary Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          title="Assigned Subjects"
          value={stats.assignedSubjectsCount || 0}
          icon={BookOpen}
          color="indigo"
        />
        <StatCard
          title="Total Students"
          value={stats.totalStudentsCount || 0}
          icon={Users}
          color="blue"
        />
        <StatCard
          title="Active Assignments"
          value={stats.activeAssignmentsCount || 0}
          icon={FileText}
          color="purple"
        />
        <StatCard
          title="Awaiting Grading"
          value={stats.pendingGradingCount || 0}
          icon={Clock}
          color="amber"
        />
      </div>

      {/* Two Column Layout: Assigned Subjects & Recent Submissions */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left: My Assigned Subjects */}
        <div className="lg:col-span-6 space-y-6">
          <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
              <div>
                <h2 className="text-base font-bold text-slate-800">My Assigned Subjects</h2>
                <p className="text-xs text-slate-400">Restricted to your administrator-authorized courses</p>
              </div>
              <Link
                to="/teacher/subjects"
                className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center space-x-1"
              >
                <span>View All</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="space-y-4">
              {assignedSubjects.map((sub) => (
                <div
                  key={sub.id}
                  className="p-4 rounded-2xl border border-slate-200 hover:border-indigo-300 hover:shadow-sm transition flex flex-col justify-between group"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-2.5">
                      <div
                        className="w-9 h-9 rounded-xl text-white flex items-center justify-center font-bold text-xs shrink-0"
                        style={{ backgroundColor: sub.color || '#6366F1' }}
                      >
                        {sub.code.substring(0, 2)}
                      </div>
                      <div>
                        <h3 className="font-bold text-xs sm:text-sm text-slate-900 group-hover:text-indigo-600 transition">
                          {sub.name}
                        </h3>
                        <span className="text-[10px] font-mono text-slate-400">{sub.code}</span>
                      </div>
                    </div>
                    <Badge variant="indigo" size="xs">
                      {sub.student_count || 0} Students
                    </Badge>
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t border-slate-100 text-xs mt-2">
                    <span className="text-slate-500 text-[11px]">
                      Pending grading: <strong className="text-amber-600 font-bold">{sub.pending_grading_count || 0}</strong>
                    </span>
                    <Link
                      to={`/teacher/subjects/${sub.id}`}
                      className="px-3 py-1.5 rounded-xl font-bold text-xs bg-indigo-50 hover:bg-indigo-600 hover:text-white text-indigo-700 transition"
                    >
                      Manage Subject
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right: Recent Submissions Awaiting Review */}
        <div className="lg:col-span-6 space-y-6">
          <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
              <div>
                <h2 className="text-base font-bold text-slate-800">Recent Student Submissions</h2>
                <p className="text-xs text-slate-400">Newly received documents ready for grading and plagiarism scan</p>
              </div>
              <Link
                to="/teacher/submissions"
                className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center space-x-1"
              >
                <span>Submissions</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {recentSubmissions.length === 0 ? (
              <div className="text-center py-8 text-slate-400 text-xs">
                No recent submissions awaiting grading.
              </div>
            ) : (
              <div className="space-y-3">
                {recentSubmissions.map((sub) => (
                  <div
                    key={sub.id}
                    className="p-3.5 rounded-2xl bg-slate-50/70 border border-slate-200/80 hover:bg-white hover:border-indigo-300 transition flex items-center justify-between"
                  >
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="font-bold text-xs text-slate-900">{sub.student_name}</span>
                        <span className="text-[10px] font-mono text-slate-400">{sub.student_code}</span>
                      </div>
                      <div className="text-[11px] text-slate-700 mt-0.5">
                        <strong className="text-indigo-600 font-bold">{sub.subject_code}</strong>: {sub.assignment_title}
                      </div>
                      <div className="text-[10px] text-slate-400 mt-1">
                        File: <span className="font-mono text-slate-600">{sub.file_name || 'document.pdf'}</span> &bull; Submitted {new Date(sub.submitted_at).toLocaleDateString()}
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Link
                        to={`/teacher/assignments/${sub.assignment_id}/submissions`}
                        className="px-3 py-1.5 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white transition shadow-sm"
                      >
                        Review
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

