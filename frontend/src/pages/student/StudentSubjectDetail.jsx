import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  BookOpen,
  Users,
  Bell,
  FileText,
  Download,
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  ArrowLeft,
  ChevronRight
} from 'lucide-react';
import api from '../../api/client';
import Badge from '../../components/common/Badge';

export default function StudentSubjectDetail() {
  const { subjectId } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('assignments'); // 'assignments' | 'materials' | 'announcements'

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const res = await api.get(`/student/subjects/${subjectId}`);
        if (res.data.success) {
          setData(res.data);
        }
      } catch (err) {
        setError(err.response?.data?.message || 'Access Denied: You are not enrolled in this course.');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [subjectId]);

  if (loading) {
    return (
      <div className="text-center py-20 text-slate-400">Loading course workspace...</div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-3xl p-12 text-center border border-rose-200 max-w-lg mx-auto mt-10">
        <AlertCircle className="w-12 h-12 text-rose-500 mx-auto mb-3" />
        <h2 className="text-lg font-bold text-slate-800">Enrollment Restriction</h2>
        <p className="text-xs text-slate-600 mt-2 mb-6">{error}</p>
        <Link
          to="/student/subjects"
          className="inline-flex items-center px-4 py-2 rounded-xl text-xs font-bold bg-blue-600 text-white"
        >
          <ArrowLeft className="w-4 h-4 mr-1.5" />
          <span>Return to My Subjects</span>
        </Link>
      </div>
    );
  }

  const subject = data?.subject || {};
  const teachers = data?.teachers || [];
  const announcements = data?.announcements || [];
  const materials = data?.materials || [];
  const assignments = data?.assignments || [];

  return (
    <div className="space-y-6">
      {/* Back button */}
      <div>
        <Link
          to="/student/subjects"
          className="inline-flex items-center text-xs font-semibold text-slate-500 hover:text-slate-800 transition mb-3"
        >
          <ArrowLeft className="w-4 h-4 mr-1" />
          <span>Back to My Subjects</span>
        </Link>
      </div>

      {/* Header Banner */}
      <div
        className="rounded-3xl p-6 sm:p-8 text-white shadow-lg relative overflow-hidden"
        style={{ backgroundColor: subject.color || '#3B82F6' }}
      >
        <div className="relative z-10 max-w-3xl">
          <div className="flex items-center space-x-2 text-xs font-bold uppercase tracking-wider text-white/80 mb-2">
            <span>{subject.code}</span>
            <span>&bull;</span>
            <span>{subject.department}</span>
            <span>&bull;</span>
            <span>{subject.credits} Credits</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight mb-2">
            {subject.name}
          </h1>
          <p className="text-xs sm:text-sm text-white/90 leading-relaxed max-w-2xl">
            {subject.description || 'Comprehensive curriculum study and assignment track.'}
          </p>

          <div className="mt-6 pt-4 border-t border-white/20 flex flex-wrap items-center gap-4 text-xs">
            <span className="font-semibold text-white/80">Instructors:</span>
            {teachers.map((t) => (
              <span key={t.id} className="bg-white/20 backdrop-blur px-2.5 py-1 rounded-lg font-medium">
                {t.first_name} {t.last_name} ({t.designation})
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex space-x-2 border-b border-slate-200">
        <button
          onClick={() => setActiveTab('assignments')}
          className={`py-3 px-4 font-bold text-xs border-b-2 transition flex items-center space-x-2 ${
            activeTab === 'assignments'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>Assignments ({assignments.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('materials')}
          className={`py-3 px-4 font-bold text-xs border-b-2 transition flex items-center space-x-2 ${
            activeTab === 'materials'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <BookOpen className="w-4 h-4" />
          <span>Course Materials ({materials.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('announcements')}
          className={`py-3 px-4 font-bold text-xs border-b-2 transition flex items-center space-x-2 ${
            activeTab === 'announcements'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Bell className="w-4 h-4" />
          <span>Announcements ({announcements.length})</span>
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === 'assignments' && (
        <div className="space-y-4">
          {assignments.length === 0 ? (
            <div className="bg-white rounded-3xl p-10 text-center border border-slate-200 text-xs text-slate-400">
              No assignments posted yet for this course.
            </div>
          ) : (
            assignments.map((a) => (
              <div
                key={a.id}
                className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-sm hover:shadow-md transition flex flex-col sm:flex-row sm:items-center justify-between gap-4 group"
              >
                <div className="space-y-1.5 max-w-2xl">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-bold text-sm text-slate-900 group-hover:text-blue-600 transition">
                      {a.title}
                    </h3>
                    <Badge variant="default" size="xs">
                      Max {a.max_marks} pts
                    </Badge>
                    <span className="text-[11px] text-slate-500 font-medium">
                      &bull; Instructor: {a.teacher_name || (teachers[0] ? `${teachers[0].first_name} ${teachers[0].last_name}` : 'Course Faculty')}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 line-clamp-2">{a.description}</p>
                  <div className="text-[11px] text-slate-400 flex flex-wrap items-center gap-3 pt-1">
                    <span className="flex items-center text-amber-600 font-medium">
                      <Clock className="w-3.5 h-3.5 mr-1" />
                      Due: {new Date(a.due_date).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                    </span>
                    <span>&bull;</span>
                    <span>Accepted: <strong>{a.allowed_file_types || 'PDF, DOCX, TXT'}</strong></span>
                    {a.created_at && (
                      <>
                        <span>&bull;</span>
                        <span>Posted: {new Date(a.created_at).toLocaleDateString()}</span>
                      </>
                    )}
                    <span>&bull;</span>
                    <span>Resubmissions: {a.allow_resubmission ? 'Allowed' : 'Disabled'}</span>
                  </div>
                </div>

                <div className="flex items-center space-x-3 shrink-0">
                  {a.submission_id ? (
                    <div className="text-right">
                      {a.is_published === 1 ? (
                        <span className="inline-flex items-center px-3 py-1 rounded-xl text-xs font-bold bg-emerald-100 text-emerald-800">
                          Graded: {a.marks_obtained} / {a.max_marks}
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-3 py-1 rounded-xl text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                          <CheckCircle2 className="w-3.5 h-3.5 mr-1 text-blue-600" />
                          {a.submission_status === 'late' ? 'Submitted Late' : 'Submitted'}
                        </span>
                      )}
                    </div>
                  ) : (
                    <span className="inline-flex items-center px-3 py-1 rounded-xl text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                      Pending
                    </span>
                  )}

                  <Link
                    to={`/student/assignments/${a.id}`}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center space-x-1.5 shadow-sm ${
                      a.submission_id
                        ? 'bg-slate-100 hover:bg-slate-200 text-slate-800'
                        : 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-500/20'
                    }`}
                  >
                    <span>{a.submission_id ? 'View Work' : 'Upload Assignment'}</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {activeTab === 'materials' && (
        <div className="space-y-3">
          {materials.length === 0 ? (
            <div className="bg-white rounded-3xl p-10 text-center border border-slate-200 text-xs text-slate-400">
              No learning materials uploaded yet.
            </div>
          ) : (
            materials.map((m) => (
              <div
                key={m.id}
                className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm flex items-center justify-between"
              >
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                    <BookOpen className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-xs text-slate-800">{m.title}</h4>
                    <p className="text-[11px] text-slate-500">{m.description || 'Reference document'}</p>
                    <div className="text-[10px] text-slate-400 mt-1">
                      {m.file_name} &bull; {(m.file_size / 1024 / 1024).toFixed(1)} MB &bull; Uploaded by {m.uploaded_by}
                    </div>
                  </div>
                </div>

                <a
                  href={`/uploads/${m.file_name}`}
                  download={m.file_name}
                  className="px-3 py-1.5 rounded-xl text-xs font-semibold text-blue-600 hover:bg-blue-50 border border-blue-200 transition flex items-center space-x-1.5 shrink-0"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download</span>
                </a>
              </div>
            ))
          )}
        </div>
      )}

      {activeTab === 'announcements' && (
        <div className="space-y-4">
          {announcements.length === 0 ? (
            <div className="bg-white rounded-3xl p-10 text-center border border-slate-200 text-xs text-slate-400">
              No announcements posted for this course.
            </div>
          ) : (
            announcements.map((an) => (
              <div key={an.id} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-sm text-slate-900">{an.title}</h3>
                  <span className="text-[11px] text-slate-400 font-mono">
                    {new Date(an.created_at).toLocaleDateString()}
                  </span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">{an.content}</p>
                <div className="text-[11px] text-slate-400 pt-1">
                  Author: <strong className="text-slate-700">{an.author_name}</strong>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

