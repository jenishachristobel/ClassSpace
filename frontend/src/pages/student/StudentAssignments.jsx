import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  FileText,
  Clock,
  CheckCircle2,
  AlertCircle,
  Search,
  Filter,
  ChevronRight,
  Upload,
  Calendar,
  Award,
  BookOpen,
  User
} from 'lucide-react';
import api from '../../api/client';
import Badge from '../../components/common/Badge';
import { useNotification } from '../../context/NotificationContext';

export default function StudentAssignments() {
  const { lastRealtimeEvent } = useNotification();
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all'); // 'all' | 'pending' | 'submitted' | 'graded'

  const fetchAssignments = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get('/student/assignments');
      if (res.data.success) {
        setAssignments(res.data.assignments || []);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load assignments.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAssignments();
  }, []);

  useEffect(() => {
    if (lastRealtimeEvent) {
      fetchAssignments();
    }
  }, [lastRealtimeEvent]);

  // Extract unique subjects for dropdown filter
  const subjects = Array.from(
    new Map(
      assignments.map((a) => [a.subject_id, { id: a.subject_id, name: a.subject_name, code: a.subject_code, color: a.color }])
    ).values()
  );

  // Filtered assignments
  const filtered = assignments.filter((a) => {
    // Subject filter
    if (selectedSubject !== 'all' && String(a.subject_id) !== String(selectedSubject)) {
      return false;
    }

    // Status filter
    if (selectedStatus === 'pending' && a.submission_id) return false;
    if (selectedStatus === 'submitted' && (!a.submission_id || a.is_published === 1)) return false;
    if (selectedStatus === 'graded' && a.is_published !== 1) return false;

    // Search filter
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      const matchTitle = a.title.toLowerCase().includes(term);
      const matchSubject = a.subject_name.toLowerCase().includes(term) || a.subject_code.toLowerCase().includes(term);
      const matchTeacher = (a.teacher_name || '').toLowerCase().includes(term);
      if (!matchTitle && !matchSubject && !matchTeacher) return false;
    }

    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 -mt-8 -mr-8 w-64 h-64 bg-white/10 rounded-full blur-2xl pointer-events-none" />
        <div className="relative z-10 max-w-2xl">
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-white/15 text-blue-100 mb-3 border border-white/15">
            <FileText className="w-3.5 h-3.5 mr-1.5" />
            Student Academic Coursework
          </span>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight mb-2">
            Assignments & Submissions
          </h1>
          <p className="text-xs sm:text-sm text-blue-100/90 leading-relaxed">
            View coursework published by your instructors, submit digital assignment documents (PDF, DOCX), inspect submission timestamps, and view faculty grades.
          </p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-4 sm:p-5 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by assignment title, subject, or instructor name..."
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-10 pr-4 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition"
            />
          </div>

          {/* Subject Dropdown Filter */}
          <div className="flex items-center space-x-2 shrink-0">
            <Filter className="w-4 h-4 text-slate-400 shrink-0" />
            <select
              value={selectedSubject}
              onChange={(e) => setSelectedSubject(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-2xl px-3 py-2 text-xs text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Enrolled Subjects ({subjects.length})</option>
              {subjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.code} - {s.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Status Filter Tabs */}
        <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-100 text-xs">
          {[
            { key: 'all', label: `All Coursework (${assignments.length})` },
            { key: 'pending', label: `Pending Due (${assignments.filter((a) => !a.submission_id).length})` },
            { key: 'submitted', label: `Submitted (${assignments.filter((a) => a.submission_id && a.is_published !== 1).length})` },
            { key: 'graded', label: `Graded (${assignments.filter((a) => a.is_published === 1).length})` }
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setSelectedStatus(tab.key)}
              className={`px-3 py-1.5 rounded-xl font-bold transition text-xs ${
                selectedStatus === tab.key
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-slate-100 hover:bg-slate-200/80 text-slate-600'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Assignments List */}
      <div className="space-y-4">
        {loading ? (
          <div className="text-center py-20 text-slate-400">Loading assignments...</div>
        ) : error ? (
          <div className="bg-rose-50 border border-rose-200 rounded-3xl p-8 text-center text-rose-700 text-xs">
            <AlertCircle className="w-8 h-8 text-rose-500 mx-auto mb-2" />
            <span>{error}</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 text-xs text-slate-400">
            <FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="font-bold text-slate-700 text-sm">No Assignments Found</h3>
            <p className="mt-1">Try adjusting your filters or search keywords.</p>
          </div>
        ) : (
          filtered.map((a) => {
            const isLate = new Date() > new Date(a.due_date);
            return (
              <div
                key={a.id}
                className="bg-white rounded-3xl border border-slate-200/90 p-5 sm:p-6 shadow-sm hover:shadow-md transition flex flex-col md:flex-row md:items-center justify-between gap-5 group"
              >
                <div className="space-y-2 max-w-2xl">
                  {/* Subject and Instructor meta */}
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <span
                      className="inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-lg text-white font-bold text-[11px]"
                      style={{ backgroundColor: a.color || '#3B82F6' }}
                    >
                      <span>{a.subject_code}</span>
                    </span>
                    <span className="font-semibold text-slate-700">{a.subject_name}</span>
                    <span className="text-slate-300">&bull;</span>
                    <span className="text-slate-500 flex items-center">
                      <User className="w-3.5 h-3.5 mr-1 text-slate-400" />
                      {a.teacher_name || 'Course Faculty'}
                    </span>
                  </div>

                  {/* Title & Description */}
                  <div>
                    <h2 className="font-bold text-base text-slate-900 group-hover:text-blue-600 transition">
                      {a.title}
                    </h2>
                    <p className="text-xs text-slate-500 line-clamp-2 mt-1">
                      {a.description}
                    </p>
                  </div>

                  {/* Submission & Due Date Info */}
                  <div className="flex flex-wrap items-center gap-3 pt-1 text-[11px] text-slate-500">
                    <span className="flex items-center text-amber-700 font-semibold bg-amber-50 px-2.5 py-0.5 rounded-lg border border-amber-200/70">
                      <Clock className="w-3.5 h-3.5 mr-1 text-amber-600" />
                      Due: {new Date(a.due_date).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                    </span>
                    <span>&bull;</span>
                    <span>Max Points: <strong>{a.max_marks} pts</strong></span>
                    <span>&bull;</span>
                    <span>Accepted: <strong>{a.allowed_file_types || 'PDF, DOCX'}</strong></span>
                    {a.created_at && (
                      <>
                        <span>&bull;</span>
                        <span className="text-slate-400">Published: {new Date(a.created_at).toLocaleDateString()}</span>
                      </>
                    )}
                  </div>
                </div>

                {/* Right Action / Status Card */}
                <div className="flex flex-row md:flex-col items-center md:items-end justify-between md:justify-center gap-3 shrink-0 pt-3 md:pt-0 border-t md:border-t-0 border-slate-100">
                  {/* Status Badge */}
                  <div>
                    {a.submission_id ? (
                      a.is_published === 1 ? (
                        <span className="inline-flex items-center px-3 py-1 rounded-xl text-xs font-bold bg-emerald-100 text-emerald-800">
                          <Award className="w-3.5 h-3.5 mr-1 text-emerald-600" />
                          Graded: {a.marks_obtained} / {a.max_marks}
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-3 py-1 rounded-xl text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                          <CheckCircle2 className="w-3.5 h-3.5 mr-1 text-blue-600" />
                          {a.submission_status === 'late' ? 'Submitted Late' : 'Submitted (Awaiting Grade)'}
                        </span>
                      )
                    ) : isLate ? (
                      <span className="inline-flex items-center px-3 py-1 rounded-xl text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                        <AlertCircle className="w-3.5 h-3.5 mr-1 text-rose-600" />
                        Missing / Past Due
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-3 py-1 rounded-xl text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                        Pending Submission
                      </span>
                    )}
                  </div>

                  {/* Upload / View Button */}
                  <Link
                    to={`/student/assignments/${a.id}`}
                    className={`px-4 py-2.5 rounded-xl text-xs font-bold transition flex items-center space-x-1.5 shadow-sm ${
                      a.submission_id
                        ? 'bg-slate-100 hover:bg-slate-200 text-slate-800'
                        : 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-500/20'
                    }`}
                  >
                    {a.submission_id ? (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" />
                        <span>View Work & History</span>
                      </>
                    ) : (
                      <>
                        <Upload className="w-3.5 h-3.5" />
                        <span>Upload Assignment</span>
                      </>
                    )}
                    <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
                  </Link>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

