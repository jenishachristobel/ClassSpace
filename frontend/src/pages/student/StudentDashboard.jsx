import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  BookOpen,
  Clock,
  CheckCircle2,
  Award,
  Bell,
  ArrowRight,
  FileText,
  Calendar,
  Sparkles,
  ChevronRight
} from 'lucide-react';
import StatCard from '../../components/common/StatCard';
import Badge from '../../components/common/Badge';
import api from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';

export default function StudentDashboard() {
  const { user } = useAuth();
  const { lastRealtimeEvent } = useNotification();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      const res = await api.get('/student/dashboard');
      if (res.data.success) {
        setData(res.data);
      }
    } catch (err) {
      console.error('Error loading student dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  // Automatic real-time refresh on assignment, grade, or announcement event
  useEffect(() => {
    if (lastRealtimeEvent) {
      load();
    }
  }, [lastRealtimeEvent]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const stats = data?.stats || {};
  const enrolledSubjects = data?.enrolledSubjects || [];
  const pendingAssignments = data?.pendingAssignments || [];
  const recentSubmissions = data?.recentSubmissions || [];
  const recentGrades = data?.recentGrades || [];
  const announcements = data?.announcements || [];

  return (
    <div className="space-y-8">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 -mt-8 -mr-8 w-64 h-64 bg-white/10 rounded-full blur-2xl pointer-events-none" />
        <div className="relative z-10 max-w-2xl">
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-white/15 text-blue-100 mb-3 border border-white/15">
            <Sparkles className="w-3.5 h-3.5 mr-1.5" />
            Welcome back to ClassSpace
          </span>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight mb-2">
            Hello, {user?.firstName}!
          </h1>
          <p className="text-xs sm:text-sm text-blue-100/90 leading-relaxed">
            You are enrolled in <strong>{stats.enrolledSubjectsCount || 0} academic subjects</strong> this term.
            {pendingAssignments.length > 0 ? (
              <span> You have <strong className="text-amber-200">{stats.pendingAssignmentsCount} pending assignment{stats.pendingAssignmentsCount > 1 ? 's' : ''}</strong> awaiting your submission.</span>
            ) : (
              <span> All current coursework is submitted. Great job!</span>
            )}
          </p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          title="Enrolled Subjects"
          value={stats.enrolledSubjectsCount || 0}
          icon={BookOpen}
          color="blue"
        />
        <StatCard
          title="Pending Due"
          value={stats.pendingAssignmentsCount || 0}
          icon={Clock}
          color="amber"
        />
        <StatCard
          title="Submitted"
          value={stats.submittedCount || 0}
          icon={CheckCircle2}
          color="emerald"
        />
        <StatCard
          title="Published Grades"
          value={stats.gradedCount || 0}
          icon={Award}
          color="purple"
        />
      </div>

      {/* Main Grid: Pending Work & Enrolled Courses */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Pending Assignments & Announcements */}
        <div className="lg:col-span-7 space-y-6">
          {/* Pending Coursework */}
          <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
              <div>
                <h2 className="text-base font-bold text-slate-800">Pending Assignments</h2>
                <p className="text-xs text-slate-400">Upcoming coursework requiring your document submission</p>
              </div>
              <Link
                to="/student/assignments"
                className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center space-x-1"
              >
                <span>View All</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {pendingAssignments.length === 0 ? (
              <div className="text-center py-8 text-slate-400 text-xs">
                No pending assignments right now. You are up to date!
              </div>
            ) : (
              <div className="space-y-3">
                {pendingAssignments.map((a) => (
                  <div
                    key={a.id}
                    className="p-4 rounded-2xl border border-slate-200 hover:border-blue-300 hover:bg-blue-50/20 transition flex flex-col sm:flex-row sm:items-center justify-between gap-3 group"
                  >
                    <div>
                      <div className="flex items-center space-x-2 mb-1">
                        <span
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: a.color || '#3B82F6' }}
                        />
                        <span className="text-[11px] font-bold text-slate-500 uppercase">
                          {a.subject_code}
                        </span>
                        <span className="text-slate-300">&bull;</span>
                        <span className="text-[11px] text-slate-400">{a.subject_name}</span>
                      </div>
                      <h3 className="font-bold text-xs sm:text-sm text-slate-900 group-hover:text-blue-600 transition">
                        {a.title}
                      </h3>
                      <div className="text-[11px] text-amber-600 font-medium mt-1 flex items-center">
                        <Clock className="w-3.5 h-3.5 mr-1" />
                        Due: {new Date(a.due_date).toLocaleDateString()} at{' '}
                        {new Date(a.due_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>

                    <Link
                      to={`/student/assignments/${a.id}`}
                      className="px-4 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shrink-0 text-center transition shadow-sm"
                    >
                      Submit Work
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Course Announcements Banner */}
          <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-sm">
            <div className="flex items-center space-x-2 mb-4 pb-3 border-b border-slate-100">
              <Bell className="w-4 h-4 text-blue-600" />
              <h2 className="text-base font-bold text-slate-800">Recent Course Announcements</h2>
            </div>

            {announcements.length === 0 ? (
              <p className="text-xs text-slate-400 py-4 text-center">No announcements posted yet.</p>
            ) : (
              <div className="space-y-3">
                {announcements.map((an) => (
                  <div key={an.id} className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-800">{an.title}</span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {new Date(an.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed">{an.content}</p>
                    <div className="text-[10px] text-slate-400 pt-1 flex items-center justify-between">
                      <span>Posted by: <strong>{an.author_name}</strong></span>
                      <Badge variant="default" size="xs">{an.code}</Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Enrolled Subjects Cards Preview & Published Grades */}
        <div className="lg:col-span-5 space-y-6">
          {/* Enrolled Subjects Quick Cards */}
          <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
              <h2 className="text-base font-bold text-slate-800">My Subjects</h2>
              <Link
                to="/student/subjects"
                className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center space-x-1"
              >
                <span>View All ({enrolledSubjects.length})</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="space-y-3">
              {enrolledSubjects.map((sub) => (
                <Link
                  key={sub.id}
                  to={`/student/subjects/${sub.id}`}
                  className="p-3.5 rounded-2xl border border-slate-200 hover:border-blue-400 hover:shadow-sm transition flex items-center justify-between group"
                >
                  <div className="flex items-center space-x-3">
                    <div
                      className="w-10 h-10 rounded-xl text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-sm"
                      style={{ backgroundColor: sub.color || '#3B82F6' }}
                    >
                      {sub.code.substring(0, 2)}
                    </div>
                    <div>
                      <div className="font-bold text-xs text-slate-800 group-hover:text-blue-600 transition">
                        {sub.name}
                      </div>
                      <div className="text-[11px] text-slate-400">{sub.code} &bull; {sub.department}</div>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-blue-600 group-hover:translate-x-0.5 transition" />
                </Link>
              ))}
            </div>
          </div>

          {/* Recently Published Grades */}
          <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
              <div className="flex items-center space-x-2">
                <Award className="w-4 h-4 text-emerald-600" />
                <h2 className="text-base font-bold text-slate-800">Published Grades</h2>
              </div>
              <Link
                to="/student/grades"
                className="text-xs font-semibold text-blue-600 hover:text-blue-800"
              >
                Gradebook
              </Link>
            </div>

            {recentGrades.length === 0 ? (
              <p className="text-xs text-slate-400 py-4 text-center">
                No grades published yet for recent submissions.
              </p>
            ) : (
              <div className="space-y-3">
                {recentGrades.map((g) => (
                  <div key={g.id} className="p-3.5 rounded-2xl bg-emerald-50/50 border border-emerald-100">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-xs text-slate-800">{g.assignment_title}</span>
                      <span className="font-extrabold text-xs text-emerald-700">
                        {g.marks_obtained} / {g.max_marks}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-500 mb-2">{g.code}: {g.subject_name}</div>
                    {g.feedback && (
                      <p className="text-[11px] italic text-slate-600 bg-white/70 p-2 rounded-xl border border-emerald-100">
                        "{g.feedback}"
                      </p>
                    )}
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

